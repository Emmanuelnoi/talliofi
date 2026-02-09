import { useMemo } from 'react';
import type {
  Asset,
  Liability,
  AssetCategory,
  LiabilityCategory,
} from '@/domain/plan';
import { cents, sumMoney, subtractMoney } from '@/domain/money';
import type { Cents } from '@/domain/money';

export interface NetWorthSummary {
  totalAssets: Cents;
  totalLiabilities: Cents;
  netWorth: Cents;
  assetsByCategory: Map<AssetCategory, Cents>;
  liabilitiesByCategory: Map<LiabilityCategory, Cents>;
}

/**
 * Computes net worth summary from assets and liabilities.
 */
export function useNetWorthSummary(
  assets: Asset[],
  liabilities: Liability[],
): NetWorthSummary {
  return useMemo(() => {
    // Calculate totals by category for assets
    const assetsByCategory = new Map<AssetCategory, Cents>();
    for (const asset of assets) {
      const current = assetsByCategory.get(asset.category) ?? cents(0);
      assetsByCategory.set(asset.category, cents(current + asset.valueCents));
    }

    // Calculate totals by category for liabilities
    const liabilitiesByCategory = new Map<LiabilityCategory, Cents>();
    for (const liability of liabilities) {
      const current = liabilitiesByCategory.get(liability.category) ?? cents(0);
      liabilitiesByCategory.set(
        liability.category,
        cents(current + liability.balanceCents),
      );
    }

    const totalAssets = sumMoney(assets.map((a) => a.valueCents));
    const totalLiabilities = sumMoney(liabilities.map((l) => l.balanceCents));
    const netWorth = subtractMoney(totalAssets, totalLiabilities);

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      assetsByCategory,
      liabilitiesByCategory,
    };
  }, [assets, liabilities]);
}
