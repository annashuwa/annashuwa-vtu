import type { AirtimeVerificationProvider, AirtimeVerificationResult, AirtimeTransferInfo } from "./types";

/**
 * Manual verification provider.
 *
 * This is the default while no automatic airtime-verification provider is
 * configured. It does not perform an external check; instead it defers to the
 * administrator's explicit Approve/Reject decision. `verifyTransfer` returns
 * `verified: true` only when the admin has already chosen to approve
 * (`allowManualApproval`), otherwise it signals that manual review is needed.
 */
export class ManualAirtimeVerificationProvider implements AirtimeVerificationProvider {
  readonly name = "manual";

  async verifyTransfer(info: AirtimeTransferInfo, opts?: { allowManualApproval?: boolean }): Promise<AirtimeVerificationResult> {
    if (opts?.allowManualApproval) {
      return { verified: true };
    }
    return { verified: false, reason: "Manual verification required. An administrator must review this request." };
  }
}
