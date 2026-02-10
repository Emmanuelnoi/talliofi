export type FactorStatus = 'verified' | 'unverified' | 'pending' | string;

export interface MfaFactor {
  id: string;
  status?: FactorStatus;
  type?: string;
  factorType?: string;
  friendly_name?: string;
  created_at?: string;
}

export interface MfaFactorListData {
  all?: MfaFactor[];
  totp?: MfaFactor[];
  phone?: MfaFactor[];
}

function isFactorListData(value: unknown): value is MfaFactorListData {
  return typeof value === 'object' && value !== null;
}

function isMfaFactor(value: unknown): value is MfaFactor {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id?: unknown }).id === 'string'
  );
}

export function extractFactors(data: unknown): MfaFactor[] {
  if (!isFactorListData(data)) return [];
  const candidates = [data.totp, data.all, data.phone];
  for (const list of candidates) {
    if (Array.isArray(list)) {
      return list.filter(isMfaFactor);
    }
  }
  return [];
}
