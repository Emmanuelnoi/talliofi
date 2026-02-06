import { Card, CardContent, CardHeader } from '@/components/ui/card';

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted ${className ?? ''}`}
      aria-hidden="true"
    />
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <SkeletonBar className="h-5 w-32" />
        <SkeletonBar className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <SkeletonBar className="h-9 w-40" />
      </CardContent>
    </Card>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading settings" role="status">
      {/* Page header skeleton */}
      <div className="space-y-1">
        <SkeletonBar className="h-7 w-28" />
        <SkeletonBar className="h-4 w-64" />
      </div>

      {/* Section skeletons */}
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
