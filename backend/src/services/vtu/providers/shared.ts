import type { ProviderHttpConfig } from "../adapter";
import { normalizeStatus } from "../adapter";
import type { VtuResponse } from "../types";

export const NETWORK_CODE_MAP: Record<string, string> = {
  MTN: "MTN",
  Airtel: "AIRTEL",
  Glo: "GLO",
  "9mobile": "9MOBILE",
};

function extractMessage(raw: unknown): string {
  const o = (raw ?? {}) as Record<string, any>;
  return o.message ?? o.msg ?? o.description ?? o.error ?? "Provider request processed";
}

function extractRef(raw: unknown): string | undefined {
  const o = (raw ?? {}) as Record<string, any>;
  return o.ref ?? o.reference ?? o.transactionRef ?? o.txnRef ?? o.requestId ?? o.orderId;
}

function firstOf(raw: unknown, keys: string[]): unknown {
  const o = (raw ?? {}) as Record<string, any>;
  for (const k of keys) {
    if (o[k] !== undefined && o[k] !== null) return o[k];
  }
  return undefined;
}

/**
 * Normalizes a raw provider payload into the canonical VtuResponse shape.
 * Expects the wrapped `success` flag, a status string, and optional nested data.
 */
export function defaultMapper(raw: unknown, fallbackMsg: string): VtuResponse {
  const o = (raw ?? {}) as Record<string, any>;
  const dataObj = (o.data && typeof o.data === "object" ? o.data : o) as Record<string, any>;
  const ok = o.success === true || o.status === "success";
  const status = normalizeStatus(
    firstOf(raw, ["status", "state", "transactionStatus", "message"]) as string | undefined,
    ok ? "SUCCESSFUL" : "FAILED"
  );
  return {
    status,
    message: (extractMessage(raw) as string) || fallbackMsg,
    data: {
      ...dataObj,
      providerReference: extractRef(raw) ?? extractRef(dataObj),
    },
  };
}

/** Builds a lazy ProviderHttpConfig, choosing http mode when a base URL is set. */
export function httpOrMock(
  base: Omit<ProviderHttpConfig, "mode" | "baseUrl" | "apiToken" | "mapResult"> & {
    id: ProviderHttpConfig["id"];
    name: string;
    mapResult: ProviderHttpConfig["mapResult"];
  },
  baseUrl: string,
  apiToken: string
): ProviderHttpConfig {
  if (!baseUrl) {
    return mockConfig(base.id, base.name);
  }
  return {
    ...base,
    mode: "http",
    baseUrl,
    apiToken: apiToken || undefined,
  } as ProviderHttpConfig;
}

export function mockConfig(id: ProviderHttpConfig["id"], name: string): ProviderHttpConfig {
  return {
    id,
    name,
    mode: "mock",
    baseUrl: undefined,
    apiToken: undefined,
    defaultNetworkCodeMap: NETWORK_CODE_MAP,
    endpoints: {},
    capabilities: { airtime: false, data: false, electricity: false, cable: false, examPins: false },
    mapResult: () => ({
      status: "PENDING",
      message: `${name} is not configured for live traffic.`,
      data: { mode: "mock" },
    }),
  };
}
