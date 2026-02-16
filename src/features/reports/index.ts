// Types
export type {
  DateRangePreset,
  DateRange,
  ReportType,
  SpendingByCategoryData,
  IncomeVsExpensesMonthData,
  BudgetAdherenceData,
  CategoryTrendData,
  CategoryTrendPoint,
  TopExpenseData,
  SpendingByCategoryReport as SpendingByCategoryReportData,
  IncomeVsExpensesReport as IncomeVsExpensesReportData,
  BudgetAdherenceReport as BudgetAdherenceReportData,
  CategoryTrendsReport as CategoryTrendsReportData,
  TopExpensesReport as TopExpensesReportData,
  ReportResult,
} from './types';

// Hooks
export { useReportData } from './hooks/use-report-data';

// Utils
export {
  getDateRangeFromPreset,
  filterExpensesByDateRange,
  calculateSpendingByCategory,
  calculateIncomeVsExpenses,
  calculateBudgetAdherence,
  calculateCategoryTrends,
  calculateTopExpenses,
  formatDateRange,
  getPresetLabel,
} from './utils/report-calculations';

// Components
export { DateRangeSelector } from './components/date-range-selector';
export { default as SpendingByCategoryReport } from './components/spending-by-category-report';
export { default as IncomeVsExpensesReport } from './components/income-vs-expenses-report';
export { default as BudgetAdherenceReport } from './components/budget-adherence-report';
export { default as CategoryTrendsReport } from './components/category-trends-report';
export { default as TopExpensesReport } from './components/top-expenses-report';
export { ReportsSkeleton } from './components/reports-skeleton';
