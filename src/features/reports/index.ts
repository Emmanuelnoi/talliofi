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
export { SpendingByCategoryReport } from './components/spending-by-category-report';
export { IncomeVsExpensesReport } from './components/income-vs-expenses-report';
export { BudgetAdherenceReport } from './components/budget-adherence-report';
export { CategoryTrendsReport } from './components/category-trends-report';
export { TopExpensesReport } from './components/top-expenses-report';
export { ReportsSkeleton } from './components/reports-skeleton';
