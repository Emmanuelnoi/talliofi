import { useMemo } from 'react';
import type { MonthlySnapshot, RollingAverages } from '@/domain/plan/types';
import { computeRollingAverages } from '@/domain/plan/snapshot';

export function useRollingAverages(
  snapshots: readonly MonthlySnapshot[],
  months: 3 | 6 | 12 = 3,
): RollingAverages | null {
  return useMemo(
    () => computeRollingAverages(snapshots, months),
    [snapshots, months],
  );
}
