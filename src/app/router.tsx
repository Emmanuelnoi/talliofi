import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';
import { Loader2 } from 'lucide-react';
import AppLayout from '@/app/layout';
import { ErrorBoundary } from '@/components/feedback/error-boundary';

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

function PageLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Loader2 className="text-muted-foreground size-6 animate-spin" />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/onboarding',
    element: (
      <ErrorBoundary>
        <Suspense fallback={<PageLoading />}>
          <OnboardingPage />
        </Suspense>
      </ErrorBoundary>
    ),
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'income',
        element: <IncomePage />,
      },
      {
        path: 'taxes',
        element: <TaxesPage />,
      },
      {
        path: 'expenses',
        element: <ExpensesPage />,
      },
      {
        path: 'buckets',
        element: <BucketsPage />,
      },
      {
        path: 'goals',
        element: <GoalsPage />,
      },
      {
        path: 'net-worth',
        element: <NetWorthPage />,
      },
      {
        path: 'history',
        element: <HistoryPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'plans',
        element: <PlansPage />,
      },
    ],
  },
]);
