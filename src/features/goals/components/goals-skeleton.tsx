import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function GoalCardSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-4 w-40" />
      </CardContent>
    </Card>
  );
}

export function GoalsSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading goals page">
      <PageHeader
        title="Goals"
        description="Track your savings targets and debt payoff progress."
        eyebrow="Planning"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-2 pt-6">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-10" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 pt-6">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-10" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 pt-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-14" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex gap-3 pt-6">
          <Skeleton className="h-8 w-[140px]" />
          <Skeleton className="h-8 w-[140px]" />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <GoalCardSkeleton />
        <GoalCardSkeleton />
      </div>
    </div>
  );
}
