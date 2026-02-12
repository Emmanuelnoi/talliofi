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

      {/* Row 1: Income Summary + Donut (xl:grid-cols-12) */}
      <div className="grid gap-6 xl:grid-cols-12">
        <SkeletonCard className="h-56 xl:col-span-7" />
        <SkeletonCard className="h-56 xl:col-span-5" />
      </div>

      {/* Row 2: Key numbers (grid-cols-2 lg:grid-cols-4) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-24" />
      </div>

      {/* Row 3: Expense trend chart */}
      <SkeletonCard className="h-72" />

      {/* Row 4: Net worth + Alerts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonCard className="h-44" />
        <SkeletonCard className="h-44" />
      </div>
    </div>
  );
}
