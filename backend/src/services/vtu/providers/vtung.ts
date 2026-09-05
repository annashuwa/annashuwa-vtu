import { GenericHttpProvider } from "../adapter";
import { httpOrMock, defaultMapper, NETWORK_CODE_MAP } from "./shared";
import { VTUNG_BASE_URL, VTUNG_TOKEN } from "../../../config";

/**
 * VTU.ng provider.
 *
 * The public VTU.ng API authenticates with `AuthorizationCode` (and client id
 * header). Because the base adapter sends a Bearer token by default, VTU.ng's
 * extraHeaders set `AuthorizationCode: <token>` as a custom header. Adjust to
 * the exact header your VTU.ng account uses.
 *
 * Contract (representative):
 *   POST {base}/api/topup/airtime   { network, phone, amount }
 *   POST {base}/api/topup/data      { network, phone, plan, size, amount }
 *   POST {base}/api/electricity     { providerCode, meterNumber, meterType, amount }
 *   POST {base}/api/electricity/verify { providerCode, meterNumber, meterType }
 *   POST {base}/api/cable           { providerCode, smartCard, packageName, amount }
 *   POST {base}/api/cable/verify    { providerCode, smartCard }
 *   POST {base}/api/exam-pin        { category, quantity }
 * Responses: { success, status, message, id, data }
 * Auth: AuthorizationCode header (set below).
 */
export class VTUNgProvider extends GenericHttpProvider {
  constructor() {
    super(
      httpOrMock(
        {
          id: "vtung",
          name: "VTU.ng",
          defaultNetworkCodeMap: NETWORK_CODE_MAP,
          // VTU.ng expects the token in a named header and often a client id.
          // Adjust these to your VTU.ng credentials.
          extraHeaders: VTUNG_TOKEN ? { AuthorizationCode: VTUNG_TOKEN } : undefined,
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
            return defaultMapper(raw, "Transaction processed by VTU.ng");
          },
        },
        // Pass empty string for the Bearer token so no default Authorization
        // header conflicts with AuthorizationCode above.
        VTUNG_BASE_URL,
        ""
      )
    );
  }
}
