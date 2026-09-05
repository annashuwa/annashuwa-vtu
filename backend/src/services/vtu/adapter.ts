import { ProviderError } from "../../lib/errors";
import { normalizeProviderError } from "../../lib/error-codes";
import { logError, logDebug } from "../../lib/logger";
import { VTU_HTTP_TIMEOUT_MS } from "../../config";
import type {
  AirtimeRequest,
  DataRequest,
  ElectricityRequest,
  MeterLookupRequest,
  MeterLookupResult,
  CableRequest,
  SmartCardLookupRequest,
  SmartCardLookupResult,
  ExamPinRequest,
  ExamPinResponse,
  ProviderCapabilities,
  ProviderHealth,
  ProviderId,
  VtuResponse,
} from "./types";

/**
 * Shared per-provider configuration. Each real provider documents its actual
 * public contract here (endpoints, auth header, code maps, response mapping).
 * Concrete providers subclass GenericHttpProvider and supply a config.
 */
export interface ProviderHttpConfig {
  readonly id: ProviderId;
  readonly name: string;
  readonly baseUrl?: string;
  readonly apiToken?: string;
  readonly defaultNetworkCodeMap: Record<string, string>;
  readonly electricityDefaultFee?: number;
  readonly endpoints: {
    airtime?: string;
    data?: string;
    electricity?: string;
    electricityVerify?: string;
    cable?: string;
    cableVerify?: string;
    examPin?: string;
    status?: string;
    health?: string;
  };
  readonly extraHeaders?: Record<string, string>;
  readonly mode: "mock" | "http";
  readonly capabilities: ProviderCapabilities;
  /** Map a raw provider payload into the normalized VtuResponse. */
  mapResult(operation: Operation, raw: unknown): VtuResponse;
  mapStatus?(status: string): VtuResponse["status"];
}

export type Operation =
  | "airtime"
  | "data"
  | "electricity"
  | "electricityVerify"
  | "cable"
  | "cableVerify"
  | "examPin"
  | "status"
  | "health";

export abstract class GenericHttpProvider {
  readonly id: ProviderId;
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  protected readonly cfg: ProviderHttpConfig;

  constructor(cfg: ProviderHttpConfig) {
    this.cfg = cfg;
    this.id = cfg.id;
    this.name = cfg.name;
    this.capabilities = cfg.capabilities;
  }

  protected usesMock(): boolean {
    return this.cfg.mode === "mock" || !this.cfg.baseUrl;
  }

  private authHeaders(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.cfg.apiToken) {
      h.Authorization = `Bearer ${this.cfg.apiToken}`;
    }
    for (const [k, v] of Object.entries(this.cfg.extraHeaders ?? {})) {
      h[k] = v;
    }
    return h;
  }

  protected networkCode(network: string): string {
    return this.cfg.defaultNetworkCodeMap[network] ?? network;
  }

  protected async post<T>(path: string, body: unknown, op: Operation): Promise<T> {
    if (this.usesMock()) {
      throw new ProviderError(
        `${this.name} is in mock mode and cannot reach the live network.`,
        this.name,
        op,
        "PROVIDER_UNAVAILABLE",
        503
      );
    }
    const url = `${this.cfg.baseUrl!.replace(/\/+$/, "")}${path}`;
    let res: Response;
    const started = Date.now();
    // Bound every upstream call: a hung provider must fail fast (failover /
    // reconciliation take over) instead of holding the request forever.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VTU_HTTP_TIMEOUT_MS);
    try {
      res = await fetch(url, { method: "POST", headers: this.authHeaders(), body: JSON.stringify(body), signal: controller.signal });
    } catch (err) {
      const msg = (err as Error).name === "AbortError" ? `timed out after ${VTU_HTTP_TIMEOUT_MS}ms` : (err as Error).message;
      const code = (err as Error).name === "AbortError" ? "PROVIDER_TIMEOUT" : "PROVIDER_ERROR";
      const status = (err as Error).name === "AbortError" ? 504 : 502;
      logError("provider_network_error", { provider: this.name, op, message: msg });
      throw new ProviderError(`Unable to reach ${this.name}: ${msg}`, this.name, op, code, status);
    } finally {
      clearTimeout(timeout);
    }
    const latencyMs = Date.now() - started;
    logDebug("provider_response", { provider: this.name, op, status: res.status, latencyMs });
    let raw: unknown = null;
    try {
      raw = await res.json();
    } catch {
      raw = null;
    }
    if (!res.ok && raw === null) {
      throw new ProviderError(
        `${this.name} responded with HTTP ${res.status}`,
        this.name,
        op,
        normalizeProviderError(this.name, op, res.status),
        res.status
      );
    }
    return raw as T;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = Date.now();
    try {
      await this.post(this.cfg.endpoints.health ?? "/health", {}, "health");
      return {
        provider: this.id,
        ok: true,
        latencyMs: Date.now() - started,
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        provider: this.id,
        ok: false,
        latencyMs: Date.now() - started,
        checkedAt: new Date().toISOString(),
        error: (err as Error).message,
      };
    }
  }

  async buyAirtime(req: AirtimeRequest): Promise<VtuResponse> {
    const body = { network: this.networkCode(req.network), phone: req.phone, amount: req.amount };
    const raw = await this.post(this.cfg.endpoints.airtime ?? "/airtime", body, "airtime");
    return this.cfg.mapResult("airtime", raw);
  }

  async buyData(req: DataRequest): Promise<VtuResponse> {
    const body = {
      network: this.networkCode(req.network),
      phone: req.phone,
      plan: req.planName,
      size: req.size,
      amount: req.amount,
    };
    const raw = await this.post(this.cfg.endpoints.data ?? "/data", body, "data");
    return this.cfg.mapResult("data", raw);
  }

  async lookupMeter(req: MeterLookupRequest): Promise<MeterLookupResult> {
    if (this.usesMock()) {
      throw new ProviderError(`${this.name} is in mock mode.`, this.name, "electricityVerify", "PROVIDER_UNAVAILABLE", 503);
    }
    const body = { providerCode: this.networkCode(req.providerCode), meterNumber: req.meterNumber, meterType: req.meterType };
    const raw = await this.post(this.cfg.endpoints.electricityVerify ?? "/electricity/verify", body, "electricityVerify");
    return this.mapLookup(raw);
  }

  async buyElectricity(req: ElectricityRequest): Promise<VtuResponse> {
    const body = {
      providerCode: this.networkCode(req.providerCode),
      meterNumber: req.meterNumber,
      meterType: req.meterType,
      amount: req.amount,
    };
    const raw = await this.post(this.cfg.endpoints.electricity ?? "/electricity", body, "electricity");
    return this.cfg.mapResult("electricity", raw);
  }

  async lookupSmartCard(req: SmartCardLookupRequest): Promise<SmartCardLookupResult> {
    if (this.usesMock()) {
      throw new ProviderError(`${this.name} is in mock mode.`, this.name, "cableVerify", "PROVIDER_UNAVAILABLE", 503);
    }
    const body = { providerCode: this.networkCode(req.providerCode), smartCard: req.smartCard };
    const raw = await this.post(this.cfg.endpoints.cableVerify ?? "/cable/verify", body, "cableVerify");
    return this.mapCardLookup(raw);
  }

  async subscribeCable(req: CableRequest): Promise<VtuResponse> {
    const body = {
      providerCode: this.networkCode(req.providerCode),
      smartCard: req.smartCard,
      packageName: req.packageName,
      amount: req.amount,
    };
    const raw = await this.post(this.cfg.endpoints.cable ?? "/cable", body, "cable");
    return this.cfg.mapResult("cable", raw);
  }

  async purchaseExamPin(req: ExamPinRequest): Promise<ExamPinResponse> {
    const raw = await this.post(this.cfg.endpoints.examPin ?? "/exam-pin", { category: req.category, quantity: req.quantity }, "examPin");
    // Preserve the pins/serials produced by the provider-specific mapper.
    // (Wiping them here would deliver empty PINs to paying customers.)
    const mapped = this.cfg.mapResult("examPin", raw) as Partial<ExamPinResponse>;
    return {
      status: mapped.status ?? "PENDING",
      message: mapped.message ?? "",
      data: mapped.data,
      pins: mapped.pins,
      serials: mapped.serials,
    };
  }

  /**
   * Queries the upstream provider for the final resolution of a submitted
   * transaction. Returns PENDING when the provider doesn't support status
   * lookups or is in mock mode, so the reconciliation job can decide whether
   * to keep retrying or refund after the max-age window.
   */
  async checkStatus(reference: string): Promise<VtuResponse> {
    if (this.usesMock()) {
      return { status: "PENDING", message: `${this.name} is in mock mode and cannot verify status.`, data: { mode: "mock" } };
    }
    try {
      const raw = await this.post(this.cfg.endpoints.status ?? "/status", { reference }, "status");
      return this.cfg.mapResult("status", raw);
    } catch {
      return { status: "PENDING", message: `${this.name} status lookup unavailable.`, data: { mode: "mock" } };
    }
  }

  private mapLookup(raw: unknown): MeterLookupResult {
    if (this.isFailure(raw)) return { success: false, message: this.extractMessage(raw) };
    const o = (raw ?? {}) as Record<string, any>;
    return {
      success: true,
      name: o.name ?? o.customerName ?? o.customer_name,
      address: o.address,
    };
  }

  private mapCardLookup(raw: unknown): SmartCardLookupResult {
    if (this.isFailure(raw)) return { success: false, message: this.extractMessage(raw) };
    const o = (raw ?? {}) as Record<string, any>;
    return { success: true, name: o.name ?? o.customerName ?? o.customer_name };
  }

  private isFailure(raw: unknown): boolean {
    const o = (raw ?? {}) as Record<string, any>;
    return o.success === false || o.status === "error" || o.code?.startsWith?.("ERR");
  }

  private extractMessage(raw: unknown): string {
    const o = (raw ?? {}) as Record<string, any>;
    return o.message ?? o.error ?? "Lookup failed";
  }

  protected throwHttpError(res: Response, op: Operation): never {
    throw new ProviderError(
      `${this.name} responded with HTTP ${res.status}`,
      this.name,
      op,
      normalizeProviderError(this.name, op, res.status),
      res.status >= 500 ? 502 : 400
    );
  }
}

export function normalizeStatus(status: string | undefined, fallback: VtuResponse["status"] = "PENDING"): VtuResponse["status"] {
  const s = (status ?? "").toUpperCase();
  if (/SUCCESS|COMPLETE|DELIVERED|APPROVED|OK|00/i.test(s)) return "SUCCESSFUL";
  if (/FAIL|ERROR|DECLINE|REJECTED|INVALID|CANCELLED|CANCEL/i.test(s)) return "FAILED";
  if (/PENDING|PROCESSING|QUEUED|UNKNOWN/i.test(s)) return "PENDING";
  return fallback;
}
