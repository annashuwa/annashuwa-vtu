import type { AirtimeVerificationProvider } from "./types";
import { ManualAirtimeVerificationProvider } from "./manual";

let provider: AirtimeVerificationProvider | null = null;

/**
 * Returns the active airtime-verification provider.
 *
 * For now this always returns the manual provider because no automatic
 * airtime-verification integration has been wired up. When a real provider is
 * added (network/aggregator API), select it here based on configuration:
 *
 *   const providerName = process.env.AIRTIME_VERIFICATION_PROVIDER;
 *   if (providerName === "aggregator") return new AggregatorProvider();
 *   return new ManualAirtimeVerificationProvider();
 */
export function getAirtimeVerificationProvider(): AirtimeVerificationProvider {
  if (provider) return provider;
  provider = new ManualAirtimeVerificationProvider();
  return provider;
}

export function resetAirtimeVerificationProviderForTests(): void {
  provider = null;
}

export type { AirtimeVerificationProvider, AirtimeVerificationResult, AirtimeTransferInfo } from "./types";
