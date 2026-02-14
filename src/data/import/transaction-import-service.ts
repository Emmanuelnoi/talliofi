/**
 * Transaction Import Service
 *
 * Parses CSV and OFX/QFX bank export files and converts them to ExpenseItem format.
 * Supports duplicate detection and preview functionality.
 */

import type { ExpenseItem, ExpenseCategory } from '@/domain/plan/types';
import type { Frequency } from '@/domain/plan/normalize';
import type { Cents, CurrencyCode } from '@/domain/money';
import { dollarsToCents } from '@/domain/money';

// ============================================================================
// Types
// ============================================================================

/** Detected delimiter for CSV parsing */
export type CsvDelimiter = ',' | ';' | '\t';

/** Supported date formats */
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'auto';

/** Mapping from CSV columns to transaction fields */
export interface ColumnMapping {
  readonly date: number;
  readonly description: number;
  readonly amount: number;
  readonly category?: number;
}

/** Raw parsed transaction before mapping to ExpenseItem */
export interface ParsedTransaction {
  readonly date: string; // ISO format YYYY-MM-DD
  readonly description: string;
  readonly amountCents: Cents;
  readonly isExpense: boolean;
  readonly category?: string;
  readonly memo?: string;
}

/** Transaction ready for import with assigned bucket */
export interface ImportableTransaction extends ParsedTransaction {
  readonly bucketId: string;
  readonly mappedCategory: ExpenseCategory;
  readonly isDuplicate: boolean;
  readonly selected: boolean;
}

/** Import preview result */
export interface ImportPreview {
  readonly transactions: ImportableTransaction[];
  readonly totalCount: number;
  readonly expenseCount: number;
  readonly incomeCount: number;
  readonly duplicateCount: number;
  readonly dateRange: {
    readonly earliest: string;
    readonly latest: string;
  } | null;
}

/** CSV parsing options */
export interface CsvParseOptions {
  readonly delimiter?: CsvDelimiter;
  readonly dateFormat?: DateFormat;
  readonly hasHeader?: boolean;
  readonly columnMapping?: ColumnMapping;
  readonly treatPositiveAsExpense?: boolean;
}

/** OFX transaction type */
export type OfxTransactionType =
  | 'DEBIT'
  | 'CREDIT'
  | 'INT'
  | 'DIV'
  | 'FEE'
  | 'SRVCHG'
  | 'DEP'
  | 'ATM'
  | 'POS'
  | 'XFER'
  | 'CHECK'
  | 'PAYMENT'
  | 'CASH'
  | 'DIRECTDEP'
  | 'DIRECTDEBIT'
  | 'OTHER';

// ============================================================================
// CSV Parsing
// ============================================================================

/**
 * Auto-detects the delimiter used in a CSV file.
 * Checks first few lines for consistent delimiter usage.
 */
export function detectDelimiter(content: string): CsvDelimiter {
  const lines = content.split('\n').slice(0, 5).filter(Boolean);
  if (lines.length === 0) return ',';

  const delimiters: CsvDelimiter[] = [',', ';', '\t'];
  const scores = new Map<CsvDelimiter, number>();

  for (const delimiter of delimiters) {
    const counts = lines.map((line) => countDelimiter(line, delimiter));
    // Consistent count across lines is a good sign
    const uniqueCounts = new Set(counts);
    if (uniqueCounts.size === 1 && counts[0] > 0) {
      scores.set(delimiter, counts[0] * 10);
    } else {
      scores.set(delimiter, Math.min(...counts));
    }
  }

  let bestDelimiter: CsvDelimiter = ',';
  let bestScore = 0;

  for (const [delimiter, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

/**
 * Counts occurrences of a delimiter in a line, respecting quoted fields.
 */
function countDelimiter(line: string, delimiter: CsvDelimiter): number {
  let count = 0;
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      count++;
    }
  }

  return count;
}

/**
 * Parses a CSV line respecting quoted fields.
 */
function parseCsvLine(line: string, delimiter: CsvDelimiter): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Auto-detects the date format from sample values.
 */
export function detectDateFormat(dates: string[]): DateFormat {
  // Common patterns to try
  const patterns: Array<{
    regex: RegExp;
    format: DateFormat;
    validator: (match: RegExpMatchArray) => boolean;
  }> = [
    {
      // YYYY-MM-DD
      regex: /^(\d{4})-(\d{2})-(\d{2})$/,
      format: 'YYYY-MM-DD',
      validator: (m) => {
        const month = parseInt(m[2], 10);
        const day = parseInt(m[3], 10);
        return month >= 1 && month <= 12 && day >= 1 && day <= 31;
      },
    },
    {
      // MM/DD/YYYY
      regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      format: 'MM/DD/YYYY',
      validator: (m) => {
        const first = parseInt(m[1], 10);
        const second = parseInt(m[2], 10);
        // If first > 12, it's likely DD/MM/YYYY
        return first <= 12 && second >= 1 && second <= 31;
      },
    },
    {
      // DD/MM/YYYY
      regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      format: 'DD/MM/YYYY',
      validator: (m) => {
        const first = parseInt(m[1], 10);
        const second = parseInt(m[2], 10);
        // If first > 12, it must be DD/MM/YYYY
        return (
          first > 12 ||
          (first >= 1 && first <= 31 && second >= 1 && second <= 12)
        );
      },
    },
  ];

  for (const dateStr of dates) {
    for (const { regex, format, validator } of patterns) {
      const match = dateStr.match(regex);
      if (match && validator(match)) {
        return format;
      }
    }
  }

  return 'auto';
}

/**
 * Parses a date string to ISO format (YYYY-MM-DD).
 */
export function parseDate(dateStr: string, format: DateFormat): string | null {
  const trimmed = dateStr.trim();

  if (format === 'YYYY-MM-DD' || format === 'auto') {
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return trimmed;
    }
  }

  if (format === 'MM/DD/YYYY' || format === 'auto') {
    const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
      const month = usMatch[1].padStart(2, '0');
      const day = usMatch[2].padStart(2, '0');
      return `${usMatch[3]}-${month}-${day}`;
    }
  }

  if (format === 'DD/MM/YYYY') {
    const euMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (euMatch) {
      const day = euMatch[1].padStart(2, '0');
      const month = euMatch[2].padStart(2, '0');
      return `${euMatch[3]}-${month}-${day}`;
    }
  }

  // OFX date format: YYYYMMDD[HHmmss]
  const ofxMatch = trimmed.match(/^(\d{4})(\d{2})(\d{2})/);
  if (ofxMatch) {
    return `${ofxMatch[1]}-${ofxMatch[2]}-${ofxMatch[3]}`;
  }

  return null;
}

/**
 * Parses amount string to cents.
 * Handles various formats: $1,234.56, -1234.56, (1234.56), etc.
 */
export function parseAmount(
  amountStr: string,
): { cents: Cents; isNegative: boolean } | null {
  let cleaned = amountStr.trim();

  // Check for parentheses (accounting notation for negative)
  const isParenthetical = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (isParenthetical) {
    cleaned = cleaned.slice(1, -1);
  }

  // Remove currency symbols and thousands separators
  cleaned = cleaned.replace(/[$\u00A3\u20AC\u00A5,\s]/g, '');

  // Check for explicit negative sign
  const hasMinusSign = cleaned.startsWith('-');
  if (hasMinusSign) {
    cleaned = cleaned.slice(1);
  }

  // Parse the number
  const num = parseFloat(cleaned);
  if (isNaN(num)) {
    return null;
  }

  const isNegative = isParenthetical || hasMinusSign;
  const cents = dollarsToCents(Math.abs(num));

  return { cents, isNegative };
}

/**
 * Auto-detects column mapping from CSV headers.
 */
export function detectColumnMapping(headers: string[]): ColumnMapping | null {
  const lower = headers.map((h) => h.toLowerCase().trim());

  const datePatterns = [
    'date',
    'transaction date',
    'posted date',
    'trans date',
  ];
  const descPatterns = [
    'description',
    'memo',
    'name',
    'payee',
    'merchant',
    'narrative',
  ];
  const amountPatterns = [
    'amount',
    'debit',
    'credit',
    'sum',
    'value',
    'transaction amount',
  ];
  const categoryPatterns = ['category', 'type', 'classification'];

  const findColumn = (patterns: string[]): number => {
    for (const pattern of patterns) {
      const index = lower.findIndex(
        (h) => h === pattern || h.includes(pattern) || pattern.includes(h),
      );
      if (index !== -1) return index;
    }
    return -1;
  };

  const date = findColumn(datePatterns);
  const description = findColumn(descPatterns);
  const amount = findColumn(amountPatterns);
  const category = findColumn(categoryPatterns);

  if (date === -1 || description === -1 || amount === -1) {
    return null;
  }

  return {
    date,
    description,
    amount,
    category: category !== -1 ? category : undefined,
  };
}

/**
 * Parses CSV content into transactions.
 */
export function parseCsv(
  content: string,
  options: CsvParseOptions = {},
): ParsedTransaction[] {
  const {
    delimiter = detectDelimiter(content),
    dateFormat = 'auto',
    hasHeader = true,
    columnMapping,
    treatPositiveAsExpense = false,
  } = options;

  const lines = content.split('\n').filter((line) => line.trim());
  if (lines.length === 0) return [];

  // Parse all lines
  const rows = lines.map((line) => parseCsvLine(line, delimiter));

  // Handle header and get mapping
  let dataRows = rows;
  let mapping: ColumnMapping | undefined = columnMapping;

  if (hasHeader && rows.length > 0) {
    const headers = rows[0];
    dataRows = rows.slice(1);

    if (!mapping) {
      mapping = detectColumnMapping(headers) ?? undefined;
    }
  }

  if (!mapping) {
    // Fallback: assume date, description, amount order
    mapping = { date: 0, description: 1, amount: 2 };
  }

  // Detect date format from sample data
  let effectiveDateFormat = dateFormat;
  if (effectiveDateFormat === 'auto') {
    const sampleDates = dataRows
      .slice(0, 10)
      .map((row) => row[mapping!.date])
      .filter(Boolean);
    effectiveDateFormat = detectDateFormat(sampleDates);
  }

  // Parse transactions
  const transactions: ParsedTransaction[] = [];

  for (const row of dataRows) {
    const dateStr = row[mapping.date];
    const description = row[mapping.description];
    const amountStr = row[mapping.amount];
    const categoryStr =
      mapping.category !== undefined ? row[mapping.category] : undefined;

    if (!dateStr || !description || !amountStr) continue;

    const date = parseDate(dateStr, effectiveDateFormat);
    if (!date) continue;

    const parsed = parseAmount(amountStr);
    if (!parsed) continue;

    // Determine if expense based on sign convention
    // Most banks: negative = expense, positive = income
    // Some banks: positive = expense, negative = income
    const isExpense = treatPositiveAsExpense
      ? !parsed.isNegative
      : parsed.isNegative;

    transactions.push({
      date,
      description: description.trim(),
      amountCents: parsed.cents,
      isExpense,
      category: categoryStr?.trim() || undefined,
    });
  }

  return transactions;
}

// ============================================================================
// OFX/QFX Parsing
// ============================================================================

/**
 * Extracts value between OFX tags.
 */
function extractOfxValue(content: string, tag: string): string | null {
  // OFX uses <TAG>value format (no closing tag for simple values)
  const pattern = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Extracts all transaction blocks from OFX content.
 */
function extractOfxTransactions(content: string): string[] {
  const transactions: string[] = [];
  const pattern = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    transactions.push(match[1]);
  }

  return transactions;
}

/**
 * Maps OFX transaction type to category hint.
 */
function mapOfxTypeToCategory(type: string): ExpenseCategory {
  const typeMap: Record<string, ExpenseCategory> = {
    FEE: 'other',
    SRVCHG: 'other',
    INT: 'savings',
    DIV: 'savings',
    ATM: 'personal',
    POS: 'shopping' as ExpenseCategory, // Will map to 'other' since shopping isn't in our list
    XFER: 'other',
    CHECK: 'other',
    PAYMENT: 'debt_payment',
    DEP: 'savings',
    DIRECTDEP: 'savings',
  };

  return typeMap[type.toUpperCase()] || 'other';
}

/**
 * Parses OFX/QFX content into transactions.
 */
export function parseOfx(content: string): ParsedTransaction[] {
  const transactionBlocks = extractOfxTransactions(content);
  const transactions: ParsedTransaction[] = [];

  for (const block of transactionBlocks) {
    const dateStr = extractOfxValue(block, 'DTPOSTED');
    const amountStr = extractOfxValue(block, 'TRNAMT');
    const name = extractOfxValue(block, 'NAME');
    const memo = extractOfxValue(block, 'MEMO');
    const type = extractOfxValue(block, 'TRNTYPE');

    if (!dateStr || !amountStr) continue;

    const date = parseDate(dateStr, 'auto');
    if (!date) continue;

    const parsed = parseAmount(amountStr);
    if (!parsed) continue;

    const description = name || memo || 'Unknown Transaction';
    const isExpense = parsed.isNegative;

    transactions.push({
      date,
      description: description.trim(),
      amountCents: parsed.cents,
      isExpense,
      category: type ? mapOfxTypeToCategory(type).toString() : undefined,
      memo: memo && memo !== name ? memo.trim() : undefined,
    });
  }

  return transactions;
}

// ============================================================================
// Category Mapping
// ============================================================================

/** Keywords for auto-categorization */
const CATEGORY_KEYWORDS: Record<ExpenseCategory, string[]> = {
  housing: ['rent', 'mortgage', 'property', 'hoa', 'home'],
  utilities: [
    'electric',
    'gas',
    'water',
    'internet',
    'phone',
    'utility',
    'power',
  ],
  transportation: [
    'gas',
    'fuel',
    'uber',
    'lyft',
    'parking',
    'transit',
    'metro',
    'bus',
  ],
  groceries: [
    'grocery',
    'supermarket',
    'walmart',
    'target',
    'costco',
    'trader joe',
    'whole foods',
  ],
  healthcare: [
    'pharmacy',
    'doctor',
    'hospital',
    'medical',
    'dental',
    'vision',
    'health',
  ],
  insurance: ['insurance', 'geico', 'state farm', 'allstate', 'progressive'],
  debt_payment: [
    'payment',
    'loan',
    'credit card',
    'amex',
    'chase',
    'capital one',
  ],
  savings: [
    'transfer to savings',
    'investment',
    'vanguard',
    'fidelity',
    'schwab',
  ],
  entertainment: [
    'netflix',
    'spotify',
    'hulu',
    'movie',
    'theater',
    'concert',
    'ticket',
  ],
  dining: [
    'restaurant',
    'doordash',
    'ubereats',
    'grubhub',
    'starbucks',
    'coffee',
    'mcdonald',
  ],
  personal: ['amazon', 'shopping', 'clothing', 'apparel', 'salon', 'spa'],
  subscriptions: ['subscription', 'monthly', 'membership', 'apple', 'google'],
  other: [],
};

/**
 * Auto-categorizes a transaction based on description keywords.
 */
export function autoCategorize(description: string): ExpenseCategory {
  const lower = description.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return category as ExpenseCategory;
      }
    }
  }

  return 'other';
}

// ============================================================================
// Duplicate Detection
// ============================================================================

/**
 * Generates a unique key for a transaction to detect duplicates.
 * Uses date + amount + first 50 chars of description to reduce false
 * positives for similar descriptions like "Amazon.com Purchase - Item A"
 * vs "Amazon.com Purchase - Item B".
 */
export function generateTransactionKey(transaction: {
  date: string;
  amountCents: Cents;
  description: string;
}): string {
  const descKey = transaction.description.toLowerCase().slice(0, 50).trim();
  return `${transaction.date}|${transaction.amountCents}|${descKey}`;
}

/**
 * Detects duplicates against existing expenses.
 */
export function detectDuplicates(
  newTransactions: ParsedTransaction[],
  existingExpenses: ExpenseItem[],
): Set<string> {
  const existingKeys = new Set(
    existingExpenses.map((e) =>
      generateTransactionKey({
        date: e.transactionDate || e.createdAt.slice(0, 10),
        amountCents: e.amountCents,
        description: e.name,
      }),
    ),
  );

  const duplicateKeys = new Set<string>();

  for (const tx of newTransactions) {
    const key = generateTransactionKey({
      date: tx.date,
      amountCents: tx.amountCents,
      description: tx.description,
    });
    if (existingKeys.has(key)) {
      duplicateKeys.add(key);
    }
  }

  return duplicateKeys;
}

// ============================================================================
// Import Preview
// ============================================================================

/**
 * Creates an import preview from parsed transactions.
 */
export function createImportPreview(
  transactions: ParsedTransaction[],
  existingExpenses: ExpenseItem[],
  defaultBucketId: string,
): ImportPreview {
  const duplicateKeys = detectDuplicates(transactions, existingExpenses);

  const importableTransactions: ImportableTransaction[] = transactions.map(
    (tx) => {
      const key = generateTransactionKey({
        date: tx.date,
        amountCents: tx.amountCents,
        description: tx.description,
      });
      const isDuplicate = duplicateKeys.has(key);
      const mappedCategory = tx.category
        ? mapStringToCategory(tx.category)
        : autoCategorize(tx.description);

      return {
        ...tx,
        bucketId: defaultBucketId,
        mappedCategory,
        isDuplicate,
        selected: !isDuplicate && tx.isExpense, // Auto-select non-duplicate expenses
      };
    },
  );

  // Calculate stats
  const expenseCount = importableTransactions.filter((t) => t.isExpense).length;
  const incomeCount = importableTransactions.filter((t) => !t.isExpense).length;
  const duplicateCount = importableTransactions.filter(
    (t) => t.isDuplicate,
  ).length;

  // Find date range
  const dates = importableTransactions.map((t) => t.date).sort();
  const dateRange =
    dates.length > 0
      ? {
          earliest: dates[0],
          latest: dates[dates.length - 1],
        }
      : null;

  return {
    transactions: importableTransactions,
    totalCount: importableTransactions.length,
    expenseCount,
    incomeCount,
    duplicateCount,
    dateRange,
  };
}

/**
 * Maps a string category to ExpenseCategory.
 */
function mapStringToCategory(category: string): ExpenseCategory {
  const lower = category.toLowerCase();

  const mappings: Record<string, ExpenseCategory> = {
    housing: 'housing',
    rent: 'housing',
    mortgage: 'housing',
    utilities: 'utilities',
    utility: 'utilities',
    transportation: 'transportation',
    transport: 'transportation',
    travel: 'transportation',
    groceries: 'groceries',
    grocery: 'groceries',
    food: 'groceries',
    healthcare: 'healthcare',
    health: 'healthcare',
    medical: 'healthcare',
    insurance: 'insurance',
    debt: 'debt_payment',
    loan: 'debt_payment',
    savings: 'savings',
    investment: 'savings',
    entertainment: 'entertainment',
    dining: 'dining',
    restaurant: 'dining',
    personal: 'personal',
    shopping: 'personal',
    subscriptions: 'subscriptions',
    subscription: 'subscriptions',
  };

  return mappings[lower] || autoCategorize(category);
}

// ============================================================================
// Import Execution
// ============================================================================

/** Options for executing the import */
export interface ImportOptions {
  readonly planId: string;
  readonly defaultBucketId: string;
  readonly defaultFrequency?: Frequency;
  readonly currencyCode?: CurrencyCode;
}

/**
 * Converts selected transactions to ExpenseItem format.
 */
export function convertToExpenseItems(
  transactions: ImportableTransaction[],
  options: ImportOptions,
): Omit<ExpenseItem, 'id'>[] {
  const {
    planId,
    defaultBucketId,
    defaultFrequency = 'monthly',
    currencyCode,
  } = options;
  const now = new Date().toISOString();

  return transactions
    .filter((tx) => tx.selected)
    .map((tx) => ({
      planId,
      bucketId: tx.bucketId || defaultBucketId,
      name: tx.description.slice(0, 100), // Respect max length
      amountCents: tx.amountCents,
      currencyCode,
      frequency: defaultFrequency,
      category: tx.mappedCategory,
      isFixed: false,
      transactionDate: tx.date,
      notes: tx.memo ? `Imported: ${tx.memo}` : 'Imported from bank statement',
      createdAt: now,
      updatedAt: now,
    }));
}

// ============================================================================
// File Detection
// ============================================================================

/** Supported file types for import */
export type ImportFileType = 'csv' | 'ofx' | 'qfx' | 'unknown';

/**
 * Detects file type from content or extension.
 */
export function detectFileType(
  filename: string,
  content: string,
): ImportFileType {
  const extension = filename.toLowerCase().split('.').pop();

  if (extension === 'ofx' || extension === 'qfx') {
    return extension;
  }

  if (extension === 'csv') {
    return 'csv';
  }

  // Try content detection
  if (content.includes('<OFX>') || content.includes('OFXHEADER:')) {
    return 'ofx';
  }

  // Check for CSV-like content
  const firstLine = content.split('\n')[0];
  if (
    firstLine &&
    (firstLine.includes(',') ||
      firstLine.includes(';') ||
      firstLine.includes('\t'))
  ) {
    return 'csv';
  }

  return 'unknown';
}

/**
 * Parses a file based on detected or specified type.
 */
export function parseFile(
  filename: string,
  content: string,
  csvOptions?: CsvParseOptions,
): ParsedTransaction[] {
  const fileType = detectFileType(filename, content);

  switch (fileType) {
    case 'csv':
      return parseCsv(content, csvOptions);
    case 'ofx':
    case 'qfx':
      return parseOfx(content);
    default:
      throw new Error(`Unsupported file type: ${filename}`);
  }
}
