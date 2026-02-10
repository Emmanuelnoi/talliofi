import type { BucketFormData } from '@/features/onboarding/types';
import { BUCKET_COLORS } from '@/lib/constants';

/**
 * A budget template that defines a pre-configured set of spending buckets.
 * Templates help users quickly set up common budgeting strategies.
 */
export interface BudgetTemplate {
  /** Unique identifier for the template */
  readonly id: string;
  /** Human-readable name displayed to users */
  readonly name: string;
  /** Brief description explaining the budgeting philosophy */
  readonly description: string;
  /** Optional longer explanation for educational purposes */
  readonly details?: string;
  /** Pre-configured bucket allocations */
  readonly buckets: readonly TemplateBucket[];
  /** Whether this is a built-in system template (vs user-created) */
  readonly isBuiltIn: boolean;
  /** ISO timestamp for when the template was created (for user templates) */
  readonly createdAt?: string;
}

/**
 * A bucket definition within a template.
 * Uses percentage mode for simplicity and portability across different income levels.
 */
export interface TemplateBucket {
  /** Bucket name */
  readonly name: string;
  /** Hex color code for visual identification */
  readonly color: string;
  /** Target percentage of net income (0-100) */
  readonly targetPercentage: number;
}

/**
 * Converts template buckets to the form data format used in onboarding.
 */
export function templateBucketsToFormData(
  buckets: readonly TemplateBucket[],
): BucketFormData[] {
  return buckets.map((bucket) => ({
    name: bucket.name,
    color: bucket.color,
    mode: 'percentage' as const,
    targetPercentage: bucket.targetPercentage,
    rolloverEnabled: false,
  }));
}

// --- Built-in Budget Templates ---

/**
 * The classic 50/30/20 budgeting rule.
 * - 50% for needs (housing, utilities, groceries, transportation)
 * - 30% for wants (entertainment, dining, subscriptions)
 * - 20% for savings and debt payoff
 */
export const FIFTY_THIRTY_TWENTY_TEMPLATE: BudgetTemplate = {
  id: 'fifty-thirty-twenty',
  name: '50/30/20 Rule',
  description: 'The classic budgeting rule: 50% needs, 30% wants, 20% savings.',
  details:
    'Popularized by Senator Elizabeth Warren, this simple framework helps you balance essential spending with discretionary purchases while prioritizing your financial future.',
  buckets: [
    { name: 'Needs', color: BUCKET_COLORS[0], targetPercentage: 50 },
    { name: 'Wants', color: BUCKET_COLORS[1], targetPercentage: 30 },
    { name: 'Savings', color: BUCKET_COLORS[2], targetPercentage: 20 },
  ],
  isBuiltIn: true,
};

/**
 * The envelope method with detailed category breakdown.
 * Each category gets its own "envelope" with a specific allocation.
 */
export const ENVELOPE_METHOD_TEMPLATE: BudgetTemplate = {
  id: 'envelope-method',
  name: 'Envelope Method',
  description:
    'Detailed category-based budgeting inspired by the cash envelope system.',
  details:
    'Divide your income into specific categories. When an envelope is empty, spending in that category stops until next month. Great for controlling spending habits.',
  buckets: [
    { name: 'Housing', color: BUCKET_COLORS[0], targetPercentage: 25 },
    { name: 'Food', color: BUCKET_COLORS[1], targetPercentage: 15 },
    { name: 'Transportation', color: BUCKET_COLORS[2], targetPercentage: 10 },
    { name: 'Utilities', color: BUCKET_COLORS[3], targetPercentage: 10 },
    { name: 'Healthcare', color: BUCKET_COLORS[4], targetPercentage: 5 },
    { name: 'Personal', color: BUCKET_COLORS[5], targetPercentage: 10 },
    { name: 'Entertainment', color: BUCKET_COLORS[6], targetPercentage: 5 },
    { name: 'Savings', color: BUCKET_COLORS[7], targetPercentage: 20 },
  ],
  isBuiltIn: true,
};

/**
 * Zero-based budgeting with comprehensive categories.
 * Every dollar is assigned a job, ensuring 100% of income is allocated.
 */
export const ZERO_BASED_TEMPLATE: BudgetTemplate = {
  id: 'zero-based',
  name: 'Zero-Based Budget',
  description:
    'Assign every dollar a purpose. Income minus expenses equals zero.',
  details:
    'Made popular by Dave Ramsey, zero-based budgeting ensures no money goes untracked. Every dollar has a specific job, whether it is paying bills, building savings, or funding fun.',
  buckets: [
    { name: 'Housing', color: BUCKET_COLORS[0], targetPercentage: 25 },
    { name: 'Utilities', color: BUCKET_COLORS[1], targetPercentage: 8 },
    { name: 'Transportation', color: BUCKET_COLORS[2], targetPercentage: 12 },
    { name: 'Groceries', color: BUCKET_COLORS[3], targetPercentage: 10 },
    { name: 'Insurance', color: BUCKET_COLORS[4], targetPercentage: 8 },
    { name: 'Healthcare', color: BUCKET_COLORS[5], targetPercentage: 5 },
    { name: 'Entertainment', color: BUCKET_COLORS[6], targetPercentage: 7 },
    { name: 'Savings', color: BUCKET_COLORS[7], targetPercentage: 15 },
    { name: 'Giving', color: '#6366F1', targetPercentage: 5 },
    { name: 'Miscellaneous', color: '#64748B', targetPercentage: 5 },
  ],
  isBuiltIn: true,
};

/**
 * Minimalist budget with just three broad categories.
 * Simple and low-maintenance for those who prefer less granularity.
 */
export const MINIMALIST_TEMPLATE: BudgetTemplate = {
  id: 'minimalist',
  name: 'Minimalist',
  description:
    'Three simple buckets: 70% essentials, 20% savings, 10% flexible.',
  details:
    'Perfect for those who prefer simplicity. Focus on covering essentials, building savings, and having some guilt-free spending money.',
  buckets: [
    { name: 'Essentials', color: BUCKET_COLORS[0], targetPercentage: 70 },
    { name: 'Savings', color: BUCKET_COLORS[1], targetPercentage: 20 },
    { name: 'Flexible', color: BUCKET_COLORS[2], targetPercentage: 10 },
  ],
  isBuiltIn: true,
};

/**
 * Budget focused on aggressive debt payoff.
 * Allocates a significant portion to debt while maintaining essential expenses.
 */
export const DEBT_PAYOFF_TEMPLATE: BudgetTemplate = {
  id: 'debt-payoff',
  name: 'Debt Payoff Focus',
  description:
    'Aggressive debt reduction: 50% essentials, 30% debt, 10% savings.',
  details:
    'Designed for those serious about becoming debt-free. Prioritizes debt payments while maintaining essential expenses and a small emergency fund.',
  buckets: [
    { name: 'Essentials', color: BUCKET_COLORS[0], targetPercentage: 50 },
    { name: 'Debt Payoff', color: BUCKET_COLORS[3], targetPercentage: 30 },
    { name: 'Emergency Fund', color: BUCKET_COLORS[1], targetPercentage: 10 },
    { name: 'Flexible', color: BUCKET_COLORS[2], targetPercentage: 10 },
  ],
  isBuiltIn: true,
};

/**
 * All built-in budget templates available in the application.
 */
export const BUDGET_TEMPLATES: readonly BudgetTemplate[] = [
  FIFTY_THIRTY_TWENTY_TEMPLATE,
  ENVELOPE_METHOD_TEMPLATE,
  ZERO_BASED_TEMPLATE,
  MINIMALIST_TEMPLATE,
  DEBT_PAYOFF_TEMPLATE,
] as const;

/**
 * Gets a template by its ID.
 * @param id - The template ID to look up
 * @returns The matching template or undefined if not found
 */
export function getTemplateById(id: string): BudgetTemplate | undefined {
  return BUDGET_TEMPLATES.find((t) => t.id === id);
}

/**
 * Validates that a template's buckets sum to 100%.
 * @param template - The template to validate
 * @returns True if allocations sum to 100%
 */
export function validateTemplateAllocation(template: BudgetTemplate): boolean {
  const total = template.buckets.reduce(
    (sum, b) => sum + b.targetPercentage,
    0,
  );
  return total === 100;
}
