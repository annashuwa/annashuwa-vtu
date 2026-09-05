/**
 * VTU provider abstraction.
 *
 * All third-party VTU integrations (airtime, data, electricity, cable, exam
 * pins) flow through this interface. Swap the implementation via
 * `getVtuProvider()` which honours the MOCK_MODE environment variable.
 */

export type VtuStatus = "SUCCESSFUL" | "FAILED" | "PENDING";

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

export interface ExamPinResult extends VtuResponse {
  pins?: string[];
}

export interface VtuProvider {
  readonly name: string;
  buyAirtime(req: AirtimeRequest): Promise<VtuResponse>;
  buyData(req: DataRequest): Promise<VtuResponse>;
  lookupMeter(req: MeterLookupRequest): Promise<MeterLookupResult>;
  buyElectricity(req: ElectricityRequest): Promise<VtuResponse>;
  lookupSmartCard(req: SmartCardLookupRequest): Promise<SmartCardLookupResult>;
  subscribeCable(req: CableRequest): Promise<VtuResponse>;
  purchaseExamPin(req: ExamPinRequest): Promise<ExamPinResponse>;
}

export type ExamPinResponse = {
  status: VtuStatus;
  message: string;
  pins?: string[];
  serials?: string[];
  data?: Record<string, unknown>;
};