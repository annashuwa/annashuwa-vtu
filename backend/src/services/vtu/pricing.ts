import type { ProviderId } from "./types";

export interface MarginProfile {
  providerId: ProviderId;
  /** Default airtime markup as fraction of selling price kept as profit. */
  marginRate: number;
  enabled: boolean;
}

const DEFAULT_AIRTIME_MARGIN = Number(process.env.AIRTIME_DEFAULT_MARGIN ?? 0.06);

/**
 * Default airtime margin profile. Each upstream provider can carry a different
 * margin rate; these are defaults and can be overridden per-price elsewhere.
 */
export const AIRTIME_MARGIN_PROFILE: MarginProfile[] = [
  { providerId: "bilalsadasub", marginRate: 0.07, enabled: true },
  { providerId: "rapidbills", marginRate: 0.05, enabled: true },
  { providerId: "cheapdatahub", marginRate: 0.06, enabled: true },
  { providerId: "vtung", marginRate: 0.055, enabled: true },
  { providerId: "vtpass", marginRate: 0.06, enabled: true },
];

export function marginRateForAirtime(providerId: ProviderId): number {
  const p = AIRTIME_MARGIN_PROFILE.find((m) => m.providerId === providerId);
  if (p) return p.enabled ? p.marginRate : 0;
  return DEFAULT_AIRTIME_MARGIN;
}

export interface ProfitBreakdown {
  selling: number;
  cost: number | null;
  profit: number | null;
  marginRate: number | null;
}

/**
 * Computes profit for a plan product using the product's per-provider cost map,
 * falling back to a single shared costPrice, or null when no cost is known.
 */
export function profitForProduct(
  selling: number,
  product?: {
    costPrice?: number | null;
    providerPlans?: Record<string, { code?: string; cost?: number }> | null;
  } | null,
  providerId?: ProviderId
): ProfitBreakdown {
  let cost: number | null = null;
  if (providerId && product?.providerPlans?.[providerId]?.cost != null) {
    cost = Number(product.providerPlans[providerId].cost);
  } else if (product?.costPrice != null) {
    cost = Number(product.costPrice);
  }
  if (cost == null) return { selling, cost: null, profit: null, marginRate: null };
  return { selling, cost, profit: selling - cost, marginRate: null };
}

export function profitForAirtime(selling: number, providerId: ProviderId): ProfitBreakdown {
  const marginRate = marginRateForAirtime(providerId);
  const cost = selling * (1 - marginRate);
  return { selling, cost, profit: selling - cost, marginRate };
}
