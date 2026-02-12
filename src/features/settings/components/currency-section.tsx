import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Coins, RefreshCw } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useActivePlan } from '@/hooks/use-active-plan';
import { useExchangeRates } from '@/hooks/use-plan-data';
import { useUpdatePlan } from '@/hooks/use-plan-mutations';
import { useLocalEncryption } from '@/hooks/use-local-encryption';
import { exchangeRateRepo } from '@/data/repos/exchange-rate-repo';
import {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  getCurrencySymbol,
  type CurrencyCode,
  type ExchangeRateRecord,
} from '@/domain/money';

type RateInputs = Record<CurrencyCode, string>;

function buildRateInputs(
  baseCurrency: CurrencyCode,
  record?: ExchangeRateRecord,
): RateInputs {
  const inputs = {} as RateInputs;
  const rates: Partial<Record<CurrencyCode, number>> =
    record?.baseCurrency === baseCurrency ? record.rates : {};

  for (const code of SUPPORTED_CURRENCIES) {
    if (code === baseCurrency) {
      inputs[code] = '1';
    } else {
      const value = rates?.[code];
      inputs[code] = value ? String(value) : '';
    }
  }

  return inputs;
}

export function CurrencySection() {
  const queryClient = useQueryClient();
  const { scheduleVaultSave } = useLocalEncryption();
  const { data: plan } = useActivePlan();
  const { data: exchangeRates } = useExchangeRates(plan?.id);
  const updatePlan = useUpdatePlan();

  const baseCurrency = plan?.currencyCode ?? DEFAULT_CURRENCY;
  const currencyOptions = useMemo(() => SUPPORTED_CURRENCIES, []);
  const targetCurrencies = useMemo(
    () => currencyOptions.filter((code) => code !== baseCurrency),
    [currencyOptions, baseCurrency],
  );

  const [rateInputs, setRateInputs] = useState<RateInputs>(() =>
    buildRateInputs(baseCurrency, exchangeRates ?? undefined),
  );
  const [isSavingRates, setIsSavingRates] = useState(false);
  const [isSavingBase, setIsSavingBase] = useState(false);

  useEffect(() => {
    setRateInputs(buildRateInputs(baseCurrency, exchangeRates ?? undefined));
  }, [baseCurrency, exchangeRates]);

  const handleRateChange = useCallback((code: CurrencyCode, value: string) => {
    setRateInputs((prev) => ({ ...prev, [code]: value }));
  }, []);

  const handleBaseCurrencyChange = useCallback(
    async (value: string) => {
      if (!plan) return;
      const next = value as CurrencyCode;
      if (next === baseCurrency) return;

      setIsSavingBase(true);
      try {
        await updatePlan.mutateAsync({ ...plan, currencyCode: next });
        await exchangeRateRepo.upsertForPlan(plan.id, next, {});
        await queryClient.invalidateQueries({
          queryKey: ['exchange-rates', plan.id],
        });
        scheduleVaultSave();
        toast.success(`Base currency updated to ${next}.`);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to update base currency.';
        toast.error(message);
      } finally {
        setIsSavingBase(false);
      }
    },
    [
      plan,
      baseCurrency,
      updatePlan,
      queryClient,
      scheduleVaultSave,
      setIsSavingBase,
    ],
  );

  const handleSaveRates = useCallback(async () => {
    if (!plan) return;
    const invalidCurrencies: CurrencyCode[] = [];
    const cleanedRates: Partial<Record<CurrencyCode, number>> = {};

    for (const code of targetCurrencies) {
      const raw = rateInputs[code];
      if (!raw) continue;
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0) {
        invalidCurrencies.push(code);
        continue;
      }
      cleanedRates[code] = value;
    }

    if (invalidCurrencies.length > 0) {
      toast.error(`Invalid exchange rate for ${invalidCurrencies.join(', ')}.`);
      return;
    }

    setIsSavingRates(true);
    try {
      await exchangeRateRepo.upsertForPlan(plan.id, baseCurrency, cleanedRates);
      await queryClient.invalidateQueries({
        queryKey: ['exchange-rates', plan.id],
      });
      scheduleVaultSave();
      toast.success('Exchange rates saved.');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to save exchange rates.';
      toast.error(message);
    } finally {
      setIsSavingRates(false);
    }
  }, [
    plan,
    baseCurrency,
    targetCurrencies,
    rateInputs,
    queryClient,
    scheduleVaultSave,
  ]);

  const hasRates =
    exchangeRates?.baseCurrency === baseCurrency &&
    Object.keys(exchangeRates.rates).length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="size-5" />
          Currency & Exchange Rates
        </CardTitle>
        <CardDescription>
          Set your base currency and maintain conversion rates for reporting.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!plan && (
          <p className="text-sm text-muted-foreground">
            Create a plan to manage currency preferences.
          </p>
        )}

        {plan && (
          <>
            <div className="grid gap-3 sm:grid-cols-[200px_1fr] sm:items-center">
              <Label htmlFor="base-currency" className="text-sm">
                Base currency
              </Label>
              <div className="flex flex-wrap items-center gap-3">
                <Select
                  value={baseCurrency}
                  onValueChange={handleBaseCurrencyChange}
                >
                  <SelectTrigger id="base-currency" className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code} {getCurrencySymbol(code)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant={hasRates ? 'secondary' : 'outline'}>
                  {hasRates
                    ? `Rates updated ${new Date(
                        exchangeRates!.updatedAt,
                      ).toLocaleString()}`
                    : 'No rates saved'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveRates}
                  disabled={isSavingRates || targetCurrencies.length === 0}
                >
                  <RefreshCw className="size-4" />
                  {isSavingRates ? 'Saving…' : 'Save Rates'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isSavingBase}
                  onClick={() => handleBaseCurrencyChange(DEFAULT_CURRENCY)}
                >
                  Reset to {DEFAULT_CURRENCY}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">
                Exchange rates (1 {baseCurrency} equals)
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {targetCurrencies.map((code) => (
                  <div key={code} className="rounded-md border p-3">
                    <Label
                      htmlFor={`rate-${code}`}
                      className="text-xs text-muted-foreground"
                    >
                      {code} {getCurrencySymbol(code)}
                    </Label>
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        id={`rate-${code}`}
                        type="number"
                        min="0"
                        step="0.0001"
                        value={rateInputs[code] ?? ''}
                        onChange={(event) =>
                          handleRateChange(code, event.target.value)
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        {code}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave a rate empty if you do not track that currency.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
