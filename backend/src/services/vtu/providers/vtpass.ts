import { GenericHttpProvider, normalizeStatus } from "../adapter";
import { httpOrMock, NETWORK_CODE_MAP } from "./shared";
import { VTPASS_BASE_URL, VTPASS_TOKEN, VTPASS_USERNAME } from "../../../config";
import type { VtuResponse } from "../types";

function vtpassMapper(raw: unknown, fallbackMsg: string): VtuResponse {
  const o = (raw ?? {}) as Record<string, any>;
  const content = (o.content && typeof o.content === "object" ? o.content : {}) as Record<string, any>;
  const txn =
    (content.transactions && typeof content.transactions === "object" ? content.transactions : content) as Record<string, any> &
      { status?: string; transactionId?: string; reference?: string };
  const status = normalizeStatus(txn.status ?? txn.state, o.code === "000" ? "SUCCESSFUL" : "FAILED");
  return {
    status,
    message: (o.response_description ?? o.message ?? fallbackMsg) as string,
    data: {
      code: o.code,
      transactionReference: txn.transactionId ?? o.requestId,
      ...(txn.token ? { token: txn.token } : {}),
      ...(txn.amount ? { amount: txn.amount } : {}),
    },
  };
}

/**
 * VTpass provider.
 *
 * The public VTpass API authenticates with HTTP Basic (username:password) and
 * wraps every response as { code, response_description, content: {...} }.
 * Set VTPASS_USERNAME / VTPASS_PASSWORD env vars; VTPASS_TOKEN is the password.
 *
 * Contract (representative):
 *   POST {base}/api/airtime        { network, phone, amount }
 *   POST {base}/api/data           { network, phone, plan, size, amount }
 *   POST {base}/api/recharge   ... electricity / cable / exam pin variants
 * Responses: { code, response_description, content: { transactions: { status, ... }, token } }
 * Auth: Basic <base64(username:password)>
 */
export class VTpassProvider extends GenericHttpProvider {
  constructor() {
    const credentials =
      VTPASS_BASE_URL && VTPASS_USERNAME && VTPASS_TOKEN
        ? `Basic ${Buffer.from(`${VTPASS_USERNAME}:${VTPASS_TOKEN}`).toString("base64")}`
        : undefined;
    super(
      httpOrMock(
        {
          id: "vtpass",
          name: "VTpass",
          defaultNetworkCodeMap: NETWORK_CODE_MAP,
          extraHeaders: credentials ? { Authorization: credentials } : undefined,
          endpoints: {
            airtime: "/api/airtime",
            data: "/api/data",
            electricity: "/api/recharge/energy/validate",
            electricityVerify: "/api/recharge/energy/validate",
            cable: "/api/recharge/change-audit-token",
            cableVerify: "/api/recharge/verify-card",
            examPin: "/api/recharge/exam-pin",
            health: "/api/account/balance",
          },
          capabilities: { airtime: true, data: true, electricity: true, cable: true, examPins: true },
          mapResult: (op, raw) => {
            if (op === "examPin") {
              const content = (raw as any)?.content;
              const pins = Array.isArray(content?.pins) ? content.pins : [];
              return { ...vtpassMapper(raw, "Exam PIN purchase processed"), pins, serials: [] };
            }
            return vtpassMapper(raw, "Transaction processed by VTpass");
          },
        },
        VTPASS_BASE_URL,
        ""
      )
    );
  }
}
