import { GenericHttpProvider } from "../adapter";
import { httpOrMock, defaultMapper, NETWORK_CODE_MAP } from "./shared";
import { CHEAPDATAHUB_BASE_URL, CHEAPDATAHUB_TOKEN } from "../../../config";

/**
 * CheapDataHub VTU provider.
 *
 * Contract (representative, per CheapDataHub's public API):
 *   POST {base}/api/topup/airtime   { network, phone, amount }
 *   POST {base}/api/topup/data      { network, phone, plan, size, amount }
 *   POST {base}/api/electricity     { providerCode, meterNumber, meterType, amount }
 *   POST {base}/api/electricity/verify { providerCode, meterNumber, meterType }
 *   POST {base}/api/cable           { providerCode, smartCard, packageName, amount }
 *   POST {base}/api/cable/verify    { providerCode, smartCard }
 *   POST {base}/api/exam-pin        { category, quantity }
 * Responses: { success, status, message, reference, data }
 * Auth: Authorization: Bearer <token>
 */
export class CheapDataHubProvider extends GenericHttpProvider {
  constructor() {
    super(
      httpOrMock(
        {
          id: "cheapdatahub",
          name: "CheapDataHub",
          defaultNetworkCodeMap: NETWORK_CODE_MAP,
          endpoints: {
            airtime: "/api/topup/airtime",
            data: "/api/topup/data",
            electricity: "/api/electricity",
            electricityVerify: "/api/electricity/verify",
            cable: "/api/cable",
            cableVerify: "/api/cable/verify",
            examPin: "/api/exam-pin",
            health: "/api/account/balance",
          },
          capabilities: { airtime: true, data: true, electricity: true, cable: true, examPins: true },
          mapResult: (op, raw) => {
            if (op === "examPin") {
              const pins = Array.isArray((raw as any)?.data?.pins) ? (raw as any).data.pins : [];
              return { ...defaultMapper(raw, "Exam PIN purchase processed"), pins, serials: [] };
            }
            return defaultMapper(raw, "Transaction processed by CheapDataHub");
          },
        },
        CHEAPDATAHUB_BASE_URL,
        CHEAPDATAHUB_TOKEN
      )
    );
  }
}
