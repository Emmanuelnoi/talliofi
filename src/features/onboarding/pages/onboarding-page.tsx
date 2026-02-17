import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/stores/ui-store';
import { queryKeys } from '@/hooks/query-keys';
import {
  getPlanRepo,
  getBucketRepo,
  getExpenseRepo,
} from '@/data/repos/repo-router';
import { useLocalEncryption } from '@/hooks/use-local-encryption';
import { dollarsToCents, DEFAULT_CURRENCY } from '@/domain/money';
import type { Plan, BucketAllocation, ExpenseItem } from '@/domain/plan';
import type { Frequency } from '@/domain/plan';
import { IncomeStep } from '../components/income-step';
import { TaxStep } from '../components/tax-step';
import { TemplateStep } from '../components/template-step';
import { BucketsStep } from '../components/buckets-step';
import { ExpensesStep } from '../components/expenses-step';
import { SummaryStep } from '../components/summary-step';
import { OnboardingProgress } from '../components/onboarding-progress';
import { useOnboardingDataStore } from '../stores/onboarding-data-store';
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
  const { scheduleVaultSave } = useLocalEncryption();
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
      const planRepo = getPlanRepo();
      const bucketRepo = getBucketRepo();
      const expenseRepo = getExpenseRepo();

      const plan: Plan = {
        id: planId,
        name: 'My Plan',
        grossIncomeCents: dollarsToCents(data.income.grossIncomeDollars),
        incomeFrequency: data.income.incomeFrequency as Frequency,
        taxMode: 'simple',
        taxEffectiveRate: data.tax.effectiveRate,
        currencyCode: DEFAULT_CURRENCY,
        createdAt: now,
        updatedAt: now,
        version: 0,
      };

      await planRepo.create(plan);

      // Build a name→UUID map so expenses can reference the correct bucket ID
      const bucketNameToId = new Map<string, string>();
      const bucketsToCreate: BucketAllocation[] = data.buckets.map((b, i) => {
        const bucketId = crypto.randomUUID();
        bucketNameToId.set(b.name, bucketId);

        return {
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
          rolloverEnabled: false,
          sortOrder: i,
          createdAt: now,
        };
      });

      await Promise.all(
        bucketsToCreate.map((bucket) => bucketRepo.create(bucket)),
      );

      const expensesToCreate: ExpenseItem[] = data.expenses.map((e) => {
        const resolvedBucketId = bucketNameToId.get(e.bucketId);
        if (!resolvedBucketId) {
          throw new Error(
            `Invalid onboarding expense bucket reference: "${e.bucketId}"`,
          );
        }

        return {
          id: crypto.randomUUID(),
          planId,
          bucketId: resolvedBucketId,
          name: e.name,
          amountCents: dollarsToCents(e.amountDollars),
          frequency: e.frequency as Frequency,
          category: e.category,
          currencyCode: e.currencyCode ?? DEFAULT_CURRENCY,
          isFixed: e.isFixed,
          createdAt: now,
          updatedAt: now,
        };
      });

      await Promise.all(
        expensesToCreate.map((expense) => expenseRepo.create(expense)),
      );

      // Set active plan ID so getActive() finds it immediately
      planRepo.setActivePlanId(planId);

      // Update the query cache directly so AppLayout sees the plan
      // before we navigate (avoids race with invalidateQueries refetch)
      queryClient.setQueryData(queryKeys.activePlan, plan);

      scheduleVaultSave();
      useOnboardingDataStore.getState().reset();
      setStep(0);
      navigate('/', { replace: true });
    },
    [navigate, queryClient, setStep, scheduleVaultSave],
  );

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-border/60 bg-background/85 sticky top-0 z-10 border-b px-6 py-5 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="bg-foreground text-background flex size-8 items-center justify-center rounded-lg text-xs font-semibold"
              aria-hidden="true"
            >
              T
            </div>
            <div>
              <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.2em]">
                Talliofi
              </p>
              <p className="text-sm font-semibold tracking-tight">
                Getting Started
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.2em]">
              Step {step + 1} of {TOTAL_STEPS}
            </p>
            <p className="text-sm font-semibold tracking-tight">
              {STEP_TITLES[step]}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
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
      </main>
    </div>
  );
}
