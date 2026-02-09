/**
 * Transaction Import Module
 *
 * Provides functionality to import transactions from CSV and OFX/QFX bank export files.
 */

export {
  // Parsing functions
  parseCsv,
  parseOfx,
  parseFile,
  detectFileType,
  detectDelimiter,
  detectDateFormat,
  detectColumnMapping,
  parseDate,
  parseAmount,
  // Category mapping
  autoCategorize,
  // Duplicate detection
  generateTransactionKey,
  detectDuplicates,
  // Import workflow
  createImportPreview,
  convertToExpenseItems,
  // Types
  type CsvDelimiter,
  type DateFormat,
  type ColumnMapping,
  type CsvParseOptions,
  type ParsedTransaction,
  type ImportableTransaction,
  type ImportPreview,
  type ImportOptions,
  type ImportFileType,
  type OfxTransactionType,
} from './transaction-import-service';
