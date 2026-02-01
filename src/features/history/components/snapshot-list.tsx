import { useMemo } from 'react';
import type { MonthlySnapshot } from '@/domain/plan/types';
import { SnapshotCard } from './snapshot-card';

interface SnapshotListProps {
  snapshots: MonthlySnapshot[];
}

export function SnapshotList({ snapshots }: SnapshotListProps) {
  const sortedSnapshots = useMemo(
    () => [...snapshots].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth)),
    [snapshots],
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Monthly Snapshots</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedSnapshots.map((snapshot, index) => {
          // The next item in the sorted (newest-first) array is the previous month
          const previousSnapshot = sortedSnapshots[index + 1];
          return (
            <SnapshotCard
              key={snapshot.id}
              snapshot={snapshot}
              previousSnapshot={previousSnapshot}
            />
          );
        })}
      </div>
    </div>
  );
}
