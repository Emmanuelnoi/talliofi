import { useCallback } from 'react';
import { Landmark } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { useActivePlan } from '@/hooks/use-active-plan';
import {
  useAssets,
  useLiabilities,
  useNetWorthSnapshots,
} from '@/hooks/use-plan-data';
import {
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  useCreateLiability,
  useUpdateLiability,
  useDeleteLiability,
} from '@/hooks/use-plan-mutations';
import type { Asset, Liability } from '@/domain/plan';
import { useNetWorthSummary } from '../hooks/use-net-worth';
import { NetWorthSkeleton } from '../components/net-worth-skeleton';
import { NetWorthSummaryCard } from '../components/net-worth-summary-card';
import { NetWorthBreakdownChart } from '../components/net-worth-breakdown-chart';
import { NetWorthTrendChart } from '../components/net-worth-trend-chart';
import { AssetList } from '../components/asset-list';
import { LiabilityList } from '../components/liability-list';

export default function NetWorthPage() {
  const { data: plan, isLoading: planLoading } = useActivePlan();
  const { data: assets = [], isLoading: assetsLoading } = useAssets(plan?.id);
  const { data: liabilities = [], isLoading: liabilitiesLoading } =
    useLiabilities(plan?.id);
  const { data: snapshots = [], isLoading: snapshotsLoading } =
    useNetWorthSnapshots(plan?.id);

  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();

  const createLiability = useCreateLiability();
  const updateLiability = useUpdateLiability();
  const deleteLiability = useDeleteLiability();

  const summary = useNetWorthSummary(assets, liabilities);

  // Asset handlers
  const handleCreateAsset = useCallback(
    async (asset: Asset) => {
      await createAsset.mutateAsync(asset);
    },
    [createAsset],
  );

  const handleUpdateAsset = useCallback(
    async (asset: Asset) => {
      await updateAsset.mutateAsync(asset);
    },
    [updateAsset],
  );

  const handleDeleteAsset = useCallback(
    async (id: string) => {
      if (!plan) return;
      await deleteAsset.mutateAsync({ id, planId: plan.id });
    },
    [deleteAsset, plan],
  );

  // Liability handlers
  const handleCreateLiability = useCallback(
    async (liability: Liability) => {
      await createLiability.mutateAsync(liability);
    },
    [createLiability],
  );

  const handleUpdateLiability = useCallback(
    async (liability: Liability) => {
      await updateLiability.mutateAsync(liability);
    },
    [updateLiability],
  );

  const handleDeleteLiability = useCallback(
    async (id: string) => {
      if (!plan) return;
      await deleteLiability.mutateAsync({ id, planId: plan.id });
    },
    [deleteLiability, plan],
  );

  const isLoading =
    planLoading || assetsLoading || liabilitiesLoading || snapshotsLoading;

  if (isLoading) {
    return <NetWorthSkeleton />;
  }

  if (!plan) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Net Worth"
          description="Complete onboarding to start tracking your net worth."
        />
      </div>
    );
  }

  const hasData = assets.length > 0 || liabilities.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Net Worth"
        description="Track your assets and liabilities to monitor your financial health."
      />

      {!hasData ? (
        <EmptyState
          icon={Landmark}
          title="Start tracking your net worth"
          description="Add your assets and liabilities to see your complete financial picture."
        />
      ) : (
        <>
          {/* Summary and Breakdown Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            <NetWorthSummaryCard
              totalAssets={summary.totalAssets}
              totalLiabilities={summary.totalLiabilities}
              netWorth={summary.netWorth}
            />
            <NetWorthBreakdownChart
              assetsByCategory={summary.assetsByCategory}
              liabilitiesByCategory={summary.liabilitiesByCategory}
            />
          </div>
        </>
      )}

      {/* Asset and Liability Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AssetList
          assets={assets}
          planId={plan.id}
          onCreateAsset={handleCreateAsset}
          onUpdateAsset={handleUpdateAsset}
          onDeleteAsset={handleDeleteAsset}
        />
        <LiabilityList
          liabilities={liabilities}
          planId={plan.id}
          onCreateLiability={handleCreateLiability}
          onUpdateLiability={handleUpdateLiability}
          onDeleteLiability={handleDeleteLiability}
        />
      </div>

      {/* Trend Chart */}
      <NetWorthTrendChart snapshots={snapshots} />
    </div>
  );
}
