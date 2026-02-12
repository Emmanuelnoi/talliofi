import { cn } from '@/lib/utils';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function OnboardingProgress({
  currentStep,
  totalSteps,
}: OnboardingProgressProps) {
  return (
    <div className="space-y-3">
      <div className="text-muted-foreground flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em]">
        <span>Progress</span>
        <span>
          Step {currentStep + 1} of {totalSteps}
        </span>
      </div>
      <div
        className="flex gap-2"
        role="progressbar"
        aria-label="Onboarding progress"
        aria-valuenow={currentStep + 1}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
      >
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              i <= currentStep ? 'bg-foreground' : 'bg-border/80',
            )}
          />
        ))}
      </div>
    </div>
  );
}
