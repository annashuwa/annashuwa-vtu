import { GenericHttpProvider } from "../adapter";
import { httpOrMock, defaultMapper, NETWORK_CODE_MAP } from "./shared";
import { RAPIDBILLS_BASE_URL, RAPIDBILLS_TOKEN } from "../../../config";

/**
 * RapidBills VTU provider.
 *
 * Contract (representative, per RapidBills' public VTU API):
 *   POST {base}/v1/airtime        { network, phone, amount }
 *   POST {base}/v1/data           { network, phone, plan, size, amount }
 *   POST {base}/v1/electricity    { providerCode, meterNumber, meterType, amount }
 *   POST {base}/v1/electricity/verify { providerCode, meterNumber, meterType }
 *   POST {base}/v1/cable          { providerCode, smartCard, packageName, amount }
 *   POST {base}/v1/cable/verify   { providerCode, smartCard }
 *   POST {base}/v1/exam-pin       { category, quantity }
 * Responses: { success, status, message, reference, data }
 * Auth: Authorization: Bearer <token>
 */
export class RapidBillsProvider extends GenericHttpProvider {
  constructor() {
    super(
      httpOrMock(
        {
          id: "rapidbills",
          name: "RapidBills",
          defaultNetworkCodeMap: NETWORK_CODE_MAP,
          endpoints: {
            airtime: "/v1/airtime",
            data: "/v1/data",
            electricity: "/v1/electricity",
            electricityVerify: "/v1/electricity/verify",
            cable: "/v1/cable",
            cableVerify: "/v1/cable/verify",
            examPin: "/v1/exam-pin",
            health: "/v1/account/balance",
          },
          capabilities: { airtime: true, data: true, electricity: true, cable: true, examPins: true },
          mapResult: (op, raw) => {
            if (op === "examPin") {
              const pins = Array.isArray((raw as any)?.data?.pins) ? (raw as any).data.pins : [];
              return { ...defaultMapper(raw, "Exam PIN purchase processed"), pins, serials: [] };
            }
            return defaultMapper(raw, "Transaction processed by RapidBills");
          },
        },
        RAPIDBILLS_BASE_URL,
        RAPIDBILLS_TOKEN
      )
    );
  }
}
