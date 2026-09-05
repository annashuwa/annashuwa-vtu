export type VtuStatus = "SUCCESSFUL" | "FAILED" | "PENDING";

export const PROVIDER_IDS = [
  "bilalsadasub",
  "rapidbills",
  "cheapdatahub",
  "vtung",
  "vtpass",
] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number] | "mock";

export interface ProviderHealth {
  provider: ProviderId;
  ok: boolean;
  latencyMs: number;
  checkedAt: string;
  error?: string;
}

export interface ProviderCapabilities {
  airtime: boolean;
  data: boolean;
  electricity: boolean;
  cable: boolean;
  examPins: boolean;
}

export interface VtuResponse {
  status: VtuStatus;
  message: string;
  data?: Record<string, unknown>;
}

export interface AirtimeRequest {
  network: string;
  phone: string;
  amount: number;
}

export interface DataRequest {
  network: string;
  phone: string;
  planName: string;
  size: string;
  amount: number;
}

export interface ElectricityRequest {
  providerCode: string;
  meterNumber: string;
  meterType: string;
  amount: number;
}

export interface MeterLookupRequest {
  providerCode: string;
  meterNumber: string;
  meterType: string;
}

export interface CableRequest {
  providerCode: string;
  smartCard: string;
  packageName: string;
  amount: number;
}

export interface SmartCardLookupRequest {
  providerCode: string;
  smartCard: string;
}

export interface ExamPinRequest {
  category: string;
  quantity: number;
}

export interface MeterLookupResult {
  success: boolean;
  name?: string;
  address?: string;
  message?: string;
}

export interface SmartCardLookupResult {
  success: boolean;
  name?: string;
  message?: string;
}

export type ExamPinResponse = {
  status: VtuStatus;
  message: string;
  pins?: string[];
  serials?: string[];
  data?: Record<string, unknown>;
};

export interface VtuProvider {
  readonly name: string;
  readonly id: ProviderId;
  readonly capabilities: ProviderCapabilities;
  healthCheck(): Promise<ProviderHealth>;
  buyAirtime(req: AirtimeRequest): Promise<VtuResponse>;
  buyData(req: DataRequest): Promise<VtuResponse>;
  lookupMeter(req: MeterLookupRequest): Promise<MeterLookupResult>;
  buyElectricity(req: ElectricityRequest): Promise<VtuResponse>;
  lookupSmartCard(req: SmartCardLookupRequest): Promise<SmartCardLookupResult>;
  subscribeCable(req: CableRequest): Promise<VtuResponse>;
  purchaseExamPin(req: ExamPinRequest): Promise<ExamPinResponse>;
  /** Query the provider for the final status/resolution of a previously submitted transaction. */
  checkStatus(reference: string): Promise<VtuResponse>;
}