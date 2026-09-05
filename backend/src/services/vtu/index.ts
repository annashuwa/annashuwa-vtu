import { providerManager } from "./providers/registry";
import type { VtuProvider } from "./types";

/**
 * Returns the provider currently selected by the ProviderManager.
 * The default active provider is controlled by DEFAULT_ACTIVE_PROVIDER env
 * (defaults to "mock"). Phase 3 routing will add per-operation selection.
 */
export function getVtuProvider(providerId?: string): VtuProvider {
  return providerManager.getProvider(providerId);
}

export function getProviderManager() {
  return providerManager;
}

export function resetVtuProviderForTests(): void {
  // no-op: manager holds stateless provider instances
}
