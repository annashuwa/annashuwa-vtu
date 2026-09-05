/**
 * Abstraction over an airtime-transfer verification provider.
 *
 * Currently the platform uses manual admin verification. A future automatic
 * provider can be plugged in here (e.g. an aggregator API that confirms the
 * transfer actually landed on our receiving number) without changing the
 * Airtime-to-Cash service logic.
 */

export interface AirtimeTransferInfo {
  reference: string;
  network: string;
  /** Phone number that sent the airtime (user). */
  senderPhone: string;
  /** Platform receiving number the airtime was transferred to. */
  receivingPhone: string;
  amount: number;
}

export type AirtimeVerificationResult =
  | { verified: true; reference?: string; meta?: Record<string, unknown> }
  | { verified: false; reason?: string };

export interface AirtimeVerificationProvider {
  readonly name: string;
  /**
   * Verifies that a transfer of `amount` from `senderPhone` to
   * `receivingPhone` actually occurred.
   *
   * - `true`  -> transfer confirmed; the request may be approved & credited.
   * - `false` -> transfer could not be confirmed (with an optional reason).
   *
   * Implementations that rely on an external signal (e.g. an automatic
   * provider) ignore `opts`. The built-in manual provider uses
   * `opts.allowManualApproval` to treat an administrator's explicit decision
   * as the verification.
   */
  verifyTransfer(
    info: AirtimeTransferInfo,
    opts?: { allowManualApproval?: boolean }
  ): Promise<AirtimeVerificationResult>;
}
