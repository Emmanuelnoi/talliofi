import { planRepo } from '@/data/repos/plan-repo';
import { db } from '@/data/db';
import { addMoney, dollarsToCents, subtractMoney } from '@/domain/money';
import type {
  Plan,
  BucketAllocation,
  TaxComponent,
  ExpenseItem,
  Goal,
  Asset,
  Liability,
  MonthlySnapshot,
  NetWorthSnapshot,
  RecurringTemplate,
} from '@/domain/plan/types';

export const DEMO_PLAN_ID = '2f56d113-a53f-4b0a-8a53-df4fb637924d';
export const DEMO_PRESETS = ['basic', 'heavy', 'investor'] as const;
export type DemoPreset = (typeof DEMO_PRESETS)[number];

export function normalizeDemoPreset(
  value: string | null | undefined,
): DemoPreset {
  if (value === 'heavy' || value === 'investor') return value;
  return 'basic';
}

const DEMO_BUCKET_IDS = {
  essentials: 'ee88f9f8-e2f0-4dd0-9c5e-2d137ee5f073',
  lifestyle: '78dcac42-074b-45d6-ab80-05d4f58f98f4',
  savings: 'd445eb65-1704-43d2-b8aa-3704deff6f22',
  growth: '87763346-c5ad-406f-ae45-47377e87eb56',
} as const;

function formatYearMonth(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

function formatDateOnly(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function getRecentYearMonths(count: number): readonly string[] {
  const now = new Date();
  const yearMonths: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    yearMonths.push(
      formatYearMonth(new Date(now.getFullYear(), now.getMonth() - i, 1)),
    );
  }
  return yearMonths;
}

function buildDemoPlan(nowIso: string, preset: DemoPreset): Plan {
  const planName =
    preset === 'basic'
      ? 'Demo Financial Plan'
      : `Demo Financial Plan (${preset})`;
  const grossIncomeDollars =
    preset === 'heavy' ? 12_000 : preset === 'investor' ? 14_500 : 9_500;

  return {
    id: DEMO_PLAN_ID,
    name: planName,
    grossIncomeCents: dollarsToCents(grossIncomeDollars),
    incomeFrequency: 'monthly',
    taxMode: 'itemized',
    currencyCode: 'USD',
    createdAt: nowIso,
    updatedAt: nowIso,
    version: 0,
  };
}

function buildDemoBuckets(nowIso: string): readonly BucketAllocation[] {
  return [
    {
      id: DEMO_BUCKET_IDS.essentials,
      planId: DEMO_PLAN_ID,
      name: 'Essentials',
      color: '#4A90E2',
      mode: 'percentage',
      targetPercentage: 50,
      rolloverEnabled: false,
      sortOrder: 0,
      createdAt: nowIso,
    },
    {
      id: DEMO_BUCKET_IDS.lifestyle,
      planId: DEMO_PLAN_ID,
      name: 'Lifestyle',
      color: '#7B61FF',
      mode: 'percentage',
      targetPercentage: 20,
      rolloverEnabled: false,
      sortOrder: 1,
      createdAt: nowIso,
    },
    {
      id: DEMO_BUCKET_IDS.savings,
      planId: DEMO_PLAN_ID,
      name: 'Savings',
      color: '#00A676',
      mode: 'percentage',
      targetPercentage: 20,
      rolloverEnabled: true,
      sortOrder: 2,
      createdAt: nowIso,
    },
    {
      id: DEMO_BUCKET_IDS.growth,
      planId: DEMO_PLAN_ID,
      name: 'Growth',
      color: '#F5A623',
      mode: 'percentage',
      targetPercentage: 10,
      rolloverEnabled: true,
      sortOrder: 3,
      createdAt: nowIso,
    },
  ];
}

function buildDemoTaxComponents(): readonly TaxComponent[] {
  return [
    {
      id: '18fdf500-2df3-45a9-b6f2-fbc612cb2b86',
      planId: DEMO_PLAN_ID,
      name: 'Federal',
      ratePercent: 18,
      sortOrder: 0,
    },
    {
      id: 'e434ca18-1c4e-4fe3-ac63-cf7757de83a8',
      planId: DEMO_PLAN_ID,
      name: 'State',
      ratePercent: 6,
      sortOrder: 1,
    },
    {
      id: '50e675d7-09ea-483c-ac26-0597ca6ab8af',
      planId: DEMO_PLAN_ID,
      name: 'FICA',
      ratePercent: 7.65,
      sortOrder: 2,
    },
  ];
}

function buildDemoExpenses(
  now: Date,
  yearMonths: readonly string[],
  preset: DemoPreset,
): readonly ExpenseItem[] {
  const expenses: ExpenseItem[] = [];

  const monthlyTemplates = [
    {
      key: 'rent',
      name: 'Rent',
      bucketId: DEMO_BUCKET_IDS.essentials,
      category: 'housing' as const,
      baseAmount: 2_450,
      monthDelta: 0,
      isFixed: true,
      day: 1,
    },
    {
      key: 'groceries',
      name: 'Groceries',
      bucketId: DEMO_BUCKET_IDS.essentials,
      category: 'groceries' as const,
      baseAmount: 620,
      monthDelta: 12,
      isFixed: false,
      day: 6,
    },
    {
      key: 'utilities',
      name: 'Utilities',
      bucketId: DEMO_BUCKET_IDS.essentials,
      category: 'utilities' as const,
      baseAmount: 235,
      monthDelta: 3,
      isFixed: false,
      day: 12,
    },
    {
      key: 'commute',
      name: 'Commute + Fuel',
      bucketId: DEMO_BUCKET_IDS.essentials,
      category: 'transportation' as const,
      baseAmount: 195,
      monthDelta: 2,
      isFixed: false,
      day: 18,
    },
    {
      key: 'dining',
      name: 'Dining Out',
      bucketId: DEMO_BUCKET_IDS.lifestyle,
      category: 'dining' as const,
      baseAmount: 255,
      monthDelta: 7,
      isFixed: false,
      day: 14,
    },
    {
      key: 'streaming',
      name: 'Streaming Services',
      bucketId: DEMO_BUCKET_IDS.lifestyle,
      category: 'subscriptions' as const,
      baseAmount: 54,
      monthDelta: 0,
      isFixed: true,
      day: 20,
    },
    {
      key: 'entertainment',
      name: 'Entertainment',
      bucketId: DEMO_BUCKET_IDS.lifestyle,
      category: 'entertainment' as const,
      baseAmount: 180,
      monthDelta: 5,
      isFixed: false,
      day: 23,
    },
    {
      key: 'savings-transfer',
      name: 'Emergency Fund Transfer',
      bucketId: DEMO_BUCKET_IDS.savings,
      category: 'savings' as const,
      baseAmount: 450,
      monthDelta: 10,
      isFixed: true,
      day: 25,
    },
    {
      key: 'brokerage',
      name: 'Brokerage Auto-Invest',
      bucketId: DEMO_BUCKET_IDS.growth,
      category: 'savings' as const,
      baseAmount: 375,
      monthDelta: 15,
      isFixed: true,
      day: 27,
    },
  ] as const;

  const templateAmountMultiplier =
    preset === 'heavy' ? 1.25 : preset === 'investor' ? 1.12 : 1;

  for (let monthIndex = 0; monthIndex < yearMonths.length; monthIndex++) {
    const yearMonth = yearMonths[monthIndex];
    for (const template of monthlyTemplates) {
      const date = `${yearMonth}-${String(template.day).padStart(2, '0')}`;
      const amount =
        (template.baseAmount + template.monthDelta * monthIndex) *
        templateAmountMultiplier;
      const createdAt = new Date(`${date}T09:00:00.000Z`).toISOString();
      expenses.push({
        id: crypto.randomUUID(),
        planId: DEMO_PLAN_ID,
        bucketId: template.bucketId,
        name: template.name,
        amountCents: dollarsToCents(amount),
        frequency: 'monthly',
        category: template.category,
        currencyCode: 'USD',
        isFixed: template.isFixed,
        transactionDate: date,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  const currentYearMonth = formatYearMonth(now);
  const splitDate = `${currentYearMonth}-22`;
  const splitCreatedAt = new Date(`${splitDate}T09:00:00.000Z`).toISOString();
  expenses.push({
    id: crypto.randomUUID(),
    planId: DEMO_PLAN_ID,
    bucketId: DEMO_BUCKET_IDS.essentials,
    name: 'Home + Internet Bundle',
    amountCents: dollarsToCents(320),
    frequency: 'monthly',
    category: 'utilities',
    currencyCode: 'USD',
    isFixed: true,
    transactionDate: splitDate,
    isSplit: true,
    splits: [
      {
        bucketId: DEMO_BUCKET_IDS.essentials,
        category: 'utilities',
        amountCents: dollarsToCents(260),
      },
      {
        bucketId: DEMO_BUCKET_IDS.lifestyle,
        category: 'subscriptions',
        amountCents: dollarsToCents(60),
      },
    ],
    createdAt: splitCreatedAt,
    updatedAt: splitCreatedAt,
  });

  if (preset === 'heavy') {
    for (let monthIndex = 0; monthIndex < yearMonths.length; monthIndex++) {
      const yearMonth = yearMonths[monthIndex];
      const travelDate = `${yearMonth}-10`;
      const travelCreatedAt = new Date(
        `${travelDate}T09:00:00.000Z`,
      ).toISOString();
      expenses.push({
        id: crypto.randomUUID(),
        planId: DEMO_PLAN_ID,
        bucketId: DEMO_BUCKET_IDS.lifestyle,
        name: 'Weekend Travel',
        amountCents: dollarsToCents(320 + monthIndex * 22),
        frequency: 'monthly',
        category: 'entertainment',
        currencyCode: 'USD',
        isFixed: false,
        transactionDate: travelDate,
        createdAt: travelCreatedAt,
        updatedAt: travelCreatedAt,
      });
    }
  }

  if (preset === 'investor') {
    for (let monthIndex = 0; monthIndex < yearMonths.length; monthIndex++) {
      const yearMonth = yearMonths[monthIndex];
      const dcaDate = `${yearMonth}-08`;
      const dcaCreatedAt = new Date(`${dcaDate}T09:00:00.000Z`).toISOString();
      expenses.push({
        id: crypto.randomUUID(),
        planId: DEMO_PLAN_ID,
        bucketId: DEMO_BUCKET_IDS.growth,
        name: 'Index Fund DCA',
        amountCents: dollarsToCents(800 + monthIndex * 40),
        frequency: 'monthly',
        category: 'savings',
        currencyCode: 'USD',
        isFixed: true,
        transactionDate: dcaDate,
        createdAt: dcaCreatedAt,
        updatedAt: dcaCreatedAt,
      });
    }
  }

  return expenses;
}

function buildDemoGoals(nowIso: string, preset: DemoPreset): readonly Goal[] {
  const emergencyTarget = preset === 'investor' ? 24_000 : 15_000;
  const emergencyCurrent = preset === 'investor' ? 12_500 : 6_200;
  const debtTarget = preset === 'heavy' ? 14_000 : 8_000;
  const debtCurrent = preset === 'heavy' ? 6_500 : 3_100;

  return [
    {
      id: 'e0ce8088-748e-49ca-8a02-2f7f3048a031',
      planId: DEMO_PLAN_ID,
      name: 'Emergency Fund',
      type: 'savings',
      targetAmountCents: dollarsToCents(emergencyTarget),
      currentAmountCents: dollarsToCents(emergencyCurrent),
      targetDate: '2026-12-31',
      color: '#00A676',
      notes: '6 months of core expenses',
      isCompleted: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: '8918dbcb-8446-4853-bf8d-6434308fc665',
      planId: DEMO_PLAN_ID,
      name: 'Pay Off Credit Card',
      type: 'debt_payoff',
      targetAmountCents: dollarsToCents(debtTarget),
      currentAmountCents: dollarsToCents(debtCurrent),
      targetDate: '2026-08-30',
      color: '#F95D6A',
      notes: 'Aggressive payoff plan',
      isCompleted: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];
}

function buildDemoAssets(nowIso: string, preset: DemoPreset): readonly Asset[] {
  const assets: Asset[] = [
    {
      id: '136b50a7-a477-49fb-97f3-1a0fd53f5319',
      planId: DEMO_PLAN_ID,
      name: 'Checking Account',
      category: 'cash',
      valueCents: dollarsToCents(8_750),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: '75347ff7-a170-4373-96ac-4bd9b0f88f9f',
      planId: DEMO_PLAN_ID,
      name: '401(k)',
      category: 'investment',
      valueCents: dollarsToCents(preset === 'investor' ? 86_300 : 42_300),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: '9eea9383-f9c6-4662-b08a-72e35e1bc701',
      planId: DEMO_PLAN_ID,
      name: 'Brokerage Account',
      category: 'investment',
      valueCents: dollarsToCents(preset === 'investor' ? 42_600 : 15_600),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'f3377cd9-87ed-4fd4-b4ca-a31b0090db9f',
      planId: DEMO_PLAN_ID,
      name: 'Home Equity',
      category: 'property',
      valueCents: dollarsToCents(preset === 'investor' ? 115_000 : 78_000),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  if (preset !== 'basic') {
    assets.push({
      id: '2fd3d0fa-f1a1-4f68-bf0e-a26f0f0eff3f',
      planId: DEMO_PLAN_ID,
      name: 'Roth IRA',
      category: 'investment',
      valueCents: dollarsToCents(preset === 'investor' ? 38_000 : 11_500),
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  return assets;
}

function buildDemoLiabilities(
  nowIso: string,
  preset: DemoPreset,
): readonly Liability[] {
  return [
    {
      id: '7f43bf7f-01c6-486f-a5cb-d9f6b7c1f4ee',
      planId: DEMO_PLAN_ID,
      name: 'Mortgage',
      category: 'mortgage',
      balanceCents: dollarsToCents(
        preset === 'investor'
          ? 188_000
          : preset === 'heavy'
            ? 255_000
            : 210_000,
      ),
      interestRate: 5.7,
      minimumPaymentCents: dollarsToCents(1_620),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: '9f7fcf85-27b0-4932-b4dc-c0c2f12873db',
      planId: DEMO_PLAN_ID,
      name: 'Credit Card',
      category: 'credit_card',
      balanceCents: dollarsToCents(preset === 'heavy' ? 8_900 : 3_200),
      interestRate: 19.99,
      minimumPaymentCents: dollarsToCents(120),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: '13f9f779-00e8-4ba6-a8d5-2a4f5bf8ef13',
      planId: DEMO_PLAN_ID,
      name: 'Auto Loan',
      category: 'auto_loan',
      balanceCents: dollarsToCents(preset === 'investor' ? 6_400 : 11_400),
      interestRate: 4.1,
      minimumPaymentCents: dollarsToCents(390),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];
}

function buildDemoSnapshots(
  yearMonths: readonly string[],
  preset: DemoPreset,
): readonly MonthlySnapshot[] {
  const grossIncomeCents =
    preset === 'heavy'
      ? dollarsToCents(12_000)
      : preset === 'investor'
        ? dollarsToCents(14_500)
        : dollarsToCents(9_500);
  const netIncomeCents =
    preset === 'heavy'
      ? dollarsToCents(7_650)
      : preset === 'investor'
        ? dollarsToCents(9_500)
        : dollarsToCents(6_550);
  const allocations = {
    essentials: dollarsToCents(
      preset === 'heavy' ? 4_200 : preset === 'investor' ? 4_000 : 3_275,
    ),
    lifestyle: dollarsToCents(
      preset === 'heavy' ? 1_800 : preset === 'investor' ? 1_500 : 1_310,
    ),
    savings: dollarsToCents(
      preset === 'heavy' ? 1_050 : preset === 'investor' ? 2_250 : 1_310,
    ),
    growth: dollarsToCents(
      preset === 'heavy' ? 600 : preset === 'investor' ? 1_750 : 655,
    ),
  };

  return yearMonths.map((yearMonth, index) => {
    const essentialsSpent = dollarsToCents(
      (preset === 'heavy' ? 4_450 : preset === 'investor' ? 3_980 : 3_480) +
        index * 35,
    );
    const lifestyleSpent = dollarsToCents(
      (preset === 'heavy' ? 1_920 : preset === 'investor' ? 1_420 : 1_240) +
        index * 20,
    );
    const savingsSpent = dollarsToCents(
      (preset === 'heavy' ? 920 : preset === 'investor' ? 2_120 : 1_160) +
        index * 25,
    );
    const growthSpent = dollarsToCents(
      (preset === 'heavy' ? 520 : preset === 'investor' ? 1_600 : 620) +
        index * 18,
    );
    const totalExpensesCents = addMoney(
      addMoney(essentialsSpent, lifestyleSpent),
      addMoney(savingsSpent, growthSpent),
    );

    const [year, month] = yearMonth.split('-').map((value) => Number(value));
    const createdAt = new Date(year, month, 0, 12, 0, 0, 0).toISOString();

    return {
      id: crypto.randomUUID(),
      planId: DEMO_PLAN_ID,
      yearMonth,
      grossIncomeCents,
      netIncomeCents,
      totalExpensesCents,
      bucketSummaries: [
        {
          bucketId: DEMO_BUCKET_IDS.essentials,
          bucketName: 'Essentials',
          allocatedCents: allocations.essentials,
          spentCents: essentialsSpent,
          remainingCents: subtractMoney(
            allocations.essentials,
            essentialsSpent,
          ),
        },
        {
          bucketId: DEMO_BUCKET_IDS.lifestyle,
          bucketName: 'Lifestyle',
          allocatedCents: allocations.lifestyle,
          spentCents: lifestyleSpent,
          remainingCents: subtractMoney(allocations.lifestyle, lifestyleSpent),
        },
        {
          bucketId: DEMO_BUCKET_IDS.savings,
          bucketName: 'Savings',
          allocatedCents: allocations.savings,
          spentCents: savingsSpent,
          remainingCents: subtractMoney(allocations.savings, savingsSpent),
        },
        {
          bucketId: DEMO_BUCKET_IDS.growth,
          bucketName: 'Growth',
          allocatedCents: allocations.growth,
          spentCents: growthSpent,
          remainingCents: subtractMoney(allocations.growth, growthSpent),
        },
      ],
      createdAt,
    };
  });
}

function buildDemoNetWorthSnapshots(
  yearMonths: readonly string[],
  preset: DemoPreset,
): readonly NetWorthSnapshot[] {
  return yearMonths.map((yearMonth, index) => {
    const totalAssetsCents = dollarsToCents(
      (preset === 'investor'
        ? 265_000
        : preset === 'heavy'
          ? 140_000
          : 118_000) +
        index * (preset === 'investor' ? 8_200 : 4_200),
    );
    const totalLiabilitiesCents = dollarsToCents(
      (preset === 'heavy'
        ? 310_000
        : preset === 'investor'
          ? 205_000
          : 236_000) -
        index * 3_500,
    );
    const netWorthCents = subtractMoney(
      totalAssetsCents,
      totalLiabilitiesCents,
    );
    const [year, month] = yearMonth.split('-').map((value) => Number(value));
    const createdAt = new Date(year, month, 0, 12, 0, 0, 0).toISOString();

    return {
      id: crypto.randomUUID(),
      planId: DEMO_PLAN_ID,
      yearMonth,
      totalAssetsCents,
      totalLiabilitiesCents,
      netWorthCents,
      assetBreakdown: [
        {
          category: 'cash',
          totalCents: dollarsToCents(9_000 + index * 200),
          count: 1,
        },
        {
          category: 'investment',
          totalCents: dollarsToCents(58_000 + index * 2_600),
          count: 2,
        },
        {
          category: 'property',
          totalCents: dollarsToCents(51_000 + index * 1_400),
          count: 1,
        },
      ],
      liabilityBreakdown: [
        {
          category: 'mortgage',
          totalCents: dollarsToCents(221_000 - index * 3_000),
          count: 1,
        },
        {
          category: 'credit_card',
          totalCents: dollarsToCents(4_100 - index * 200),
          count: 1,
        },
        {
          category: 'auto_loan',
          totalCents: dollarsToCents(10_900 - index * 300),
          count: 1,
        },
      ],
      createdAt,
    };
  });
}

function buildRecurringTemplates(
  now: Date,
  preset: DemoPreset,
): readonly RecurringTemplate[] {
  const createdAt = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();
  const today = formatDateOnly(now);
  const templates: RecurringTemplate[] = [
    {
      id: '8ea27f0b-4af3-4eaf-a6cb-e95b1c64f9d2',
      planId: DEMO_PLAN_ID,
      name: 'Rent',
      amountCents: dollarsToCents(2_450),
      frequency: 'monthly',
      category: 'housing',
      bucketId: DEMO_BUCKET_IDS.essentials,
      currencyCode: 'USD',
      dayOfMonth: 1,
      isActive: true,
      lastGeneratedDate: today,
      isFixed: true,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'c58fca4e-59c8-47b6-8d09-f1e5a843ca53',
      planId: DEMO_PLAN_ID,
      name: 'Brokerage Auto-Invest',
      amountCents: dollarsToCents(375),
      frequency: 'monthly',
      category: 'savings',
      bucketId: DEMO_BUCKET_IDS.growth,
      currencyCode: 'USD',
      dayOfMonth: 27,
      isActive: true,
      lastGeneratedDate: today,
      isFixed: true,
      createdAt,
      updatedAt: createdAt,
    },
  ];

  if (preset === 'investor') {
    templates.push({
      id: 'bbf611fe-fc64-45ef-b962-c1d0d59df373',
      planId: DEMO_PLAN_ID,
      name: 'IRA Contribution',
      amountCents: dollarsToCents(600),
      frequency: 'monthly',
      category: 'savings',
      bucketId: DEMO_BUCKET_IDS.growth,
      currencyCode: 'USD',
      dayOfMonth: 12,
      isActive: true,
      lastGeneratedDate: today,
      isFixed: true,
      createdAt,
      updatedAt: createdAt,
    });
  }

  return templates;
}

export async function ensureDemoPlan(options?: {
  preset?: DemoPreset;
}): Promise<Plan> {
  const preset = normalizeDemoPreset(options?.preset);
  const now = new Date();
  const nowIso = now.toISOString();
  const monthCount = preset === 'basic' ? 6 : 12;
  const yearMonths = getRecentYearMonths(monthCount);

  const plan = buildDemoPlan(nowIso, preset);
  const buckets = buildDemoBuckets(nowIso);
  const taxComponents = buildDemoTaxComponents();
  const expenses = buildDemoExpenses(now, yearMonths, preset);
  const goals = buildDemoGoals(nowIso, preset);
  const assets = buildDemoAssets(nowIso, preset);
  const liabilities = buildDemoLiabilities(nowIso, preset);
  const snapshots = buildDemoSnapshots(yearMonths, preset);
  const netWorthSnapshots = buildDemoNetWorthSnapshots(yearMonths, preset);
  const recurringTemplates = buildRecurringTemplates(now, preset);

  await db.transaction(
    'rw',
    [
      db.plans,
      db.buckets,
      db.taxComponents,
      db.expenses,
      db.goals,
      db.assets,
      db.liabilities,
      db.snapshots,
      db.netWorthSnapshots,
      db.recurringTemplates,
      db.exchangeRates,
      db.changelog,
    ],
    async () => {
      await db.buckets.where('planId').equals(DEMO_PLAN_ID).delete();
      await db.taxComponents.where('planId').equals(DEMO_PLAN_ID).delete();
      await db.expenses.where('planId').equals(DEMO_PLAN_ID).delete();
      await db.goals.where('planId').equals(DEMO_PLAN_ID).delete();
      await db.assets.where('planId').equals(DEMO_PLAN_ID).delete();
      await db.liabilities.where('planId').equals(DEMO_PLAN_ID).delete();
      await db.snapshots.where('planId').equals(DEMO_PLAN_ID).delete();
      await db.netWorthSnapshots.where('planId').equals(DEMO_PLAN_ID).delete();
      await db.recurringTemplates.where('planId').equals(DEMO_PLAN_ID).delete();
      await db.exchangeRates.where('planId').equals(DEMO_PLAN_ID).delete();
      await db.changelog.where('planId').equals(DEMO_PLAN_ID).delete();

      await db.plans.put(plan);
      await db.buckets.bulkAdd(buckets);
      await db.taxComponents.bulkAdd(taxComponents);
      await db.expenses.bulkAdd(expenses);
      await db.goals.bulkAdd(goals);
      await db.assets.bulkAdd(assets);
      await db.liabilities.bulkAdd(liabilities);
      await db.snapshots.bulkAdd(snapshots);
      await db.netWorthSnapshots.bulkAdd(netWorthSnapshots);
      await db.recurringTemplates.bulkAdd(recurringTemplates);
    },
  );

  planRepo.setActivePlanId(DEMO_PLAN_ID);
  return plan;
}
