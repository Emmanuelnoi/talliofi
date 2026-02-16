export const queryKeys = {
  activePlan: ['active-plan'] as const,
  allPlans: ['all-plans'] as const,
  changelog: ['changelog'] as const,
  buckets: (planId: string) => ['buckets', planId] as const,
  expenses: (planId: string) => ['expenses', planId] as const,
  expensesRange: (planId: string, start: string, end: string) =>
    ['expenses', planId, 'range', start, end] as const,
  taxComponents: (planId: string) => ['tax-components', planId] as const,
  goals: (planId: string) => ['goals', planId] as const,
  assets: (planId: string) => ['assets', planId] as const,
  liabilities: (planId: string) => ['liabilities', planId] as const,
  snapshots: (planId: string | undefined) => ['snapshots', planId] as const,
  netWorthSnapshots: (planId: string) =>
    ['net-worth-snapshots', planId] as const,
  recurringTemplates: (planId: string) =>
    ['recurring-templates', planId] as const,
  recurringTemplatesActive: (planId: string) =>
    ['recurring-templates-active', planId] as const,
  expenseAttachments: (expenseId: string) =>
    ['expense-attachments', expenseId] as const,
  exchangeRates: (planId: string) => ['exchange-rates', planId] as const,
  planSummary: (planId: string) => ['plan-summary', planId] as const,
} as const;
