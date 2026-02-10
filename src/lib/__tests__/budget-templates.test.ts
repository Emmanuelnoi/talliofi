import { describe, it, expect } from 'vitest';
import {
  BUDGET_TEMPLATES,
  FIFTY_THIRTY_TWENTY_TEMPLATE,
  ENVELOPE_METHOD_TEMPLATE,
  ZERO_BASED_TEMPLATE,
  MINIMALIST_TEMPLATE,
  DEBT_PAYOFF_TEMPLATE,
  getTemplateById,
  validateTemplateAllocation,
  templateBucketsToFormData,
} from '../budget-templates';

describe('budget-templates', () => {
  describe('BUDGET_TEMPLATES', () => {
    it('contains all built-in templates', () => {
      expect(BUDGET_TEMPLATES).toHaveLength(5);
      expect(BUDGET_TEMPLATES).toContain(FIFTY_THIRTY_TWENTY_TEMPLATE);
      expect(BUDGET_TEMPLATES).toContain(ENVELOPE_METHOD_TEMPLATE);
      expect(BUDGET_TEMPLATES).toContain(ZERO_BASED_TEMPLATE);
      expect(BUDGET_TEMPLATES).toContain(MINIMALIST_TEMPLATE);
      expect(BUDGET_TEMPLATES).toContain(DEBT_PAYOFF_TEMPLATE);
    });

    it('all templates have unique IDs', () => {
      const ids = BUDGET_TEMPLATES.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('all templates are marked as built-in', () => {
      for (const template of BUDGET_TEMPLATES) {
        expect(template.isBuiltIn).toBe(true);
      }
    });

    it('all templates have valid bucket colors', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      for (const template of BUDGET_TEMPLATES) {
        for (const bucket of template.buckets) {
          expect(bucket.color).toMatch(hexColorRegex);
        }
      }
    });
  });

  describe('50/30/20 Template', () => {
    it('has correct structure', () => {
      expect(FIFTY_THIRTY_TWENTY_TEMPLATE.id).toBe('fifty-thirty-twenty');
      expect(FIFTY_THIRTY_TWENTY_TEMPLATE.name).toBe('50/30/20 Rule');
      expect(FIFTY_THIRTY_TWENTY_TEMPLATE.buckets).toHaveLength(3);
    });

    it('has correct bucket allocations', () => {
      const [needs, wants, savings] = FIFTY_THIRTY_TWENTY_TEMPLATE.buckets;
      expect(needs.name).toBe('Needs');
      expect(needs.targetPercentage).toBe(50);
      expect(wants.name).toBe('Wants');
      expect(wants.targetPercentage).toBe(30);
      expect(savings.name).toBe('Savings');
      expect(savings.targetPercentage).toBe(20);
    });

    it('allocations sum to 100%', () => {
      expect(validateTemplateAllocation(FIFTY_THIRTY_TWENTY_TEMPLATE)).toBe(
        true,
      );
    });
  });

  describe('Envelope Method Template', () => {
    it('has correct structure', () => {
      expect(ENVELOPE_METHOD_TEMPLATE.id).toBe('envelope-method');
      expect(ENVELOPE_METHOD_TEMPLATE.buckets).toHaveLength(8);
    });

    it('allocations sum to 100%', () => {
      expect(validateTemplateAllocation(ENVELOPE_METHOD_TEMPLATE)).toBe(true);
    });
  });

  describe('Zero-Based Template', () => {
    it('has correct structure', () => {
      expect(ZERO_BASED_TEMPLATE.id).toBe('zero-based');
      expect(ZERO_BASED_TEMPLATE.buckets).toHaveLength(10);
    });

    it('allocations sum to 100%', () => {
      expect(validateTemplateAllocation(ZERO_BASED_TEMPLATE)).toBe(true);
    });
  });

  describe('Minimalist Template', () => {
    it('has correct structure', () => {
      expect(MINIMALIST_TEMPLATE.id).toBe('minimalist');
      expect(MINIMALIST_TEMPLATE.buckets).toHaveLength(3);
    });

    it('has correct bucket allocations', () => {
      const [essentials, savings, flexible] = MINIMALIST_TEMPLATE.buckets;
      expect(essentials.name).toBe('Essentials');
      expect(essentials.targetPercentage).toBe(70);
      expect(savings.name).toBe('Savings');
      expect(savings.targetPercentage).toBe(20);
      expect(flexible.name).toBe('Flexible');
      expect(flexible.targetPercentage).toBe(10);
    });

    it('allocations sum to 100%', () => {
      expect(validateTemplateAllocation(MINIMALIST_TEMPLATE)).toBe(true);
    });
  });

  describe('Debt Payoff Template', () => {
    it('has correct structure', () => {
      expect(DEBT_PAYOFF_TEMPLATE.id).toBe('debt-payoff');
      expect(DEBT_PAYOFF_TEMPLATE.buckets).toHaveLength(4);
    });

    it('has debt-focused allocation', () => {
      const debtBucket = DEBT_PAYOFF_TEMPLATE.buckets.find(
        (b) => b.name === 'Debt Payoff',
      );
      expect(debtBucket).toBeDefined();
      expect(debtBucket!.targetPercentage).toBe(30);
    });

    it('allocations sum to 100%', () => {
      expect(validateTemplateAllocation(DEBT_PAYOFF_TEMPLATE)).toBe(true);
    });
  });

  describe('getTemplateById', () => {
    it('returns the correct template for a valid ID', () => {
      const template = getTemplateById('fifty-thirty-twenty');
      expect(template).toBe(FIFTY_THIRTY_TWENTY_TEMPLATE);
    });

    it('returns undefined for an invalid ID', () => {
      const template = getTemplateById('nonexistent-id');
      expect(template).toBeUndefined();
    });

    it('finds all built-in templates by ID', () => {
      for (const template of BUDGET_TEMPLATES) {
        const found = getTemplateById(template.id);
        expect(found).toBe(template);
      }
    });
  });

  describe('validateTemplateAllocation', () => {
    it('returns true for templates that sum to 100%', () => {
      for (const template of BUDGET_TEMPLATES) {
        expect(validateTemplateAllocation(template)).toBe(true);
      }
    });

    it('returns false for templates that do not sum to 100%', () => {
      const invalidTemplate = {
        id: 'invalid',
        name: 'Invalid',
        description: 'Test',
        buckets: [{ name: 'Test', color: '#000000', targetPercentage: 50 }],
        isBuiltIn: false,
      };
      expect(validateTemplateAllocation(invalidTemplate)).toBe(false);
    });
  });

  describe('templateBucketsToFormData', () => {
    it('converts template buckets to form data format', () => {
      const formData = templateBucketsToFormData(
        FIFTY_THIRTY_TWENTY_TEMPLATE.buckets,
      );

      expect(formData).toHaveLength(3);
      expect(formData[0]).toEqual({
        name: 'Needs',
        color: expect.any(String),
        mode: 'percentage',
        targetPercentage: 50,
        rolloverEnabled: false,
      });
      expect(formData[1]).toEqual({
        name: 'Wants',
        color: expect.any(String),
        mode: 'percentage',
        targetPercentage: 30,
        rolloverEnabled: false,
      });
      expect(formData[2]).toEqual({
        name: 'Savings',
        color: expect.any(String),
        mode: 'percentage',
        targetPercentage: 20,
        rolloverEnabled: false,
      });
    });

    it('sets mode to percentage for all buckets', () => {
      const formData = templateBucketsToFormData(
        ENVELOPE_METHOD_TEMPLATE.buckets,
      );

      for (const bucket of formData) {
        expect(bucket.mode).toBe('percentage');
      }
    });

    it('preserves bucket colors', () => {
      const formData = templateBucketsToFormData(MINIMALIST_TEMPLATE.buckets);

      for (let i = 0; i < formData.length; i++) {
        expect(formData[i].color).toBe(MINIMALIST_TEMPLATE.buckets[i].color);
      }
    });
  });
});
