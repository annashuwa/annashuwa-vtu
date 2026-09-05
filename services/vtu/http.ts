/**
 * HTTP VTU provider adapter.
 *
 * This is the integration seam for real VTU aggregators (e.g. a REST gateway
 * exposing airtime/data/electricity/cable endpoints). Point it at your
 * preferred aggregator with:
 *   MOCK_MODE=false
 *   VTU_API_BASE_URL=https://api.your-aggregator.com
 *   VTU_API_TOKEN=secret
 *
 * Route paths below are placeholders — adjust to match your aggregator's API.
 */
import type {
  VtuProvider,
  VtuResponse,
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
} from "./types";

const BASE = process.env.VTU_API_BASE_URL ?? "";
const TOKEN = process.env.VTU_API_TOKEN ?? "";

async function call(path: string, payload?: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}${path}`, {
    method: payload ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${TOKEN}`,
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`VTU API error ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

function mapStatus(value: string): VtuResponse["status"] {
  const v = value.toLowerCase();
  if (v.includes("fail") || v.includes("error") || v.includes("denied")) return "FAILED";
  if (v.includes("pend") || v.includes("process")) return "PENDING";
  return "SUCCESSFUL";
}

export class HttpVtuProvider implements VtuProvider {
  readonly name = "VTU HTTP Provider";

  async buyAirtime(req: AirtimeRequest): Promise<VtuResponse> {
    const r = await call("/airtime/buy", { network: req.network, phone: req.phone, amount: req.amount });
    return { status: mapStatus(String(r.status)), message: String(r.message ?? "Airtime purchased"), data: r };
  }

  async buyData(req: DataRequest): Promise<VtuResponse> {
    const r = await call("/data/buy", { network: req.network, phone: req.phone, plan: req.planName, size: req.size, amount: req.amount });
    return { status: mapStatus(String(r.status)), message: String(r.message ?? "Data subscribed"), data: r };
  }

  async lookupMeter(req: MeterLookupRequest): Promise<MeterLookupResult> {
    const r = await call(`/electricity/validate?provider=${req.providerCode}&meter=${req.meterNumber}&type=${req.meterType}`);
    return {
      success: Boolean(r.success ?? r. valid ?? r.status === "success"),
      name: String(r.name ?? r.customer_name ?? ""),
      address: r.address ? String(r.address) : undefined,
      message: r.message ? String(r.message) : undefined,
    };
  }

  async buyElectricity(req: ElectricityRequest): Promise<VtuResponse> {
    const r = await call("/electricity/buy", {
      provider: req.providerCode,
      meter: req.meterNumber,
      type: req.meterType,
      amount: req.amount,
    });
    return { status: mapStatus(String(r.status)), message: String(r.message ?? "Electricity paid"), data: r };
  }

  async lookupSmartCard(req: SmartCardLookupRequest): Promise<SmartCardLookupResult> {
    const r = await call(`/cable/validate?provider=${req.providerCode}&card=${req.smartCard}`);
    return {
      success: Boolean(r.success ?? r.status === "success"),
      name: String(r.name ?? r.customer_name ?? ""),
      message: r.message ? String(r.message) : undefined,
    };
  }

  async subscribeCable(req: CableRequest): Promise<VtuResponse> {
    const r = await call("/cable/subscribe", {
      provider: req.providerCode,
      card: req.smartCard,
      package: req.packageName,
      amount: req.amount,
    });
    return { status: mapStatus(String(r.status)), message: String(r.message ?? "Cable subscribed"), data: r };
  }

  async purchaseExamPin(req: ExamPinRequest): Promise<ExamPinResponse> {
    const r = await call("/exam/buy", { category: req.category, quantity: req.quantity });
    return {
      status: mapStatus(String(r.status)),
      message: String(r.message ?? "PIN purchased"),
      pins: Array.isArray(r.pins) ? r.pins.map(String) : undefined,
      serials: Array.isArray(r.serials) ? r.serials.map(String) : undefined,
      data: r,
    };
  }
}