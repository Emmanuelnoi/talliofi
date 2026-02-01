function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`bg-muted animate-pulse rounded-xl ${className ?? ''}`} />
  );
}

/** Loading skeleton that mirrors the dashboard grid layout. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header placeholder */}
      <div className="space-y-2">
        <div className="bg-muted h-7 w-40 animate-pulse rounded" />
        <div className="bg-muted h-4 w-64 animate-pulse rounded" />
      </div>

      {/* Row 1: Income Summary + Donut (lg:grid-cols-3) */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SkeletonCard className="h-48 lg:col-span-2" />
        <SkeletonCard className="h-48" />
      </div>

      {/* Row 2: Key numbers (grid-cols-2 lg:grid-cols-4) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-24" />
      </div>

      {/* Row 3: Expense trend chart */}
      <SkeletonCard className="h-64" />
    </div>
  );
}
