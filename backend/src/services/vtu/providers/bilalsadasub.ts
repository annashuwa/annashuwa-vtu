import { GenericHttpProvider } from "../adapter";
import { httpOrMock, defaultMapper, NETWORK_CODE_MAP } from "./shared";
import { BILALSADASUB_BASE_URL, BILALSADASUB_TOKEN } from "../../../config";

/**
 * Bilalsadasub VTU provider.
 *
 * Contract (representative, per Bilalsadasub's public VTU API):
 *   POST {base}/api/airtime        { network, network_code, phone, amount }
 *   POST {base}/api/data           { network, network_code, phone, plan, size, amount }
 *   POST {base}/api/electricity    { providerCode, meterNumber, meterType, amount }
 *   POST {base}/api/electricity/verify { providerCode, meterNumber, meterType }
 *   POST {base}/api/cable          { providerCode, smartCard, packageName, amount }
 *   POST {base}/api/cable/verify   { providerCode, smartCard }
 *   POST {base}/api/exam-pin       { category, quantity }
 * Responses: { success: boolean, status: string, message, ref, data: {...} }
 * Auth: Authorization: Bearer <token>
 */
const endpoints = {
  airtime: "/api/airtime",
  data: "/api/data",
  electricity: "/api/electricity",
  electricityVerify: "/api/electricity/verify",
  cable: "/api/cable",
  cableVerify: "/api/cable/verify",
  examPin: "/api/exam-pin",
  health: "/api/account/balance",
};

function config() {
  return httpOrMock(
    {
      id: "bilalsadasub",
      name: "Bilalsadasub",
      defaultNetworkCodeMap: NETWORK_CODE_MAP,
      endpoints,
      capabilities: { airtime: true, data: true, electricity: true, cable: true, examPins: true },
      mapResult: (op, raw) => {
        if (op === "examPin") {
          const pins = Array.isArray((raw as any)?.pins)
            ? (raw as any).pins
            : Array.isArray((raw as any)?.data?.pins)
              ? (raw as any).data.pins
              : [];
          return {
            ...defaultMapper(raw, "Exam PIN purchase processed"),
            pins,
            serials: (raw as any)?.serials ?? [],
          };
        }
        return defaultMapper(raw, "Transaction processed by Bilalsadasub");
      },
    },
    BILALSADASUB_BASE_URL,
    BILALSADASUB_TOKEN
  );
}

export class BilalsadasubProvider extends GenericHttpProvider {
  constructor() {
    super(config());
  }
}
