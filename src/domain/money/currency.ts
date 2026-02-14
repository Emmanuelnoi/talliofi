export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CAD',
  'AUD',
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
};

export function getCurrencySymbol(currency: CurrencyCode): string {
  return CURRENCY_SYMBOLS[currency] ?? '$';
}

/** BCP 47 locale tags used for number formatting per currency. */
export const CURRENCY_LOCALES: Record<CurrencyCode, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  CAD: 'en-CA',
  AUD: 'en-AU',
};

export function getCurrencyLocale(currency: CurrencyCode): string {
  return CURRENCY_LOCALES[currency] ?? 'en-US';
}

export interface ExchangeRates {
  readonly baseCurrency: CurrencyCode;
  readonly rates: Partial<Record<CurrencyCode, number>>;
  readonly updatedAt: string;
}

export interface ExchangeRateRecord extends ExchangeRates {
  readonly id: string;
  readonly planId: string;
}
