import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function BucketCardSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-4 w-36" />
      </CardContent>
    </Card>
  );
}

export function BucketsSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading buckets page">
      <PageHeader
        title="Buckets"
        description="Organize your budget into spending categories."
        eyebrow="Savings"
      />

      <Card>
        <CardContent className="space-y-3 pt-6">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <BucketCardSkeleton />
        <BucketCardSkeleton />
        <BucketCardSkeleton />
        <BucketCardSkeleton />
      </div>
    </div>
  );
}
