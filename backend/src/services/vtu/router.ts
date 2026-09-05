import type { ProviderId } from "./types";
import { providerManager } from "./providers/registry";
import {
  profitForAirtime,
  profitForProduct,
  type ProfitBreakdown,
} from "./pricing";

export type RouteServiceType = "AIRTIME" | "DATA" | "ELECTRICITY" | "CABLE" | "EXAM_PIN";

type CapabilityKey = "airtime" | "data" | "electricity" | "cable" | "examPins";

const SERVICE_CAPABILITY: Record<RouteServiceType, CapabilityKey> = {
  AIRTIME: "airtime",
  DATA: "data",
  ELECTRICITY: "electricity",
  CABLE: "cable",
  EXAM_PIN: "examPins",
};

export interface RouteCandidate {
  providerId: ProviderId;
  name: string;
  live: boolean;
  cost: number | null;
  profit: number | null;
  marginRate: number | null;
}

export interface RouteDecision {
  serviceType: RouteServiceType;
  candidates: RouteCandidate[];
  selected: RouteCandidate | null;
  fallbacks: RouteCandidate[];
  preferred: boolean;
}

export interface RouteInput {
  serviceType: RouteServiceType;
  /** Selling amount in naira (used for airtime). */
  amount?: number;
  /** Plan product for data/cable/exam-pin profit computation. */
  product?: {
    price?: number;
    costPrice?: number | null;
    providerPlans?: Record<string, { code?: string; cost?: number }> | null;
  } | null;
  /** Force a specific provider (bypass ranking). */
  preferredProvider?: string;
  /** Providers to skip (e.g. ones already attempted during failover). */
  exclude?: ProviderId[];
}

function computeProfit(
  serviceType: RouteServiceType,
  providerId: ProviderId,
  input: RouteInput
): ProfitBreakdown {
  if (serviceType === "AIRTIME" && input.amount != null) {
    return profitForAirtime(input.amount, providerId);
  }
  const selling = input.product?.price ?? input.amount ?? 0;
  return profitForProduct(selling, input.product ?? null, providerId);
}

export function routeProviders(input: RouteInput): RouteDecision {
  const capKey = SERVICE_CAPABILITY[input.serviceType];
  const exclude = new Set(input.exclude ?? []);
  const entries = providerManager.list();
  const preferred = input.preferredProvider ?? undefined;

  const candidates: RouteCandidate[] = entries
    .filter((e) => e.live) // mock is always live; http-configured providers are live
    .filter((e) => !exclude.has(e.id))
    .map((e) => {
      const provider = providerManager.getProvider(e.id);
      const caps = provider.capabilities as unknown as Record<CapabilityKey, boolean>;
      return { e, provider, supported: caps[capKey] === true };
    })
    .filter((x) => x.supported)
    .map(({ e, provider }) => {
      const pb = computeProfit(input.serviceType, e.id, input);
      return {
        providerId: e.id,
        name: provider.name,
        live: true,
        cost: pb.cost,
        profit: pb.profit,
        marginRate: pb.marginRate,
      } satisfies RouteCandidate;
    });

  if (candidates.length === 0) {
    return {
      serviceType: input.serviceType,
      candidates: [],
      selected: null,
      fallbacks: [],
      preferred: false,
    };
  }

  const ranked = [...candidates].sort((a, b) => {
    // non-null cost first (cheaper first); null-cost ranked after known cost
    const aCost = a.cost == null ? Number.POSITIVE_INFINITY : a.cost;
    const bCost = b.cost == null ? Number.POSITIVE_INFINITY : b.cost;
    if (aCost !== bCost) return aCost - bCost;
    return (b.profit ?? -Infinity) - (a.profit ?? -Infinity);
  });

  let selected: RouteCandidate;
  let preferredFlag = false;
  if (preferred) {
    const pref = ranked.find((c) => c.providerId === preferred);
    if (pref) {
      selected = pref;
      preferredFlag = true;
    } else {
      selected = ranked[0];
    }
  } else {
    selected = ranked[0];
  }

  const fallbacks = ranked.filter((c) => c.providerId !== selected.providerId);
  return {
    serviceType: input.serviceType,
    candidates: ranked,
    selected,
    fallbacks,
    preferred: preferredFlag,
  };
}

/** Convenience: returns the provider id the router would pick. */
export function selectProvider(input: RouteInput): ProviderId | null {
  return routeProviders(input).selected?.providerId ?? null;
}
