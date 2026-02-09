import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportData, exportAsCSV, exportAsPDF } from '../export-service';
import { planRepo } from '@/data/repos/plan-repo';
import { bucketRepo } from '@/data/repos/bucket-repo';
import { taxComponentRepo } from '@/data/repos/tax-component-repo';
import { expenseRepo } from '@/data/repos/expense-repo';
import { cents } from '@/domain/money';
import type {
  Plan,
  BucketAllocation,
  TaxComponent,
  ExpenseItem,
} from '@/domain/plan/types';

// Mock jsPDF - track instances for test assertions
let mockJsPDFInstance: ReturnType<typeof createMockJsPDFInstance>;

function createMockJsPDFInstance() {
  const instance = {
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
      pages: [null, {}] as (object | null)[], // Simulate 1 page (index 0 is null placeholder)
    },
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    setLineWidth: vi.fn(),
    addPage: vi.fn(),
    setPage: vi.fn(),
    output: vi.fn(
      () => new Blob(['mock pdf content'], { type: 'application/pdf' }),
    ),
  };
  // Make addPage actually add to pages array
  instance.addPage.mockImplementation(() => {
    instance.internal.pages.push({});
  });
  return instance;
}

vi.mock('jspdf', () => {
  // Use a function declaration for the constructor
  return {
    jsPDF: function jsPDF() {
      mockJsPDFInstance = createMockJsPDFInstance();
      return mockJsPDFInstance;
    },
  };
});

const PLAN_ID = crypto.randomUUID();

function makePlan(overrides?: Partial<Plan>): Plan {
  return {
    id: PLAN_ID,
    name: 'Test Plan',
    grossIncomeCents: cents(500000),
    incomeFrequency: 'monthly',
    taxMode: 'simple',
    taxEffectiveRate: 25,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 0,
    ...overrides,
  };
}

function makeBucket(overrides?: Partial<BucketAllocation>): BucketAllocation {
  return {
    id: crypto.randomUUID(),
    planId: PLAN_ID,
    name: 'Needs',
    color: '#4A90D9',
    mode: 'percentage',
    targetPercentage: 50,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeTaxComponent(overrides?: Partial<TaxComponent>): TaxComponent {
  return {
    id: crypto.randomUUID(),
    planId: PLAN_ID,
    name: 'Federal',
    ratePercent: 22,
    sortOrder: 0,
    ...overrides,
  };
}

function makeExpense(
  bucketId: string,
  overrides?: Partial<ExpenseItem>,
): ExpenseItem {
  return {
    id: crypto.randomUUID(),
    planId: PLAN_ID,
    bucketId,
    name: 'Rent',
    amountCents: cents(150000),
    frequency: 'monthly',
    category: 'housing',
    isFixed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('exportData', () => {
  it('exports correct JSON structure with all entity types', async () => {
    await planRepo.create(makePlan());
    const bucket = makeBucket();
    await bucketRepo.create(bucket);
    await taxComponentRepo.create(makeTaxComponent());
    await expenseRepo.create(makeExpense(bucket.id));

    const json = await exportData(PLAN_ID);
    const result = JSON.parse(json);

    expect(result.version).toBe(1);
    expect(result.exportedAt).toBeDefined();
    expect(result.plan.id).toBe(PLAN_ID);
    expect(result.plan.name).toBe('Test Plan');
    expect(result.buckets).toHaveLength(1);
    expect(result.taxComponents).toHaveLength(1);
    expect(result.expenses).toHaveLength(1);
    expect(result.snapshots).toHaveLength(0);
  });

  it('includes all entity types in the export', async () => {
    await planRepo.create(makePlan());
    const bucket = makeBucket();
    await bucketRepo.create(bucket);
    await taxComponentRepo.create(makeTaxComponent());
    await expenseRepo.create(makeExpense(bucket.id));

    const json = await exportData(PLAN_ID);
    const result = JSON.parse(json);

    expect(result).toHaveProperty('plan');
    expect(result).toHaveProperty('buckets');
    expect(result).toHaveProperty('taxComponents');
    expect(result).toHaveProperty('expenses');
    expect(result).toHaveProperty('snapshots');
    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('exportedAt');
  });

  it('handles plan with no expenses or buckets', async () => {
    await planRepo.create(makePlan());

    const json = await exportData(PLAN_ID);
    const result = JSON.parse(json);

    expect(result.plan.id).toBe(PLAN_ID);
    expect(result.buckets).toHaveLength(0);
    expect(result.expenses).toHaveLength(0);
    expect(result.taxComponents).toHaveLength(0);
    expect(result.snapshots).toHaveLength(0);
  });

  it('throws when plan does not exist', async () => {
    await expect(exportData('non-existent-id')).rejects.toThrow(
      'Plan not found',
    );
  });
});

// --- CSV Export Tests ---

describe('exportAsCSV', () => {
  const CSV_PLAN_ID = crypto.randomUUID();

  function makeCSVPlan(overrides?: Partial<Plan>): Plan {
    return {
      id: CSV_PLAN_ID,
      name: 'CSV Test Plan',
      grossIncomeCents: cents(600000),
      incomeFrequency: 'monthly',
      taxMode: 'simple',
      taxEffectiveRate: 20,
      createdAt: new Date('2024-01-15').toISOString(),
      updatedAt: new Date('2024-02-20').toISOString(),
      version: 1,
      ...overrides,
    };
  }

  function makeCSVBucket(
    overrides?: Partial<BucketAllocation>,
  ): BucketAllocation {
    return {
      id: crypto.randomUUID(),
      planId: CSV_PLAN_ID,
      name: 'Savings',
      color: '#22C55E',
      mode: 'percentage',
      targetPercentage: 20,
      sortOrder: 0,
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  }

  function makeCSVTaxComponent(
    overrides?: Partial<TaxComponent>,
  ): TaxComponent {
    return {
      id: crypto.randomUUID(),
      planId: CSV_PLAN_ID,
      name: 'State Tax',
      ratePercent: 5,
      sortOrder: 0,
      ...overrides,
    };
  }

  function makeCSVExpense(
    bucketId: string,
    overrides?: Partial<ExpenseItem>,
  ): ExpenseItem {
    return {
      id: crypto.randomUUID(),
      planId: CSV_PLAN_ID,
      bucketId,
      name: 'Groceries',
      amountCents: cents(50000),
      frequency: 'monthly',
      category: 'groceries',
      isFixed: false,
      createdAt: new Date('2024-01-20').toISOString(),
      updatedAt: new Date('2024-01-20').toISOString(),
      ...overrides,
    };
  }

  beforeEach(async () => {
    // Clean up any existing data
    const existingPlan = await planRepo.getById(CSV_PLAN_ID);
    if (existingPlan) {
      await planRepo.delete(CSV_PLAN_ID);
    }
  });

  it('exports complete CSV with plan, buckets, and expenses', async () => {
    await planRepo.create(makeCSVPlan());
    const bucket = makeCSVBucket();
    await bucketRepo.create(bucket);
    await taxComponentRepo.create(makeCSVTaxComponent());
    await expenseRepo.create(makeCSVExpense(bucket.id));

    const csv = await exportAsCSV(CSV_PLAN_ID);

    // Verify sections exist
    expect(csv).toContain('=== PLAN SUMMARY ===');
    expect(csv).toContain('=== TAX COMPONENTS ===');
    expect(csv).toContain('=== BUDGET BUCKETS ===');
    expect(csv).toContain('=== EXPENSES ===');

    // Verify plan data
    expect(csv).toContain('CSV Test Plan');
    expect(csv).toContain('$6,000.00');
    expect(csv).toContain('monthly');
    expect(csv).toContain('simple');
    expect(csv).toContain('20%');

    // Verify bucket data
    expect(csv).toContain('Savings');
    expect(csv).toContain('#22C55E');
    expect(csv).toContain('percentage');

    // Verify tax component data
    expect(csv).toContain('State Tax');

    // Verify expense data
    expect(csv).toContain('Groceries');
    expect(csv).toContain('groceries');
  });

  it('exports CSV with empty expenses list', async () => {
    await planRepo.create(makeCSVPlan());
    const bucket = makeCSVBucket();
    await bucketRepo.create(bucket);

    const csv = await exportAsCSV(CSV_PLAN_ID);

    // Should have expenses section header
    expect(csv).toContain('=== EXPENSES ===');
    expect(csv).toContain(
      'Name,Amount,Frequency,Category,Bucket,Fixed,Notes,Created',
    );

    // Should only have the header row after expenses section
    const lines = csv.split('\n');
    const expensesIndex = lines.findIndex((line) =>
      line.includes('=== EXPENSES ==='),
    );
    expect(expensesIndex).toBeGreaterThan(-1);
    // The next line should be the header, and that should be the last non-empty line
    const expensesSection = lines.slice(expensesIndex);
    const nonEmptyLines = expensesSection.filter((line) => line.trim() !== '');
    expect(nonEmptyLines).toHaveLength(2); // Section header + column headers only
  });

  it('handles special characters in values (quotes, commas, newlines)', async () => {
    await planRepo.create(
      makeCSVPlan({ name: 'Plan with "quotes" and, commas' }),
    );
    const bucket = makeCSVBucket({ name: 'Bucket with\nnewline' });
    await bucketRepo.create(bucket);
    await expenseRepo.create(
      makeCSVExpense(bucket.id, {
        name: 'Expense, with "special" chars',
        notes: 'Line1\nLine2',
      }),
    );

    const csv = await exportAsCSV(CSV_PLAN_ID);

    // Values with special chars should be properly quoted and escaped
    expect(csv).toContain('"Plan with ""quotes"" and, commas"');
    expect(csv).toContain('"Bucket with\nnewline"');
    expect(csv).toContain('"Expense, with ""special"" chars"');
    expect(csv).toContain('"Line1\nLine2"');
  });

  it('prevents CSV injection by prefixing dangerous characters', async () => {
    await planRepo.create(makeCSVPlan());
    const bucket = makeCSVBucket();
    await bucketRepo.create(bucket);

    // Create expenses with dangerous starting characters
    const dangerousNames = [
      { name: '=SUM(A1:A10)', expected: "'" }, // = formula
      { name: '+1234567890', expected: "'" }, // + potential formula
      { name: '-100', expected: "'" }, // - potential formula
      { name: '@mention', expected: "'" }, // @ DDE attack
    ];

    for (const { name } of dangerousNames) {
      await expenseRepo.create(
        makeCSVExpense(bucket.id, {
          id: crypto.randomUUID(),
          name,
        }),
      );
    }

    const csv = await exportAsCSV(CSV_PLAN_ID);

    // Each dangerous value should be prefixed with a single quote
    expect(csv).toContain("'=SUM(A1:A10)");
    expect(csv).toContain("'+1234567890");
    expect(csv).toContain("'-100");
    expect(csv).toContain("'@mention");
  });

  it('handles Unicode characters correctly', async () => {
    await planRepo.create(makeCSVPlan({ name: 'Plan with émojis 🎉 and ñ' }));
    const bucket = makeCSVBucket({ name: '日本語バケット' });
    await bucketRepo.create(bucket);
    await expenseRepo.create(
      makeCSVExpense(bucket.id, {
        name: 'Café expense',
        notes: '中文笔记',
      }),
    );

    const csv = await exportAsCSV(CSV_PLAN_ID);

    expect(csv).toContain('Plan with émojis 🎉 and ñ');
    expect(csv).toContain('日本語バケット');
    expect(csv).toContain('Café expense');
    expect(csv).toContain('中文笔记');
  });

  it('properly escapes all expense fields', async () => {
    await planRepo.create(makeCSVPlan());
    const bucket = makeCSVBucket({ name: 'Bucket, with comma' });
    await bucketRepo.create(bucket);
    await expenseRepo.create(
      makeCSVExpense(bucket.id, {
        name: '=DANGEROUS',
        notes: 'Notes with "quotes"',
        category: 'entertainment',
      }),
    );

    const csv = await exportAsCSV(CSV_PLAN_ID);
    const lines = csv.split('\n');

    // Find the expense line
    const expenseLine = lines.find((line) => line.includes('DANGEROUS'));
    expect(expenseLine).toBeDefined();

    // Should have the dangerous prefix
    expect(expenseLine).toContain("'=DANGEROUS");
    // Should have quoted notes
    expect(expenseLine).toContain('"Notes with ""quotes"""');
    // Bucket name should be quoted due to comma
    expect(expenseLine).toContain('"Bucket, with comma"');
  });

  it('throws when plan does not exist', async () => {
    await expect(exportAsCSV('non-existent-csv-id')).rejects.toThrow(
      'Plan not found',
    );
  });

  it('handles fixed-amount bucket mode', async () => {
    await planRepo.create(makeCSVPlan());
    const bucket = makeCSVBucket({
      mode: 'fixed',
      targetPercentage: undefined,
      targetAmountCents: cents(100000),
    });
    await bucketRepo.create(bucket);

    const csv = await exportAsCSV(CSV_PLAN_ID);

    expect(csv).toContain('fixed');
    expect(csv).toContain('$1,000.00');
  });

  it('includes itemized tax components when tax mode is itemized', async () => {
    await planRepo.create(
      makeCSVPlan({ taxMode: 'itemized', taxEffectiveRate: undefined }),
    );
    await taxComponentRepo.create(
      makeCSVTaxComponent({ name: 'Federal', ratePercent: 22 }),
    );
    await taxComponentRepo.create(
      makeCSVTaxComponent({
        id: crypto.randomUUID(),
        name: 'State',
        ratePercent: 5,
      }),
    );
    await taxComponentRepo.create(
      makeCSVTaxComponent({
        id: crypto.randomUUID(),
        name: 'FICA',
        ratePercent: 7.65,
      }),
    );

    const csv = await exportAsCSV(CSV_PLAN_ID);

    expect(csv).toContain('=== TAX COMPONENTS ===');
    expect(csv).toContain('Federal,22');
    expect(csv).toContain('State,5');
    expect(csv).toContain('FICA,7.65');
  });
});

// --- PDF Export Tests ---

describe('exportAsPDF', () => {
  const PDF_PLAN_ID = crypto.randomUUID();

  function makePDFPlan(overrides?: Partial<Plan>): Plan {
    return {
      id: PDF_PLAN_ID,
      name: 'PDF Test Plan',
      grossIncomeCents: cents(800000),
      incomeFrequency: 'biweekly',
      taxMode: 'simple',
      taxEffectiveRate: 25,
      createdAt: new Date('2024-03-01').toISOString(),
      updatedAt: new Date('2024-03-15').toISOString(),
      version: 2,
      ...overrides,
    };
  }

  function makePDFBucket(
    overrides?: Partial<BucketAllocation>,
  ): BucketAllocation {
    return {
      id: crypto.randomUUID(),
      planId: PDF_PLAN_ID,
      name: 'Needs',
      color: '#4A90D9',
      mode: 'percentage',
      targetPercentage: 50,
      sortOrder: 0,
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  }

  function makePDFTaxComponent(
    overrides?: Partial<TaxComponent>,
  ): TaxComponent {
    return {
      id: crypto.randomUUID(),
      planId: PDF_PLAN_ID,
      name: 'Federal Tax',
      ratePercent: 22,
      sortOrder: 0,
      ...overrides,
    };
  }

  function makePDFExpense(
    bucketId: string,
    overrides?: Partial<ExpenseItem>,
  ): ExpenseItem {
    return {
      id: crypto.randomUUID(),
      planId: PDF_PLAN_ID,
      bucketId,
      name: 'Rent Payment',
      amountCents: cents(150000),
      frequency: 'monthly',
      category: 'housing',
      isFixed: true,
      createdAt: new Date('2024-03-05').toISOString(),
      updatedAt: new Date('2024-03-05').toISOString(),
      ...overrides,
    };
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    // Clean up any existing data
    const existingPlan = await planRepo.getById(PDF_PLAN_ID);
    if (existingPlan) {
      await planRepo.delete(PDF_PLAN_ID);
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('generates a PDF blob', async () => {
    await planRepo.create(makePDFPlan());
    const bucket = makePDFBucket();
    await bucketRepo.create(bucket);
    await expenseRepo.create(makePDFExpense(bucket.id));

    const blob = await exportAsPDF(PDF_PLAN_ID);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
  });

  it('creates jsPDF instance and calls output method', async () => {
    await planRepo.create(makePDFPlan());
    const bucket = makePDFBucket();
    await bucketRepo.create(bucket);

    await exportAsPDF(PDF_PLAN_ID);

    expect(mockJsPDFInstance).toBeDefined();
    expect(mockJsPDFInstance.output).toHaveBeenCalledWith('blob');
  });

  it('renders plan summary information', async () => {
    await planRepo.create(makePDFPlan());
    const bucket = makePDFBucket();
    await bucketRepo.create(bucket);

    await exportAsPDF(PDF_PLAN_ID);

    const textCalls = mockJsPDFInstance.text.mock.calls;

    // Check that key information is rendered
    const allTextContent = textCalls
      .map((call: unknown[]) => call[0])
      .join(' ');
    expect(allTextContent).toContain('Talliofi Financial Report');
    expect(allTextContent).toContain('Plan Summary');
    expect(allTextContent).toContain('PDF Test Plan');
    expect(allTextContent).toContain('$8,000.00');
  });

  it('shows "No expenses recorded" when expenses list is empty', async () => {
    await planRepo.create(makePDFPlan());
    const bucket = makePDFBucket();
    await bucketRepo.create(bucket);
    // No expenses created

    await exportAsPDF(PDF_PLAN_ID);

    const textCalls = mockJsPDFInstance.text.mock.calls;
    const allTextContent = textCalls
      .map((call: unknown[]) => call[0])
      .join(' ');

    expect(allTextContent).toContain('No expenses recorded');
  });

  it('renders multiple buckets correctly', async () => {
    await planRepo.create(makePDFPlan());
    await bucketRepo.create(
      makePDFBucket({ name: 'Needs', targetPercentage: 50 }),
    );
    await bucketRepo.create(
      makePDFBucket({
        id: crypto.randomUUID(),
        name: 'Wants',
        targetPercentage: 30,
        sortOrder: 1,
      }),
    );
    await bucketRepo.create(
      makePDFBucket({
        id: crypto.randomUUID(),
        name: 'Savings',
        targetPercentage: 20,
        sortOrder: 2,
      }),
    );

    await exportAsPDF(PDF_PLAN_ID);

    const textCalls = mockJsPDFInstance.text.mock.calls;
    const allTextContent = textCalls
      .map((call: unknown[]) => call[0])
      .join(' ');

    expect(allTextContent).toContain('Budget Buckets');
    expect(allTextContent).toContain('Needs');
    expect(allTextContent).toContain('Wants');
    expect(allTextContent).toContain('Savings');
    expect(allTextContent).toContain('50%');
    expect(allTextContent).toContain('30%');
    expect(allTextContent).toContain('20%');
  });

  it('includes expenses in the PDF', async () => {
    await planRepo.create(makePDFPlan());
    const bucket = makePDFBucket();
    await bucketRepo.create(bucket);
    await expenseRepo.create(
      makePDFExpense(bucket.id, { name: 'Rent', amountCents: cents(150000) }),
    );
    await expenseRepo.create(
      makePDFExpense(bucket.id, {
        id: crypto.randomUUID(),
        name: 'Utilities',
        amountCents: cents(20000),
        category: 'utilities',
      }),
    );

    await exportAsPDF(PDF_PLAN_ID);

    const textCalls = mockJsPDFInstance.text.mock.calls;
    const allTextContent = textCalls
      .map((call: unknown[]) => call[0])
      .join(' ');

    expect(allTextContent).toContain('Expenses');
    expect(allTextContent).toContain('Rent');
    expect(allTextContent).toContain('Utilities');
    expect(allTextContent).toContain('$1,500.00');
    expect(allTextContent).toContain('$200.00');
  });

  it('renders tax components for itemized tax mode', async () => {
    await planRepo.create(
      makePDFPlan({ taxMode: 'itemized', taxEffectiveRate: undefined }),
    );
    await bucketRepo.create(makePDFBucket());
    await taxComponentRepo.create(
      makePDFTaxComponent({ name: 'Federal', ratePercent: 22 }),
    );
    await taxComponentRepo.create(
      makePDFTaxComponent({
        id: crypto.randomUUID(),
        name: 'State',
        ratePercent: 5,
      }),
    );

    await exportAsPDF(PDF_PLAN_ID);

    const textCalls = mockJsPDFInstance.text.mock.calls;
    const allTextContent = textCalls
      .map((call: unknown[]) => call[0])
      .join(' ');

    expect(allTextContent).toContain('Tax Components');
    expect(allTextContent).toContain('Federal');
    expect(allTextContent).toContain('22%');
    expect(allTextContent).toContain('State');
    expect(allTextContent).toContain('5%');
  });

  it('throws when plan does not exist', async () => {
    await expect(exportAsPDF('non-existent-pdf-id')).rejects.toThrow(
      'Plan not found',
    );
  });

  it('handles fixed-amount buckets in PDF', async () => {
    await planRepo.create(makePDFPlan());
    await bucketRepo.create(
      makePDFBucket({
        name: 'Emergency Fund',
        mode: 'fixed',
        targetPercentage: undefined,
        targetAmountCents: cents(50000),
      }),
    );

    await exportAsPDF(PDF_PLAN_ID);

    const textCalls = mockJsPDFInstance.text.mock.calls;
    const allTextContent = textCalls
      .map((call: unknown[]) => call[0])
      .join(' ');

    expect(allTextContent).toContain('Emergency Fund');
    expect(allTextContent).toContain('$500.00');
    expect(allTextContent).toContain('fixed');
  });

  it('calculates and displays total monthly expenses', async () => {
    await planRepo.create(makePDFPlan());
    const bucket = makePDFBucket();
    await bucketRepo.create(bucket);

    // Add multiple expenses with different frequencies
    await expenseRepo.create(
      makePDFExpense(bucket.id, {
        name: 'Rent',
        amountCents: cents(150000),
        frequency: 'monthly',
      }),
    );
    await expenseRepo.create(
      makePDFExpense(bucket.id, {
        id: crypto.randomUUID(),
        name: 'Car Payment',
        amountCents: cents(40000),
        frequency: 'monthly',
      }),
    );

    await exportAsPDF(PDF_PLAN_ID);

    const textCalls = mockJsPDFInstance.text.mock.calls;
    const allTextContent = textCalls
      .map((call: unknown[]) => call[0])
      .join(' ');

    expect(allTextContent).toContain('Total Monthly Expenses');
    // $1,500 + $400 = $1,900
    expect(allTextContent).toContain('$1900.00');
  });

  it('sets correct font styles throughout the document', async () => {
    await planRepo.create(makePDFPlan());
    const bucket = makePDFBucket();
    await bucketRepo.create(bucket);

    await exportAsPDF(PDF_PLAN_ID);

    // Verify font methods were called
    expect(mockJsPDFInstance.setFontSize).toHaveBeenCalled();
    expect(mockJsPDFInstance.setFont).toHaveBeenCalled();

    // Check for bold font usage (for headers)
    const setFontCalls = mockJsPDFInstance.setFont.mock.calls;
    const boldCalls = setFontCalls.filter(
      (call: unknown[]) => call[1] === 'bold',
    );
    expect(boldCalls.length).toBeGreaterThan(0);
  });
});
