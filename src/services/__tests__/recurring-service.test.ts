import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cents } from '@/domain/money';
import type { RecurringTemplate, ExpenseItem } from '@/domain/plan/types';
import { recurringService } from '../recurring-service';
import { recurringTemplateRepo } from '@/data/repos/recurring-template-repo';
import { expenseRepo } from '@/data/repos/expense-repo';

function makeValidTemplate(
  overrides: Partial<RecurringTemplate> = {},
): RecurringTemplate {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    planId: crypto.randomUUID(),
    name: 'Test Template',
    amountCents: cents(10000),
    frequency: 'monthly',
    category: 'subscriptions',
    bucketId: crypto.randomUUID(),
    isActive: true,
    isFixed: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeValidExpense(overrides: Partial<ExpenseItem> = {}): ExpenseItem {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    planId: crypto.randomUUID(),
    bucketId: crypto.randomUUID(),
    name: 'Test Expense',
    amountCents: cents(10000),
    frequency: 'monthly',
    category: 'subscriptions',
    isFixed: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('recurringService', () => {
  describe('generateExpenseFromTemplate()', () => {
    it('creates an expense from a template', async () => {
      const template = makeValidTemplate();
      await recurringTemplateRepo.create(template);

      const expense = await recurringService.generateExpenseFromTemplate(template);

      expect(expense.name).toBe(template.name);
      expect(expense.amountCents).toBe(template.amountCents);
      expect(expense.frequency).toBe(template.frequency);
      expect(expense.category).toBe(template.category);
      expect(expense.bucketId).toBe(template.bucketId);
      expect(expense.isFixed).toBe(template.isFixed);
      expect(expense.notes).toContain('auto-generated');
    });

    it('updates template lastGeneratedDate after generation', async () => {
      const template = makeValidTemplate();
      await recurringTemplateRepo.create(template);

      await recurringService.generateExpenseFromTemplate(template);

      const updated = await recurringTemplateRepo.getById(template.id);
      expect(updated?.lastGeneratedDate).toBeDefined();
    });
  });

  describe('generateNow()', () => {
    it('generates an expense from an existing template', async () => {
      const template = makeValidTemplate();
      await recurringTemplateRepo.create(template);

      const expense = await recurringService.generateNow(template.id);

      expect(expense).toBeDefined();
      expect(expense?.name).toBe(template.name);
    });

    it('returns undefined for non-existent template', async () => {
      const result = await recurringService.generateNow(crypto.randomUUID());
      expect(result).toBeUndefined();
    });
  });

  describe('createTemplateFromExpense()', () => {
    it('creates a template from an expense', async () => {
      const expense = makeValidExpense({ name: 'Netflix' });
      await expenseRepo.create(expense);

      const template = await recurringService.createTemplateFromExpense(
        expense,
        15,
      );

      expect(template.name).toBe('Netflix');
      expect(template.amountCents).toBe(expense.amountCents);
      expect(template.frequency).toBe(expense.frequency);
      expect(template.category).toBe(expense.category);
      expect(template.dayOfMonth).toBe(15);
      expect(template.isActive).toBe(true);
    });

    it('preserves expense properties in template', async () => {
      const expense = makeValidExpense({
        name: 'Rent',
        isFixed: true,
        notes: 'Monthly rent payment',
      });
      await expenseRepo.create(expense);

      const template = await recurringService.createTemplateFromExpense(expense);

      expect(template.isFixed).toBe(true);
      expect(template.notes).toBe('Monthly rent payment');
    });
  });

  describe('getNextGenerationDate()', () => {
    it('returns undefined for inactive templates', () => {
      const template = makeValidTemplate({ isActive: false });
      const result = recurringService.getNextGenerationDate(template);
      expect(result).toBeUndefined();
    });

    it('returns a date string for active templates', () => {
      const template = makeValidTemplate({
        isActive: true,
        dayOfMonth: 15,
      });
      const result = recurringService.getNextGenerationDate(template);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('uses creation date if dayOfMonth is not specified', () => {
      const createdAt = '2026-01-10T12:00:00.000Z';
      const template = makeValidTemplate({
        isActive: true,
        createdAt,
        dayOfMonth: undefined,
      });

      const result = recurringService.getNextGenerationDate(template);
      expect(result).toBeDefined();
    });
  });

  describe('detectRecurringPatterns()', () => {
    it('returns suggestions for repeated expenses', async () => {
      const planId = crypto.randomUUID();
      const bucketId = crypto.randomUUID();

      // Create multiple similar expenses
      for (let i = 0; i < 4; i++) {
        await expenseRepo.create(
          makeValidExpense({
            planId,
            bucketId,
            name: 'Netflix Subscription',
            amountCents: cents(1599),
            transactionDate: `2026-0${i + 1}-15`,
          }),
        );
      }

      const suggestions = await recurringService.detectRecurringPatterns(planId);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].name).toBe('Netflix Subscription');
      expect(suggestions[0].matchingExpenseIds.length).toBe(4);
    });

    it('requires minimum occurrences', async () => {
      const planId = crypto.randomUUID();

      // Create only one expense
      await expenseRepo.create(
        makeValidExpense({
          planId,
          name: 'One-time Purchase',
        }),
      );

      const suggestions = await recurringService.detectRecurringPatterns(
        planId,
        2,
      );

      expect(suggestions).toHaveLength(0);
    });

    it('calculates confidence based on amount consistency', async () => {
      const planId = crypto.randomUUID();
      const bucketId = crypto.randomUUID();

      // Create expenses with consistent amounts
      for (let i = 0; i < 3; i++) {
        await expenseRepo.create(
          makeValidExpense({
            planId,
            bucketId,
            name: 'Consistent Amount',
            amountCents: cents(5000),
          }),
        );
      }

      const suggestions = await recurringService.detectRecurringPatterns(planId);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].confidence).toBeGreaterThan(0.5);
    });
  });

  describe('checkAndGenerateForPlan()', () => {
    it('returns generation result with counts', async () => {
      const planId = crypto.randomUUID();
      const today = new Date();
      const currentDay = today.getDate();

      // Create a template that should trigger today
      await recurringTemplateRepo.create(
        makeValidTemplate({
          planId,
          dayOfMonth: currentDay,
          isActive: true,
        }),
      );

      const result = await recurringService.checkAndGenerateForPlan(planId);

      expect(result.generatedCount).toBe(1);
      expect(result.processedTemplateIds.length).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('does not generate for inactive templates', async () => {
      const planId = crypto.randomUUID();
      const today = new Date();
      const currentDay = today.getDate();

      await recurringTemplateRepo.create(
        makeValidTemplate({
          planId,
          dayOfMonth: currentDay,
          isActive: false,
        }),
      );

      const result = await recurringService.checkAndGenerateForPlan(planId);

      expect(result.generatedCount).toBe(0);
    });
  });
});
