import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';

export function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Analyze your financial data with custom date ranges."
      />

      {/* Date Range Selector Skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="bg-muted h-10 w-[180px] animate-pulse rounded-md" />
            <div className="bg-muted h-5 w-[200px] animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>

      {/* Report Cards Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Spending by Category Skeleton */}
        <Card>
          <CardHeader>
            <div className="bg-muted h-6 w-[180px] animate-pulse rounded" />
            <div className="bg-muted h-4 w-[100px] animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div className="bg-muted mx-auto size-[200px] animate-pulse rounded-full" />
              <div className="flex-1 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-muted h-8 animate-pulse rounded" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Adherence Skeleton */}
        <Card>
          <CardHeader>
            <div className="bg-muted h-6 w-[160px] animate-pulse rounded" />
            <div className="bg-muted h-4 w-[200px] animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="mb-4 rounded-lg border p-4 text-center">
              <div className="bg-muted mx-auto h-4 w-[120px] animate-pulse rounded" />
              <div className="bg-muted mx-auto mt-2 h-10 w-[80px] animate-pulse rounded" />
            </div>
            <div className="bg-muted h-[200px] animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>

      {/* Income vs Expenses Skeleton */}
      <Card>
        <CardHeader>
          <div className="bg-muted h-6 w-[180px] animate-pulse rounded" />
          <div className="bg-muted h-4 w-[160px] animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="bg-muted h-3 w-[80px] animate-pulse rounded" />
                <div className="bg-muted mt-2 h-6 w-[100px] animate-pulse rounded" />
              </div>
            ))}
          </div>
          <div className="bg-muted h-[300px] animate-pulse rounded" />
        </CardContent>
      </Card>

      {/* Category Trends Skeleton */}
      <Card>
        <CardHeader>
          <div className="bg-muted h-6 w-[150px] animate-pulse rounded" />
          <div className="bg-muted h-4 w-[180px] animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="bg-muted h-[350px] animate-pulse rounded" />
          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-muted h-[60px] animate-pulse rounded-lg"
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Expenses Skeleton */}
      <Card>
        <CardHeader>
          <div className="bg-muted h-6 w-[130px] animate-pulse rounded" />
          <div className="bg-muted h-4 w-[200px] animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-lg border p-3">
            <div className="bg-muted h-3 w-[100px] animate-pulse rounded" />
            <div className="bg-muted mt-2 h-8 w-[120px] animate-pulse rounded" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-muted h-[72px] animate-pulse rounded-lg"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
