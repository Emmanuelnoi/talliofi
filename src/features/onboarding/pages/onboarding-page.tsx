import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/stores/ui-store';
import { ACTIVE_PLAN_QUERY_KEY } from '@/hooks/use-active-plan';
import { planRepo } from '@/data/repos/plan-repo';
import { bucketRepo } from '@/data/repos/bucket-repo';
import { expenseRepo } from '@/data/repos/expense-repo';
import { dollarsToCents } from '@/domain/money';
import type { Plan, BucketAllocation, ExpenseItem } from '@/domain/plan';
import type { Frequency } from '@/domain/plan';
import { IncomeStep } from '../components/income-step';
import { TaxStep } from '../components/tax-step';
import { TemplateStep } from '../components/template-step';
import { BucketsStep } from '../components/buckets-step';
import { ExpensesStep } from '../components/expenses-step';
import { SummaryStep } from '../components/summary-step';
import { OnboardingProgress } from '../components/onboarding-progress';
import type { OnboardingData } from '../types';

const TOTAL_STEPS = 6;

const STEP_TITLES = [
  'Income',
  'Taxes',
  'Template',
  'Buckets',
  'Expenses',
  'Summary',
] as const;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const step = useUIStore((s) => s.onboardingStep);
  const setStep = useUIStore((s) => s.setOnboardingStep);

  const handleNext = useCallback(() => {
    setStep(Math.min(step + 1, TOTAL_STEPS - 1));
  }, [step, setStep]);

  const handleBack = useCallback(() => {
    setStep(Math.max(step - 1, 0));
  }, [step, setStep]);

  const handleComplete = useCallback(
    async (data: OnboardingData) => {
      const now = new Date().toISOString();
      const planId = crypto.randomUUID();

      const plan: Plan = {
        id: planId,
        name: 'My Plan',
        grossIncomeCents: dollarsToCents(data.income.grossIncomeDollars),
        incomeFrequency: data.income.incomeFrequency as Frequency,
        taxMode: 'simple',
        taxEffectiveRate: data.tax.effectiveRate,
        createdAt: now,
        updatedAt: now,
        version: 0,
      };

      await planRepo.create(plan);

      // Build a name→UUID map so expenses can reference the correct bucket ID
      const bucketNameToId = new Map<string, string>();

      for (let i = 0; i < data.buckets.length; i++) {
        const b = data.buckets[i];
        const bucketId = crypto.randomUUID();
        bucketNameToId.set(b.name, bucketId);

        const bucket: BucketAllocation = {
          id: bucketId,
          planId,
          name: b.name,
          color: b.color,
          mode: b.mode,
          targetPercentage:
            b.mode === 'percentage' ? b.targetPercentage : undefined,
          targetAmountCents:
            b.mode === 'fixed' && b.targetAmountDollars !== undefined
              ? dollarsToCents(b.targetAmountDollars)
              : undefined,
          sortOrder: i,
          createdAt: now,
        };
        await bucketRepo.create(bucket);
      }

      for (const e of data.expenses) {
        const expense: ExpenseItem = {
          id: crypto.randomUUID(),
          planId,
          bucketId: bucketNameToId.get(e.bucketId) ?? '',
          name: e.name,
          amountCents: dollarsToCents(e.amountDollars),
          frequency: e.frequency as Frequency,
          category: e.category,
          isFixed: e.isFixed,
          createdAt: now,
          updatedAt: now,
        };
        await expenseRepo.create(expense);
      }

      await queryClient.invalidateQueries({
        queryKey: ACTIVE_PLAN_QUERY_KEY,
      });

      navigate('/dashboard', { replace: true });
      setStep(0);
    },
    [navigate, queryClient, setStep],
  );

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="text-lg font-semibold">Talliofi</h1>
          <span className="text-muted-foreground text-sm">
            {STEP_TITLES[step]}
          </span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <OnboardingProgress currentStep={step} totalSteps={TOTAL_STEPS} />

        <div className="mt-8">
          {step === 0 && <IncomeStep onNext={handleNext} />}
          {step === 1 && <TaxStep onNext={handleNext} onBack={handleBack} />}
          {step === 2 && (
            <TemplateStep onNext={handleNext} onBack={handleBack} />
          )}
          {step === 3 && (
            <BucketsStep onNext={handleNext} onBack={handleBack} />
          )}
          {step === 4 && (
            <ExpensesStep onNext={handleNext} onBack={handleBack} />
          )}
          {step === 5 && (
            <SummaryStep onBack={handleBack} onComplete={handleComplete} />
          )}
        </div>
      </div>
    </div>
  );
}
