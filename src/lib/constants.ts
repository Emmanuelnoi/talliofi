import type {
  Frequency,
  ExpenseCategory,
  GoalType,
  AssetCategory,
  LiabilityCategory,
} from '@/domain/plan';

// --- Timing Constants ---

/** Session inactivity timeout in milliseconds (15 minutes) */
export const SESSION_TIMEOUT_MS = 15 * 60 * 1000;

/** Warning shown before session timeout (1 minute before) */
export const SESSION_WARNING_MS = SESSION_TIMEOUT_MS - 60 * 1000;

/** Stale time for plan data queries in milliseconds (5 minutes) */
export const PLAN_DATA_STALE_TIME_MS = 5 * 60 * 1000;

/** Default auto-sync interval in milliseconds (1 minute) */
export const AUTO_SYNC_INTERVAL_MS = 60 * 1000;

/** Maximum retry delay for sync operations in milliseconds (30 seconds) */
export const SYNC_MAX_RETRY_DELAY_MS = 30 * 1000;

/** Base retry delay for sync operations in milliseconds (1 second) */
export const SYNC_BASE_RETRY_DELAY_MS = 1000;

/** PBKDF2 iteration count for key derivation (600,000 iterations) */
export const PBKDF2_ITERATIONS = 600_000;

/** Auth rate limit window in milliseconds (1 minute) */
export const AUTH_RATE_LIMIT_WINDOW_MS = 60 * 1000;

/** Maximum auth attempts within rate limit window */
export const AUTH_MAX_ATTEMPTS = 3;

// --- UI Labels ---

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  semimonthly: 'Semi-monthly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
};

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  housing: 'Housing',
  utilities: 'Utilities',
  transportation: 'Transportation',
  groceries: 'Groceries',
  healthcare: 'Healthcare',
  insurance: 'Insurance',
  debt_payment: 'Debt Payment',
  savings: 'Savings',
  entertainment: 'Entertainment',
  dining: 'Dining',
  personal: 'Personal',
  subscriptions: 'Subscriptions',
  other: 'Other',
};

export const BUCKET_COLORS = [
  '#4A90D9',
  '#50C878',
  '#FFB347',
  '#FF6B6B',
  '#9B59B6',
  '#1ABC9C',
  '#F39C12',
  '#E74C3C',
] as const;

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  savings: 'Savings',
  debt_payoff: 'Debt Payoff',
};

export const GOAL_COLORS = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
] as const;

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  cash: 'Cash & Savings',
  investment: 'Investments',
  property: 'Real Estate',
  vehicle: 'Vehicles',
  other_asset: 'Other Assets',
};

export const LIABILITY_CATEGORY_LABELS: Record<LiabilityCategory, string> = {
  credit_card: 'Credit Cards',
  mortgage: 'Mortgage',
  auto_loan: 'Auto Loans',
  student_loan: 'Student Loans',
  personal_loan: 'Personal Loans',
  other_liability: 'Other Liabilities',
};

/** Colors for asset categories in charts */
export const ASSET_CATEGORY_COLORS: Record<AssetCategory, string> = {
  cash: '#10B981', // Emerald
  investment: '#3B82F6', // Blue
  property: '#8B5CF6', // Violet
  vehicle: '#F59E0B', // Amber
  other_asset: '#6B7280', // Gray
};

/** Colors for liability categories in charts */
export const LIABILITY_CATEGORY_COLORS: Record<LiabilityCategory, string> = {
  credit_card: '#EF4444', // Red
  mortgage: '#F97316', // Orange
  auto_loan: '#EC4899', // Pink
  student_loan: '#A855F7', // Purple
  personal_loan: '#F59E0B', // Amber
  other_liability: '#6B7280', // Gray
};
