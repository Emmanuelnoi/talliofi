import { describe, it, expect, beforeEach } from 'vitest';
import { cents } from '@/domain/money';
import type { RecurringTemplate } from '@/domain/plan/types';
import { recurringTemplateRepo } from '../recurring-template-repo';

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

describe('recurringTemplateRepo', () => {
  describe('create()', () => {
    it('creates and returns a template', async () => {
      const template = makeValidTemplate();
      const created = await recurringTemplateRepo.create(template);

      expect(created.id).toBe(template.id);
      expect(created.name).toBe('Test Template');
      expect(created.isActive).toBe(true);
    });

    it('throws when Zod validation fails', async () => {
      const invalid = {
        id: 'not-a-uuid',
        planId: 'bad',
        name: '',
        amountCents: -1,
        frequency: 'invalid',
        category: 'unknown',
        bucketId: 'bad',
        isActive: true,
        isFixed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as RecurringTemplate;

      await expect(recurringTemplateRepo.create(invalid)).rejects.toThrow();
    });
  });

  describe('getByPlanId()', () => {
    it('returns only templates matching the given planId', async () => {
      const planId1 = crypto.randomUUID();
      const planId2 = crypto.randomUUID();

      await recurringTemplateRepo.create(
        makeValidTemplate({ planId: planId1, name: 'Template A' }),
      );
      await recurringTemplateRepo.create(
        makeValidTemplate({ planId: planId1, name: 'Template B' }),
      );
      await recurringTemplateRepo.create(
        makeValidTemplate({ planId: planId2, name: 'Template C' }),
      );

      const result = await recurringTemplateRepo.getByPlanId(planId1);
      expect(result).toHaveLength(2);
      expect(result.every((t) => t.planId === planId1)).toBe(true);
    });
  });

  describe('getActiveByPlanId()', () => {
    it('returns only active templates for the given planId', async () => {
      const planId = crypto.randomUUID();

      await recurringTemplateRepo.create(
        makeValidTemplate({ planId, name: 'Active 1', isActive: true }),
      );
      await recurringTemplateRepo.create(
        makeValidTemplate({ planId, name: 'Inactive', isActive: false }),
      );
      await recurringTemplateRepo.create(
        makeValidTemplate({ planId, name: 'Active 2', isActive: true }),
      );

      const result = await recurringTemplateRepo.getActiveByPlanId(planId);
      expect(result).toHaveLength(2);
      expect(result.every((t) => t.isActive)).toBe(true);
    });
  });

  describe('getById()', () => {
    it('returns the template with matching id', async () => {
      const template = makeValidTemplate();
      await recurringTemplateRepo.create(template);

      const result = await recurringTemplateRepo.getById(template.id);
      expect(result).toBeDefined();
      expect(result?.id).toBe(template.id);
    });

    it('returns undefined for non-existent id', async () => {
      const result = await recurringTemplateRepo.getById(crypto.randomUUID());
      expect(result).toBeUndefined();
    });
  });

  describe('update()', () => {
    it('updates the template and sets new updatedAt', async () => {
      const template = makeValidTemplate();
      await recurringTemplateRepo.create(template);

      const updated = await recurringTemplateRepo.update({
        ...template,
        name: 'Updated Template',
        isActive: false,
      });

      expect(updated.name).toBe('Updated Template');
      expect(updated.isActive).toBe(false);
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(template.updatedAt).getTime(),
      );
    });
  });

  describe('updateLastGenerated()', () => {
    it('updates the lastGeneratedDate field', async () => {
      const template = makeValidTemplate();
      await recurringTemplateRepo.create(template);

      const newDate = '2026-02-09';
      await recurringTemplateRepo.updateLastGenerated(template.id, newDate);

      const updated = await recurringTemplateRepo.getById(template.id);
      expect(updated?.lastGeneratedDate).toBe(newDate);
    });
  });

  describe('toggleActive()', () => {
    it('toggles active from true to false', async () => {
      const template = makeValidTemplate({ isActive: true });
      await recurringTemplateRepo.create(template);

      const toggled = await recurringTemplateRepo.toggleActive(template.id);
      expect(toggled?.isActive).toBe(false);
    });

    it('toggles active from false to true', async () => {
      const template = makeValidTemplate({ isActive: false });
      await recurringTemplateRepo.create(template);

      const toggled = await recurringTemplateRepo.toggleActive(template.id);
      expect(toggled?.isActive).toBe(true);
    });

    it('returns undefined for non-existent template', async () => {
      const result = await recurringTemplateRepo.toggleActive(
        crypto.randomUUID(),
      );
      expect(result).toBeUndefined();
    });
  });

  describe('delete()', () => {
    it('removes a single template', async () => {
      const template = makeValidTemplate();
      await recurringTemplateRepo.create(template);

      await recurringTemplateRepo.delete(template.id);

      const remaining = await recurringTemplateRepo.getByPlanId(template.planId);
      expect(remaining).toHaveLength(0);
    });
  });

  describe('deleteByPlanId()', () => {
    it('removes all templates for a given planId', async () => {
      const planId = crypto.randomUUID();
      const otherPlanId = crypto.randomUUID();

      await recurringTemplateRepo.create(
        makeValidTemplate({ planId, name: 'A' }),
      );
      await recurringTemplateRepo.create(
        makeValidTemplate({ planId, name: 'B' }),
      );
      await recurringTemplateRepo.create(
        makeValidTemplate({ planId: otherPlanId, name: 'C' }),
      );

      await recurringTemplateRepo.deleteByPlanId(planId);

      expect(await recurringTemplateRepo.getByPlanId(planId)).toHaveLength(0);
      expect(await recurringTemplateRepo.getByPlanId(otherPlanId)).toHaveLength(
        1,
      );
    });
  });

  describe('getTemplatesForToday()', () => {
    it('returns templates matching today\'s day of month', async () => {
      const planId = crypto.randomUUID();
      const today = new Date();
      const currentDay = today.getDate();

      // Template with matching dayOfMonth
      await recurringTemplateRepo.create(
        makeValidTemplate({
          planId,
          name: 'Should match',
          dayOfMonth: currentDay,
          isActive: true,
        }),
      );

      // Template with non-matching dayOfMonth
      await recurringTemplateRepo.create(
        makeValidTemplate({
          planId,
          name: 'Should not match',
          dayOfMonth: currentDay === 1 ? 15 : 1,
          isActive: true,
        }),
      );

      const result = await recurringTemplateRepo.getTemplatesForToday(planId);
      expect(result.some((t) => t.name === 'Should match')).toBe(true);
      expect(result.some((t) => t.name === 'Should not match')).toBe(false);
    });

    it('excludes templates already generated today', async () => {
      const planId = crypto.randomUUID();
      const today = new Date();
      const currentDay = today.getDate();
      const todayIso = today.toISOString().split('T')[0];

      await recurringTemplateRepo.create(
        makeValidTemplate({
          planId,
          name: 'Already generated',
          dayOfMonth: currentDay,
          isActive: true,
          lastGeneratedDate: todayIso,
        }),
      );

      const result = await recurringTemplateRepo.getTemplatesForToday(planId);
      expect(result).toHaveLength(0);
    });

    it('excludes inactive templates', async () => {
      const planId = crypto.randomUUID();
      const today = new Date();
      const currentDay = today.getDate();

      await recurringTemplateRepo.create(
        makeValidTemplate({
          planId,
          name: 'Inactive template',
          dayOfMonth: currentDay,
          isActive: false,
        }),
      );

      const result = await recurringTemplateRepo.getTemplatesForToday(planId);
      expect(result).toHaveLength(0);
    });
  });
});
