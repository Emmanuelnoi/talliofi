function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`bg-muted animate-pulse rounded-xl ${className ?? ''}`} />
  );
}

/** Loading skeleton that mirrors the history page layout. */
export function HistorySkeleton() {
  return (
    <div className="space-y-8">
      {/* Header placeholder */}
      <div className="space-y-2">
        <div className="bg-muted h-7 w-32 animate-pulse rounded" />
        <div className="bg-muted h-4 w-72 animate-pulse rounded" />
      </div>

      {/* Rolling average summary */}
      <SkeletonBlock className="h-36" />

      {/* Trend chart */}
      <SkeletonBlock className="h-[360px]" />

      {/* Snapshot list header */}
      <div className="bg-muted h-6 w-48 animate-pulse rounded" />

      {/* Snapshot cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SkeletonBlock className="h-40" />
        <SkeletonBlock className="h-40" />
        <SkeletonBlock className="h-40" />
      </div>
    </div>
  );
}
