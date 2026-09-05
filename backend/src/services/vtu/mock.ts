import { MOCK_DELAY_MS, MOCK_FAIL_RATE, VTU_FORCE_MOCK_FAIL } from "../../config";
import { sleep } from "../../lib/utils";
import { ProviderError } from "../../lib/errors";
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
  ProviderHealth,
} from "./types";

function failRate(): number {
  const raw = Number(MOCK_FAIL_RATE ?? 0.1);
  return Math.min(0.9, Math.max(0, raw));
}

function delay(): Promise<void> {
  const ms = Number(MOCK_DELAY_MS ?? 1200);
  return sleep(Math.min(5000, ms));
}

function stableSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function decideStatus(input: string): "SUCCESSFUL" | "FAILED" | "PENDING" {
  const seed = stableSeed(input);
  const roll = seed % 100;
  const rate = Math.round(failRate() * 100);
  const pendingRate = Math.min(15, Math.max(5, Math.round(rate / 3)));
  if (roll < rate) return "FAILED";
  if (roll < rate + pendingRate) return "PENDING";
  return "SUCCESSFUL";
}

function mockName(source: string): string {
  const names = [
    "ALHAJI ABDULLAHI MUHAMMED",
    "MRS GRACE EZENWA",
    "CHIEF PATRICK OBI",
    "HAJIA FATIMA SANI",
    "DR KELECHI NWANKWO",
    "MR TUNDE BALOGUN",
    "MRS NKEIRU CHUKWU",
    "ALH. IBRAHIM DANJUMA",
  ];
  const idx = stableSeed(source) % names.length;
  return names[idx];
}

function mockAddress(source: string): string {
  const addrs = [
    "12, IKEJA INDUSTRIAL ESTATE, LAGOS",
    "7A, GADAN TAMBURAU ROAD, KANO",
    "23, ZIK AVENUE, ENUGU",
    "45, OBA AKRAN, IKEJA",
    "9, BAUCHI ROAD, JOS",
  ];
  return addrs[stableSeed(source) % addrs.length];
}

function genToken(providerCode: string, amount: number, seed: string): string {
  const units = Math.round(amount * 1000) + stableSeed(providerCode + seed);
  const a = (units * 17) % 10000;
  const b = (units * 31) % 10000;
  const c = (units * 47) % 10000;
  const d = (units * 71) % 10000;
  return `${a.toString().padStart(4, "0")} ${b.toString().padStart(4, "0")} ${c.toString().padStart(4, "0")} ${d.toString().padStart(4, "0")}`;
}

function genExamPin(seed: string): string {
  const s = stableSeed(seed);
  return `${String(s).slice(0, 4).padStart(4, "0")}-${String(s * 7).slice(0, 4).padStart(4, "0")}-${String(s * 13).slice(0, 4).padStart(4, "0")}-${String(s * 29).slice(0, 4).padStart(4, "0")}`;
}

/**
 * Simulated VTU provider for localhost development.
 * Produces realistic success / failure / pending outcomes.
 */
export class MockVtuProvider implements VtuProvider {
  readonly name = "ANNASHUWA MOCK VTU";
  readonly id = "mock" as const;
  readonly capabilities = { airtime: true, data: true, electricity: true, cable: true, examPins: true };

  async healthCheck(): Promise<ProviderHealth> {
    return {
      provider: "mock",
      ok: true,
      latencyMs: 0,
      checkedAt: new Date().toISOString(),
    };
  }

  /** Test hook: when VTU_FORCE_MOCK_FAIL=true, paid operations throw hard errors. */
  private guard(): void {
    if (VTU_FORCE_MOCK_FAIL) {
      throw new ProviderError(
        "Simulated provider outage (VTU_FORCE_MOCK_FAIL).",
        this.name,
        "airtime",
        "PROVIDER_ERROR",
        502
      );
    }
  }

  async buyAirtime(req: AirtimeRequest): Promise<VtuResponse> {
    this.guard();
    await delay();
    const status = decideStatus(`airtime-${req.network}-${req.phone}-${req.amount}`);
    if (status === "FAILED") {
      return {
        status,
        message: "Recharge failed. Please verify the phone number and try again.",
        data: { code: "PTN_ERR_4404" },
      };
    }
    if (status === "PENDING") {
      return { status, message: "Recharge is being processed. Your airtime will be delivered shortly.", data: { ref: `MOCK-${req.phone}` } };
    }
    return {
      status,
      message: `Airtime of ₦${req.amount} ${req.network} delivered successfully.`,
      data: { amount: req.amount, network: req.network, phone: req.phone },
    };
  }

  async buyData(req: DataRequest): Promise<VtuResponse> {
    this.guard();
    await delay();
    const status = decideStatus(`data-${req.network}-${req.phone}-${req.size}`);
    if (status === "FAILED") {
      return { status, message: "Data subscription failed. Your funds have been refunded.", data: { code: "DAT_ERR_4455" } };
    }
    if (status === "PENDING") {
      return { status, message: "Data subscription is being processed.", data: { ref: `MOCK-${req.phone}` } };
    }
    return {
      status,
      message: `${req.size} ${req.network} data plan subscribed successfully.`,
      data: { plan: req.planName, size: req.size, network: req.network, phone: req.phone },
    };
  }

  async lookupMeter(req: MeterLookupRequest): Promise<MeterLookupResult> {
    await delay();
    if (req.meterNumber.length < 6) return { success: false, message: "Meter number is invalid" };
    return {
      success: true,
      name: mockName(req.providerCode + req.meterNumber),
      address: mockAddress(req.providerCode + req.meterNumber),
    };
  }

  async buyElectricity(req: ElectricityRequest): Promise<VtuResponse> {
    this.guard();
    await delay();
    const status = decideStatus(`elec-${req.providerCode}-${req.meterNumber}-${req.amount}`);
    if (status === "FAILED") {
      return { status, message: "Electricity payment failed. Your funds have been refunded.", data: { code: "ELC_ERR_4501" } };
    }
    if (status === "PENDING") {
      return { status, message: "Electricity payment is being processed.", data: { ref: `MOCK-${req.meterNumber}` } };
    }
    return {
      status,
      message: `Electricity token vending successful for ${req.meterNumber}.`,
      data: {
        token: genToken(req.providerCode, req.amount, req.meterNumber),
        units: Number((req.amount / 4.31).toFixed(2)),
        provider: req.providerCode,
      },
    };
  }

  async lookupSmartCard(req: SmartCardLookupRequest): Promise<SmartCardLookupResult> {
    await delay();
    if (req.smartCard.length < 6) return { success: false, message: "Smart card number is invalid" };
    return { success: true, name: mockName(req.providerCode + req.smartCard) };
  }

  async subscribeCable(req: CableRequest): Promise<VtuResponse> {
    this.guard();
    await delay();
    const status = decideStatus(`cable-${req.providerCode}-${req.smartCard}-${req.packageName}`);
    if (status === "FAILED") {
      return { status, message: "Cable subscription failed. Your funds have been refunded.", data: { code: "CBL_ERR_4602" } };
    }
    if (status === "PENDING") {
      return { status, message: "Cable subscription is being processed.", data: { ref: `MOCK-${req.smartCard}` } };
    }
    return {
      status,
      message: `${req.packageName} subscription activated successfully.`,
      data: { package: req.packageName, smartCard: req.smartCard, provider: req.providerCode },
    };
  }

  async purchaseExamPin(req: ExamPinRequest): Promise<ExamPinResponse> {
    this.guard();
    await delay();
    const status = decideStatus(`exam-${req.category}-${req.quantity}`);
    if (status === "FAILED") {
      return { status, message: "PIN purchase failed. Your funds have been refunded.", data: { code: "PIN_ERR_4703" } };
    }
    if (status === "PENDING") {
      return { status, message: "PIN purchase is being processed.", data: { ref: `MOCK-${req.category}` } };
    }
    const pins: string[] = [];
    const serials: string[] = [];
    for (let i = 0; i < req.quantity; i++) {
      pins.push(genExamPin(`${req.category}-${i}-${Math.random()}`));
      serials.push(`SER-${String(stableSeed(`${req.category}-${i}`)).slice(0, 8)}`);
    }
    return {
      status,
      message: `${req.quantity} ${req.category} PIN${req.quantity > 1 ? "s" : ""} generated successfully.`,
      pins,
      serials,
      data: { category: req.category, quantity: req.quantity },
    };
  }

  /** The simulator resolves pending transactions as delivered. */
  async checkStatus(_reference: string): Promise<VtuResponse> {
    await delay();
    return {
      status: "SUCCESSFUL",
      message: "Transaction confirmed as delivered by provider.",
      data: { resolved: true },
    };
  }
}