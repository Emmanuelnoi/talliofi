import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router';
import { AlertTriangle, Loader2 } from 'lucide-react';
import AppLayout from '@/app/layout';
import { ErrorBoundary } from '@/components/feedback/error-boundary';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';
import { AuthGuard } from '@/features/auth/components/auth-guard';

const OnboardingPage = lazy(
  () => import('@/features/onboarding/pages/onboarding-page'),
);
const DashboardPage = lazy(
  () => import('@/features/dashboard/pages/dashboard-page'),
);
const IncomePage = lazy(() => import('@/features/income/pages/income-page'));
const TaxesPage = lazy(() => import('@/features/taxes/pages/taxes-page'));
const ExpensesPage = lazy(
  () => import('@/features/expenses/pages/expenses-page'),
);
const BucketsPage = lazy(() => import('@/features/buckets/pages/buckets-page'));
const GoalsPage = lazy(() => import('@/features/goals/pages/goals-page'));
const NetWorthPage = lazy(
  () => import('@/features/net-worth/pages/net-worth-page'),
);
const HistoryPage = lazy(() => import('@/features/history/pages/history-page'));
const ReportsPage = lazy(() => import('@/features/reports/pages/reports-page'));
const SettingsPage = lazy(
  () => import('@/features/settings/pages/settings-page'),
);
const PlansPage = lazy(() => import('@/features/plans/pages/plans-page'));
const DemoEntryPage = lazy(
  () => import('@/features/demo/pages/demo-entry-page'),
);
const HelpPage = lazy(() => import('@/features/help/pages/help-page'));

function PageLoading() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="flex min-h-svh items-center justify-center">
      <Loader2
        className={cn(
          'text-muted-foreground size-6',
          !prefersReducedMotion && 'motion-safe:animate-spin',
        )}
      />
    </div>
  );
}

function PageErrorFallback() {
  return (
    <div className="border-destructive/30 bg-destructive/5 rounded-xl border p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-destructive mt-0.5 size-5 shrink-0" />
        <div className="space-y-1">
          <h2 className="text-sm font-semibold tracking-tight">
            This page crashed
          </h2>
          <p className="text-muted-foreground text-sm">
            Try refreshing. You can still navigate to other sections.
          </p>
        </div>
      </div>
    </div>
  );
}

function wrapPage(page: ReactNode) {
  return (
    <ErrorBoundary fallback={<PageErrorFallback />}>
      <Suspense fallback={<PageLoading />}>{page}</Suspense>
    </ErrorBoundary>
  );
}

export const router = createBrowserRouter([
  {
    path: '/onboarding',
    element: wrapPage(<OnboardingPage />),
  },
  {
    path: '/demo',
    element: wrapPage(<DemoEntryPage />),
  },
  {
    path: '/help',
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: wrapPage(<HelpPage />),
      },
    ],
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: wrapPage(<DashboardPage />),
      },
      {
        path: 'dashboard',
        element: wrapPage(<DashboardPage />),
      },
      {
        path: 'income',
        element: wrapPage(<IncomePage />),
      },
      {
        path: 'taxes',
        element: wrapPage(<TaxesPage />),
      },
      {
        path: 'expenses',
        element: wrapPage(<ExpensesPage />),
      },
      {
        path: 'buckets',
        element: wrapPage(<BucketsPage />),
      },
      {
        path: 'goals',
        element: wrapPage(<GoalsPage />),
      },
      {
        path: 'net-worth',
        element: wrapPage(<NetWorthPage />),
      },
      {
        path: 'history',
        element: wrapPage(<HistoryPage />),
      },
      {
        path: 'reports',
        element: wrapPage(<ReportsPage />),
      },
      {
        path: 'settings',
        element: wrapPage(<SettingsPage />),
      },
      {
        path: 'plans',
        element: wrapPage(<PlansPage />),
      },
    ],
  },
]);
