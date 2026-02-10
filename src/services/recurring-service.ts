import type {
  RecurringTemplate,
  ExpenseItem,
  TemplateSuggestion,
  ExpenseCategory,
} from '@/domain/plan/types';
import type { Frequency } from '@/domain/plan/normalize';
import type { Cents } from '@/domain/money';
import { cents } from '@/domain/money';
import { recurringTemplateRepo } from '@/data/repos/recurring-template-repo';
import { expenseRepo } from '@/data/repos/expense-repo';

/**
 * Result of auto-generating expenses from recurring templates.
 */
export interface GenerationResult {
  /** Number of expenses successfully generated */
  readonly generatedCount: number;
  /** Template IDs that were processed */
  readonly processedTemplateIds: readonly string[];
  /** Errors encountered during generation */
  readonly errors: readonly GenerationError[];
}

export interface GenerationError {
  readonly templateId: string;
  readonly templateName: string;
  readonly error: string;
}

/**
 * Helper to get today's date in ISO format (YYYY-MM-DD).
 */
function getTodayISODate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Service for managing recurring expense generation.
 *
 * This service handles:
 * - Automatic expense generation based on templates
 * - Detection of recurring patterns in existing expenses
 * - Manual expense generation from templates
 */
export const recurringService = {
  /**
   * Checks all active templates for a plan and generates expenses
   * for templates that are due today.
   *
   * This should be called on app load and periodically during the session.
   *
   * @param planId The plan ID to check templates for
   * @returns Result containing generated expense count and any errors
   */
  async checkAndGenerateForPlan(planId: string): Promise<GenerationResult> {
    const templates = await recurringTemplateRepo.getTemplatesForToday(planId);

    const processedTemplateIds: string[] = [];
    const errors: GenerationError[] = [];
    let generatedCount = 0;

    for (const template of templates) {
      try {
        await this.generateExpenseFromTemplate(template);
        processedTemplateIds.push(template.id);
        generatedCount++;
      } catch (error) {
        errors.push({
          templateId: template.id,
          templateName: template.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      generatedCount,
      processedTemplateIds,
      errors,
    };
  },

  /**
   * Generates a single expense from a template.
   * Updates the template's lastGeneratedDate after successful generation.
   *
   * @param template The template to generate an expense from
   * @returns The created expense
   */
  async generateExpenseFromTemplate(
    template: RecurringTemplate,
  ): Promise<ExpenseItem> {
    const now = new Date().toISOString();
    const today = getTodayISODate();

    const expense: ExpenseItem = {
      id: crypto.randomUUID(),
      planId: template.planId,
      bucketId: template.bucketId,
      name: template.name,
      amountCents: template.amountCents,
      frequency: template.frequency,
      category: template.category,
      currencyCode: template.currencyCode,
      isFixed: template.isFixed,
      notes: template.notes
        ? `${template.notes} (auto-generated)`
        : '(auto-generated from recurring template)',
      transactionDate: today,
      createdAt: now,
      updatedAt: now,
    };

    // Create the expense first
    const created = await expenseRepo.create(expense);

    // Update the template's lastGeneratedDate
    await recurringTemplateRepo.updateLastGenerated(template.id, today);

    return created;
  },

  /**
   * Manually generates an expense from a template regardless of schedule.
   * Useful for "Generate now" functionality.
   *
   * @param templateId The template ID to generate from
   * @returns The created expense or undefined if template not found
   */
  async generateNow(templateId: string): Promise<ExpenseItem | undefined> {
    const template = await recurringTemplateRepo.getById(templateId);
    if (!template) return undefined;

    return this.generateExpenseFromTemplate(template);
  },

  /**
   * Analyzes existing expenses to detect recurring patterns.
   * Groups expenses by normalized name and similar amounts.
   *
   * @param planId The plan ID to analyze expenses for
   * @param minOccurrences Minimum number of similar expenses to suggest (default: 2)
   * @returns Array of template suggestions sorted by confidence
   */
  async detectRecurringPatterns(
    planId: string,
    minOccurrences = 2,
  ): Promise<TemplateSuggestion[]> {
    const expenses = await expenseRepo.getByPlanId(planId);

    // Group expenses by normalized name
    const groups = new Map<string, ExpenseItem[]>();

    for (const expense of expenses) {
      const normalizedName = normalizeExpenseName(expense.name);
      const currencyKey = expense.currencyCode ?? 'default';
      const groupKey = `${normalizedName}::${currencyKey}`;
      const existing = groups.get(groupKey) ?? [];
      existing.push(expense);
      groups.set(groupKey, existing);
    }

    const suggestions: TemplateSuggestion[] = [];

    for (const [, groupExpenses] of groups) {
      if (groupExpenses.length < minOccurrences) continue;

      // Analyze the group for patterns
      const suggestion = analyzeExpenseGroup(groupExpenses);
      if (suggestion && suggestion.confidence >= 0.5) {
        suggestions.push(suggestion);
      }
    }

    // Sort by confidence descending
    suggestions.sort((a, b) => b.confidence - a.confidence);

    return suggestions;
  },

  /**
   * Creates a template from a suggestion.
   *
   * @param planId The plan ID for the template
   * @param suggestion The suggestion to create a template from
   * @param bucketId The bucket ID to assign to the template
   * @returns The created template
   */
  async createTemplateFromSuggestion(
    planId: string,
    suggestion: TemplateSuggestion,
    bucketId: string,
  ): Promise<RecurringTemplate> {
    const now = new Date().toISOString();

    const template: RecurringTemplate = {
      id: crypto.randomUUID(),
      planId,
      name: suggestion.name,
      amountCents: suggestion.amountCents,
      frequency: suggestion.frequency,
      category: suggestion.category,
      bucketId,
      currencyCode: suggestion.currencyCode,
      isActive: true,
      isFixed: true,
      notes: `Created from pattern detection (${suggestion.matchingExpenseIds.length} matching expenses)`,
      createdAt: now,
      updatedAt: now,
    };

    return recurringTemplateRepo.create(template);
  },

  /**
   * Creates a template from an existing expense.
   * Useful for "Save as template" functionality.
   *
   * @param expense The expense to create a template from
   * @param dayOfMonth Optional day of month for generation
   * @returns The created template
   */
  async createTemplateFromExpense(
    expense: ExpenseItem,
    dayOfMonth?: number,
  ): Promise<RecurringTemplate> {
    const now = new Date().toISOString();

    const template: RecurringTemplate = {
      id: crypto.randomUUID(),
      planId: expense.planId,
      name: expense.name,
      amountCents: expense.amountCents,
      frequency: expense.frequency,
      category: expense.category,
      bucketId: expense.bucketId,
      currencyCode: expense.currencyCode,
      dayOfMonth,
      isActive: true,
      isFixed: expense.isFixed,
      notes: expense.notes,
      createdAt: now,
      updatedAt: now,
    };

    return recurringTemplateRepo.create(template);
  },

  /**
   * Calculates the next generation date for a template.
   *
   * @param template The template to calculate next date for
   * @returns The next generation date as ISO string, or undefined if not determinable
   */
  getNextGenerationDate(template: RecurringTemplate): string | undefined {
    if (!template.isActive) return undefined;

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Determine target day
    let targetDay: number;
    if (template.dayOfMonth !== undefined) {
      targetDay = template.dayOfMonth;
    } else {
      const createdDate = new Date(template.createdAt);
      targetDay = createdDate.getDate();
    }

    // Calculate next occurrence
    let nextDate: Date;

    if (currentDay < targetDay) {
      // Target is later this month
      const lastDayOfMonth = new Date(
        currentYear,
        currentMonth + 1,
        0,
      ).getDate();
      const adjustedDay = Math.min(targetDay, lastDayOfMonth);
      nextDate = new Date(currentYear, currentMonth, adjustedDay);
    } else {
      // Target is next month (or already passed this month)
      const nextMonth = currentMonth + 1;
      const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
      const adjustedMonth = nextMonth % 12;
      const lastDayOfNextMonth = new Date(
        nextYear,
        adjustedMonth + 1,
        0,
      ).getDate();
      const adjustedDay = Math.min(targetDay, lastDayOfNextMonth);
      nextDate = new Date(nextYear, adjustedMonth, adjustedDay);
    }

    return nextDate.toISOString().split('T')[0];
  },
};

/**
 * Normalizes an expense name for pattern matching.
 * Removes common variations like dates, numbers, etc.
 */
function normalizeExpenseName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      // Remove dates in various formats
      .replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, '')
      .replace(/\d{4}-\d{2}-\d{2}/g, '')
      // Remove month names
      .replace(
        /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/gi,
        '',
      )
      // Remove common suffixes like "- January 2024"
      .replace(/\s*[-–]\s*[a-z]+\s*\d{4}/gi, '')
      // Remove trailing numbers (like "Netflix #1")
      .replace(/\s*#?\d+\s*$/, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Analyzes a group of similar expenses to create a template suggestion.
 */
function analyzeExpenseGroup(
  expenses: ExpenseItem[],
): TemplateSuggestion | null {
  if (expenses.length < 2) return null;

  // Use the most recent expense as the basis
  const sortedExpenses = [...expenses].sort(
    (a, b) =>
      new Date(b.transactionDate ?? b.createdAt).getTime() -
      new Date(a.transactionDate ?? a.createdAt).getTime(),
  );

  const mostRecent = sortedExpenses[0];

  // Calculate amount statistics
  const amounts = expenses.map((e) => e.amountCents);
  const avgAmount = Math.round(
    amounts.reduce((a, b) => a + b, 0) / amounts.length,
  );
  const maxVariance = Math.max(...amounts.map((a) => Math.abs(a - avgAmount)));
  const varianceRatio = avgAmount > 0 ? maxVariance / avgAmount : 1;

  // Calculate frequency based on dates
  const frequency = detectFrequency(expenses);

  // Calculate confidence based on:
  // - Number of occurrences (more = higher confidence)
  // - Amount consistency (less variance = higher confidence)
  // - Date pattern regularity
  const occurrenceScore = Math.min(expenses.length / 6, 1); // Max at 6+ occurrences
  const amountScore = Math.max(0, 1 - varianceRatio * 2); // 0-50% variance is acceptable
  const confidence = occurrenceScore * 0.4 + amountScore * 0.6;

  // Get most common category
  const categoryCount = new Map<ExpenseCategory, number>();
  for (const exp of expenses) {
    categoryCount.set(exp.category, (categoryCount.get(exp.category) ?? 0) + 1);
  }
  let mostCommonCategory = mostRecent.category;
  let maxCategoryCount = 0;
  for (const [cat, count] of categoryCount) {
    if (count > maxCategoryCount) {
      mostCommonCategory = cat;
      maxCategoryCount = count;
    }
  }

  return {
    name: mostRecent.name,
    amountCents: cents(avgAmount) as Cents,
    frequency,
    category: mostCommonCategory,
    currencyCode: mostRecent.currencyCode,
    confidence,
    matchingExpenseIds: expenses.map((e) => e.id),
  };
}

/**
 * Detects the most likely frequency based on expense dates.
 */
function detectFrequency(expenses: ExpenseItem[]): Frequency {
  const dates = expenses
    .map((e) => e.transactionDate ?? e.createdAt)
    .map((d) => new Date(d).getTime())
    .sort((a, b) => a - b);

  if (dates.length < 2) return 'monthly';

  // Calculate average days between transactions
  const intervals: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    const days = Math.round((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
    if (days > 0) intervals.push(days);
  }

  if (intervals.length === 0) return 'monthly';

  const avgDays = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  // Map average days to frequency
  if (avgDays <= 10) return 'weekly';
  if (avgDays <= 18) return 'biweekly';
  if (avgDays <= 20) return 'semimonthly';
  if (avgDays <= 45) return 'monthly';
  if (avgDays <= 120) return 'quarterly';
  return 'annual';
}
