import type { PaymentGateway, InitializeRequest, InitializeResult, VerifyResult } from "./types";

type LedgerEntry = {
  id: string;
  email: string;
  amount: number;
  status: "PENDING" | "SUCCESSFUL" | "FAILED";
  gatewayRef: string;
  createdAt: number;
};

const ledger = new Map<string, LedgerEntry>();
let counter = 0;

/**
 * Built-in TEST payment gateway for localhost development.
 * Every call is recorded in an in-memory ledger; call resolve(reference, outcome)
 * to simulate an approval or decline, then verify() reflects the outcome.
 */
export class TestGateway implements PaymentGateway {
  readonly name = "TEST";

  async initialize(input: InitializeRequest): Promise<InitializeResult> {
    counter += 1;
    const entry: LedgerEntry = {
      id: input.reference,
      email: input.email,
      amount: input.amount,
      status: "PENDING",
      gatewayRef: `TST-${Date.now()}-${counter}`,
      createdAt: Date.now(),
    };
    ledger.set(input.reference, entry);
    return {
      reference: input.reference,
      gateway: "TEST",
      message: "Simulated payment initialized. Approve or decline to complete.",
    };
  }

  async resolve(reference: string, outcome: "SUCCESSFUL" | "FAILED") {
    const entry = ledger.get(reference);
    if (!entry) throw new Error("Unknown test payment reference");
    entry.status = outcome;
    return entry;
  }

  async verify(reference: string): Promise<VerifyResult> {
    const entry = ledger.get(reference);
    if (!entry) {
      return { reference, status: "FAILED", amount: 0, message: "Reference not found" };
    }
    return {
      reference,
      status: entry.status === "SUCCESSFUL" ? "SUCCESSFUL" : "FAILED",
      amount: entry.amount,
      gatewayRef: entry.gatewayRef,
    };
  }
}