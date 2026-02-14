/**
 * Transaction Import Service Tests
 */

import { describe, it, expect } from 'vitest';
import {
  detectDelimiter,
  detectDateFormat,
  parseDate,
  parseAmount,
  detectColumnMapping,
  parseCsv,
  parseOfx,
  autoCategorize,
  generateTransactionKey,
  detectDuplicates,
  createImportPreview,
  convertToExpenseItems,
  detectFileType,
  parseFile,
} from '../transaction-import-service';
import type { ExpenseItem } from '@/domain/plan/types';
import { cents } from '@/domain/money';

describe('CSV Parsing', () => {
  describe('detectDelimiter', () => {
    it('detects comma delimiter', () => {
      const csv = 'date,description,amount\n2024-01-15,Coffee,5.00';
      expect(detectDelimiter(csv)).toBe(',');
    });

    it('detects semicolon delimiter', () => {
      const csv = 'date;description;amount\n2024-01-15;Coffee;5.00';
      expect(detectDelimiter(csv)).toBe(';');
    });

    it('detects tab delimiter', () => {
      const csv = 'date\tdescription\tamount\n2024-01-15\tCoffee\t5.00';
      expect(detectDelimiter(csv)).toBe('\t');
    });

    it('defaults to comma for empty content', () => {
      expect(detectDelimiter('')).toBe(',');
    });
  });

  describe('detectDateFormat', () => {
    it('detects ISO format (YYYY-MM-DD)', () => {
      expect(detectDateFormat(['2024-01-15', '2024-12-31'])).toBe('YYYY-MM-DD');
    });

    it('detects US format (MM/DD/YYYY)', () => {
      expect(detectDateFormat(['01/15/2024', '12/31/2024'])).toBe('MM/DD/YYYY');
    });

    it('detects EU format when day > 12', () => {
      expect(detectDateFormat(['15/01/2024', '31/12/2024'])).toBe('DD/MM/YYYY');
    });

    it('returns auto for ambiguous dates', () => {
      expect(detectDateFormat(['not-a-date'])).toBe('auto');
    });
  });

  describe('parseDate', () => {
    it('parses ISO format', () => {
      expect(parseDate('2024-01-15', 'YYYY-MM-DD')).toBe('2024-01-15');
    });

    it('parses US format to ISO', () => {
      expect(parseDate('01/15/2024', 'MM/DD/YYYY')).toBe('2024-01-15');
    });

    it('parses EU format to ISO', () => {
      expect(parseDate('15/01/2024', 'DD/MM/YYYY')).toBe('2024-01-15');
    });

    it('parses OFX date format', () => {
      expect(parseDate('20240115120000', 'auto')).toBe('2024-01-15');
    });

    it('returns null for invalid date', () => {
      expect(parseDate('invalid', 'YYYY-MM-DD')).toBeNull();
    });
  });

  describe('parseAmount', () => {
    it('parses positive amount', () => {
      const result = parseAmount('100.50');
      expect(result).toEqual({ cents: cents(10050), isNegative: false });
    });

    it('parses negative amount with minus sign', () => {
      const result = parseAmount('-50.00');
      expect(result).toEqual({ cents: cents(5000), isNegative: true });
    });

    it('parses negative amount with parentheses', () => {
      const result = parseAmount('(25.99)');
      expect(result).toEqual({ cents: cents(2599), isNegative: true });
    });

    it('parses amount with currency symbol', () => {
      const result = parseAmount('$1,234.56');
      expect(result).toEqual({ cents: cents(123456), isNegative: false });
    });

    it('handles thousand separators', () => {
      const result = parseAmount('10,000.00');
      expect(result).toEqual({ cents: cents(1000000), isNegative: false });
    });

    it('returns null for invalid amount', () => {
      expect(parseAmount('not a number')).toBeNull();
    });
  });

  describe('detectColumnMapping', () => {
    it('detects common column names', () => {
      const headers = ['Date', 'Description', 'Amount'];
      expect(detectColumnMapping(headers)).toEqual({
        date: 0,
        description: 1,
        amount: 2,
        category: undefined,
      });
    });

    it('detects alternative column names', () => {
      const headers = ['Transaction Date', 'Memo', 'Debit', 'Category'];
      expect(detectColumnMapping(headers)).toEqual({
        date: 0,
        description: 1,
        amount: 2,
        category: 3,
      });
    });

    it('returns null when required columns are missing', () => {
      const headers = ['ID', 'Status', 'Notes'];
      expect(detectColumnMapping(headers)).toBeNull();
    });
  });

  describe('parseCsv', () => {
    it('parses basic CSV with header', () => {
      const csv = `Date,Description,Amount
2024-01-15,Coffee,-5.00
2024-01-16,Groceries,-50.00`;

      const result = parseCsv(csv);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        date: '2024-01-15',
        description: 'Coffee',
        amountCents: cents(500),
        isExpense: true,
      });
    });

    it('handles quoted fields', () => {
      const csv = `Date,Description,Amount
2024-01-15,"Coffee, Large",-5.00`;

      const result = parseCsv(csv);
      expect(result[0].description).toBe('Coffee, Large');
    });

    it('handles custom delimiter', () => {
      const csv = `Date;Description;Amount
2024-01-15;Coffee;-5.00`;

      const result = parseCsv(csv, { delimiter: ';' });
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('Coffee');
    });

    it('respects treatPositiveAsExpense option', () => {
      const csv = `Date,Description,Amount
2024-01-15,Coffee,5.00`;

      const result = parseCsv(csv, { treatPositiveAsExpense: true });
      expect(result[0].isExpense).toBe(true);
    });

    it('uses custom column mapping', () => {
      const csv = `ID,TransDate,Memo,Value
1,2024-01-15,Coffee,-5.00`;

      const result = parseCsv(csv, {
        columnMapping: {
          date: 1,
          description: 2,
          amount: 3,
        },
      });

      expect(result[0]).toMatchObject({
        date: '2024-01-15',
        description: 'Coffee',
      });
    });
  });
});

describe('OFX Parsing', () => {
  describe('parseOfx', () => {
    it('parses OFX transaction', () => {
      const ofx = `
<OFX>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115120000
<TRNAMT>-50.00
<NAME>WALMART
<MEMO>PURCHASE
</STMTTRN>
</OFX>`;

      const result = parseOfx(ofx);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        date: '2024-01-15',
        description: 'WALMART',
        amountCents: cents(5000),
        isExpense: true,
        memo: 'PURCHASE',
      });
    });

    it('parses multiple transactions', () => {
      const ofx = `
<OFX>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-25.00
<NAME>COFFEE SHOP
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240116
<TRNAMT>1000.00
<NAME>DIRECT DEPOSIT
</STMTTRN>
</OFX>`;

      const result = parseOfx(ofx);
      expect(result).toHaveLength(2);
      expect(result[0].isExpense).toBe(true);
      expect(result[1].isExpense).toBe(false);
    });

    it('handles missing memo', () => {
      const ofx = `
<STMTTRN>
<DTPOSTED>20240115
<TRNAMT>-10.00
<NAME>Store
</STMTTRN>`;

      const result = parseOfx(ofx);
      expect(result[0].memo).toBeUndefined();
    });

    it('uses memo as description when name is missing', () => {
      const ofx = `
<STMTTRN>
<DTPOSTED>20240115
<TRNAMT>-10.00
<MEMO>Store Purchase
</STMTTRN>`;

      const result = parseOfx(ofx);
      expect(result[0].description).toBe('Store Purchase');
    });
  });
});

describe('Category Mapping', () => {
  describe('autoCategorize', () => {
    it('categorizes grocery stores', () => {
      expect(autoCategorize('WALMART SUPERCENTER')).toBe('groceries');
      expect(autoCategorize('Trader Joes')).toBe('groceries');
    });

    it('categorizes dining', () => {
      expect(autoCategorize('STARBUCKS')).toBe('dining');
      expect(autoCategorize('DOORDASH ORDER')).toBe('dining');
    });

    it('categorizes entertainment', () => {
      expect(autoCategorize('NETFLIX SUBSCRIPTION')).toBe('entertainment');
      expect(autoCategorize('SPOTIFY')).toBe('entertainment');
    });

    it('categorizes utilities', () => {
      expect(autoCategorize('ELECTRIC BILL')).toBe('utilities');
      expect(autoCategorize('INTERNET SERVICE')).toBe('utilities');
    });

    it('returns other for unknown descriptions', () => {
      expect(autoCategorize('RANDOM MERCHANT XYZ')).toBe('other');
    });
  });
});

describe('Duplicate Detection', () => {
  describe('generateTransactionKey', () => {
    it('generates consistent key', () => {
      const tx = {
        date: '2024-01-15',
        amountCents: cents(500),
        description: 'Coffee Shop',
      };
      expect(generateTransactionKey(tx)).toBe('2024-01-15|500|coffee shop');
    });

    it('truncates long descriptions at 50 characters', () => {
      const tx = {
        date: '2024-01-15',
        amountCents: cents(500),
        description:
          'A very long description that exceeds fifty characters and keeps going on and on',
      };
      const key = generateTransactionKey(tx);
      // .toLowerCase().slice(0, 50).trim()
      expect(key).toBe(
        '2024-01-15|500|a very long description that exceeds fifty charact',
      );
    });
  });

  describe('detectDuplicates', () => {
    it('detects duplicate transactions', () => {
      const newTransactions = [
        {
          date: '2024-01-15',
          amountCents: cents(500),
          description: 'Coffee',
          isExpense: true,
        },
        {
          date: '2024-01-16',
          amountCents: cents(1000),
          description: 'Lunch',
          isExpense: true,
        },
      ];

      const existingExpenses = [
        {
          id: '1',
          planId: 'plan-1',
          bucketId: 'bucket-1',
          name: 'Coffee',
          amountCents: cents(500),
          frequency: 'monthly',
          category: 'dining',
          isFixed: false,
          transactionDate: '2024-01-15',
          createdAt: '2024-01-15T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
        },
      ] as ExpenseItem[];

      const duplicates = detectDuplicates(newTransactions, existingExpenses);
      expect(duplicates.size).toBe(1);
    });

    it('returns empty set when no duplicates', () => {
      const newTransactions = [
        {
          date: '2024-01-15',
          amountCents: cents(500),
          description: 'Coffee',
          isExpense: true,
        },
      ];

      const duplicates = detectDuplicates(newTransactions, []);
      expect(duplicates.size).toBe(0);
    });
  });
});

describe('Import Preview', () => {
  describe('createImportPreview', () => {
    it('creates preview with correct stats', () => {
      const transactions = [
        {
          date: '2024-01-15',
          amountCents: cents(500),
          description: 'Coffee',
          isExpense: true,
        },
        {
          date: '2024-01-16',
          amountCents: cents(1000),
          description: 'Salary',
          isExpense: false,
        },
        {
          date: '2024-01-17',
          amountCents: cents(2500),
          description: 'Groceries',
          isExpense: true,
        },
      ];

      const preview = createImportPreview(transactions, [], 'bucket-1');

      expect(preview.totalCount).toBe(3);
      expect(preview.expenseCount).toBe(2);
      expect(preview.incomeCount).toBe(1);
      expect(preview.duplicateCount).toBe(0);
      expect(preview.dateRange).toEqual({
        earliest: '2024-01-15',
        latest: '2024-01-17',
      });
    });

    it('auto-selects non-duplicate expenses', () => {
      const transactions = [
        {
          date: '2024-01-15',
          amountCents: cents(500),
          description: 'Coffee',
          isExpense: true,
        },
        {
          date: '2024-01-16',
          amountCents: cents(1000),
          description: 'Salary',
          isExpense: false,
        },
      ];

      const preview = createImportPreview(transactions, [], 'bucket-1');

      expect(preview.transactions[0].selected).toBe(true);
      expect(preview.transactions[1].selected).toBe(false); // Income not auto-selected
    });

    it('assigns default bucket to all transactions', () => {
      const transactions = [
        {
          date: '2024-01-15',
          amountCents: cents(500),
          description: 'Coffee',
          isExpense: true,
        },
      ];

      const preview = createImportPreview(transactions, [], 'default-bucket');

      expect(preview.transactions[0].bucketId).toBe('default-bucket');
    });
  });
});

describe('Import Conversion', () => {
  describe('convertToExpenseItems', () => {
    it('converts selected transactions to expense items', () => {
      const transactions = [
        {
          date: '2024-01-15',
          amountCents: cents(500),
          description: 'Coffee',
          isExpense: true,
          bucketId: 'bucket-1',
          mappedCategory: 'dining' as const,
          isDuplicate: false,
          selected: true,
        },
        {
          date: '2024-01-16',
          amountCents: cents(1000),
          description: 'Lunch',
          isExpense: true,
          bucketId: 'bucket-1',
          mappedCategory: 'dining' as const,
          isDuplicate: false,
          selected: false, // Not selected
        },
      ];

      const items = convertToExpenseItems(transactions, {
        planId: 'plan-1',
        defaultBucketId: 'bucket-1',
        currencyCode: 'USD',
      });

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        planId: 'plan-1',
        bucketId: 'bucket-1',
        name: 'Coffee',
        amountCents: cents(500),
        currencyCode: 'USD',
        category: 'dining',
        transactionDate: '2024-01-15',
      });
    });

    it('truncates long descriptions', () => {
      const longDescription = 'A'.repeat(150);
      const transactions = [
        {
          date: '2024-01-15',
          amountCents: cents(500),
          description: longDescription,
          isExpense: true,
          bucketId: 'bucket-1',
          mappedCategory: 'other' as const,
          isDuplicate: false,
          selected: true,
        },
      ];

      const items = convertToExpenseItems(transactions, {
        planId: 'plan-1',
        defaultBucketId: 'bucket-1',
        currencyCode: 'USD',
      });

      expect(items[0].name.length).toBe(100);
    });
  });
});

describe('File Detection', () => {
  describe('detectFileType', () => {
    it('detects CSV by extension', () => {
      expect(detectFileType('transactions.csv', '')).toBe('csv');
    });

    it('detects OFX by extension', () => {
      expect(detectFileType('export.ofx', '')).toBe('ofx');
    });

    it('detects QFX by extension', () => {
      expect(detectFileType('quicken.qfx', '')).toBe('qfx');
    });

    it('detects OFX by content', () => {
      expect(detectFileType('unknown.txt', '<OFX>')).toBe('ofx');
    });

    it('detects CSV by content', () => {
      expect(detectFileType('unknown.txt', 'a,b,c\n1,2,3')).toBe('csv');
    });

    it('returns unknown for unrecognized files', () => {
      expect(detectFileType('unknown.xyz', 'random content')).toBe('unknown');
    });
  });

  describe('parseFile', () => {
    it('parses CSV files', () => {
      const content = `Date,Description,Amount
2024-01-15,Coffee,-5.00`;
      const result = parseFile('test.csv', content);
      expect(result).toHaveLength(1);
    });

    it('parses OFX files', () => {
      const content = `<STMTTRN>
<DTPOSTED>20240115
<TRNAMT>-5.00
<NAME>Coffee
</STMTTRN>`;
      const result = parseFile('test.ofx', content);
      expect(result).toHaveLength(1);
    });

    it('throws for unsupported files', () => {
      expect(() => parseFile('test.xyz', 'random')).toThrow(
        'Unsupported file type',
      );
    });
  });
});
