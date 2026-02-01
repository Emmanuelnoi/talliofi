import { Clock } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';

export function HistoryEmpty() {
  return (
    <EmptyState
      icon={Clock}
      title="No history yet"
      description="Snapshots are saved automatically each month. Check back next month to see your trends."
    />
  );
}
