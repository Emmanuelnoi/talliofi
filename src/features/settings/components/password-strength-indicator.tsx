type Strength = 'weak' | 'fair' | 'strong' | 'very-strong';

interface PasswordStrengthIndicatorProps {
  password: string;
}

const STRENGTH_CONFIG: Record<
  Strength,
  { segments: number; label: string; color: string }
> = {
  weak: { segments: 1, label: 'Weak', color: 'bg-red-500' },
  fair: { segments: 2, label: 'Fair', color: 'bg-amber-500' },
  strong: { segments: 3, label: 'Strong', color: 'bg-emerald-500' },
  'very-strong': { segments: 4, label: 'Very strong', color: 'bg-emerald-600' },
};

function calculateStrength(password: string): Strength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z\d]/.test(password)) score++;

  if (score <= 1) return 'weak';
  if (score === 2) return 'fair';
  if (score === 3) return 'strong';
  return 'very-strong';
}

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const strength = calculateStrength(password);
  const { segments, label, color } = STRENGTH_CONFIG[strength];

  return (
    <div className="space-y-1.5">
      <div
        className="flex gap-1"
        role="meter"
        aria-label={`Password strength: ${label}`}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={segments}
        aria-valuetext={label}
      >
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < segments ? color : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}
