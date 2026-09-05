import { SystemConfig } from "../models";
import { ApiError } from "../lib/errors";

export interface AirtimeCashNetworkConfig {
  network: string;
  /** Platform number the user transfers airtime to. */
  receivingNumber: string | null;
  /** Conversion rate as a percent (e.g. 80 = 80%). */
  conversionRate: number;
  minAmount: number;
  maxAmount: number;
  /** Flat fee in naira applied per request. */
  fee: number;
  enabled: boolean;
}

export const DEFAULT_NETWORKS = ["MTN", "Airtel", "Glo", "9mobile"];

export const DEFAULT_AIRTIME_CASH_NETWORKS: AirtimeCashNetworkConfig[] = [
  { network: "MTN", receivingNumber: null, conversionRate: 80, minAmount: 1000, maxAmount: 50000, fee: 0, enabled: true },
  { network: "Airtel", receivingNumber: null, conversionRate: 80, minAmount: 1000, maxAmount: 50000, fee: 0, enabled: true },
  { network: "Glo", receivingNumber: null, conversionRate: 80, minAmount: 1000, maxAmount: 50000, fee: 0, enabled: true },
  { network: "9mobile", receivingNumber: null, conversionRate: 80, minAmount: 1000, maxAmount: 50000, fee: 0, enabled: true },
];

export const DEFAULT_CONFIG: Record<string, unknown> = {
  kycThreshold: 20000,
  kycRequiredFrom: 20000,
  a2cFeePercent: 5,
  a2cMinAmount: 100,
  a2cMaxAmount: 5000,
  airtimeCashNetworks: DEFAULT_AIRTIME_CASH_NETWORKS,
  maintenanceMode: false,
  smsNotifications: false,
  purchaseLimits: {
    AIRTIME: { min: 50, max: 100000 },
    DATA: { min: 50, max: 1000000 },
    ELECTRICITY: { min: 500, max: 10000000 },
    CABLE: { min: 100, max: 1000000 },
    EXAM_PIN: { min: 100, max: 1000000 },
  },
};

export async function getSystemConfig(key: string, fallback?: unknown): Promise<unknown> {
  const cfg = await SystemConfig.findOne({ key }).lean();
  if (cfg) return cfg.value;
  if (fallback !== undefined) return fallback;
  return DEFAULT_CONFIG[key];
}

export async function setSystemConfig(key: string, value: unknown): Promise<unknown> {
  const doc = await SystemConfig.findOneAndUpdate(
    { key },
    { $set: { value } },
    { upsert: true, new: true }
  );
  return doc.value;
}

export async function getAllSystemConfig(): Promise<Record<string, unknown>> {
  const docs = await SystemConfig.find().lean();
  const merged: Record<string, unknown> = { ...DEFAULT_CONFIG };
  for (const doc of docs) merged[doc.key] = doc.value;
  return merged;
}

export async function seedDefaultSystemConfig(): Promise<void> {
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    await SystemConfig.findOneAndUpdate(
      { key },
      { $set: { value } },
      { upsert: true }
    );
  }
}

/**
 * Per-service purchase amount bounds (limits) from SystemConfig, falling back
 * to the static schema bounds used by the original backend.
 */
export async function getPurchaseLimits(serviceType: string): Promise<{ min: number; max: number }> {
  const limits = (await getSystemConfig("purchaseLimits", DEFAULT_CONFIG.purchaseLimits)) as {
    [k: string]: { min: number; max: number };
  };
  const entry = limits?.[serviceType];
  if (entry && typeof entry.min === "number") {
    return { min: entry.min, max: typeof entry.max === "number" ? entry.max : Infinity };
  }
  return { min: 0, max: Infinity };
}

export async function isUnderMaintenance(): Promise<boolean> {
  return Boolean(await getSystemConfig("maintenanceMode", false));
}

/**
 * Returns the per-network Airtime-to-Cash configuration (receiving number,
 * conversion rate, min/max, fee, enabled). Falls back to defaults.
 */
export async function getAirtimeCashNetworks(): Promise<AirtimeCashNetworkConfig[]> {
  const value = await getSystemConfig("airtimeCashNetworks");
  if (Array.isArray(value)) {
    return DEFAULT_NETWORKS.map((network) => {
      const found = value.find((v) => v && v.network === network);
      const fallback = DEFAULT_AIRTIME_CASH_NETWORKS.find((d) => d.network === network);
      return {
        network,
        receivingNumber: found?.receivingNumber ?? fallback?.receivingNumber ?? null,
        conversionRate: Number(found?.conversionRate ?? fallback?.conversionRate ?? 80),
        minAmount: Number(found?.minAmount ?? fallback?.minAmount ?? 1000),
        maxAmount: Number(found?.maxAmount ?? fallback?.maxAmount ?? 50000),
        fee: Number(found?.fee ?? fallback?.fee ?? 0),
        enabled: found?.enabled ?? fallback?.enabled ?? true,
      };
    });
  }
  return DEFAULT_AIRTIME_CASH_NETWORKS;
}

/**
 * Reads a single network's Airtime-to-Cash config. Throws a 404/400 if the
 * network is unknown or disabled.
 */
export async function getAirtimeCashNetwork(network: string): Promise<AirtimeCashNetworkConfig> {
  const networks = await getAirtimeCashNetworks();
  const cfg = networks.find((n) => n.network === network);
  if (!cfg) {
    throw new ApiError(400, "Unknown network provider", "VALIDATION_ERROR");
  }
  if (!cfg.enabled) {
    throw new ApiError(400, "Airtime-to-cash is currently disabled for this network", "SERVICE_DISABLED");
  }
  return cfg;
}