import type { Frequency } from '@/domain/plan/normalize';

/**
 * Input for creating a new plan.
 */
export interface CreatePlanInput {
  /** Plan name */
  name: string;
  /** Creation mode: 'empty' for fresh start, 'copy' to duplicate existing, 'template' for budget template */
  mode: 'empty' | 'copy' | 'template';
  /** Source plan ID when mode is 'copy' */
  sourcePlanId?: string;
  /** Template ID when mode is 'template' */
  templateId?: string;
  /** Optional initial gross income in dollars */
  grossIncomeDollars?: number;
  /** Optional income frequency */
  incomeFrequency?: Frequency;
  /** Optional tax rate (0-100) */
  taxEffectiveRate?: number;
}

/**
 * Input for updating an existing plan.
 */
export interface UpdatePlanInput {
  /** Plan ID to update */
  id: string;
  /** New name (optional) */
  name?: string;
}

/**
 * Form values for the create plan dialog.
 */
export interface CreatePlanFormValues {
  name: string;
  mode: 'empty' | 'copy' | 'template';
  sourcePlanId: string;
  templateId: string;
}

/**
 * Form values for the edit plan dialog.
 */
export interface EditPlanFormValues {
  name: string;
}
