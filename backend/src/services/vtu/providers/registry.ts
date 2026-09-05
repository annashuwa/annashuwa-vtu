import type {
  ProviderCapabilities,
  ProviderHealth,
  ProviderId,
  VtuProvider,
} from "../types";
import { DEFAULT_ACTIVE_PROVIDER } from "../../../config";
import {
  BILALSADASUB_BASE_URL,
  RAPIDBILLS_BASE_URL,
  CHEAPDATAHUB_BASE_URL,
  VTUNG_BASE_URL,
  VTPASS_BASE_URL,
} from "../../../config";
import { getSystemConfig, setSystemConfig } from "../../config.service";
import { BilalsadasubProvider } from "./bilalsadasub";
import { RapidBillsProvider } from "./rapidbills";
import { CheapDataHubProvider } from "./cheapdatahub";
import { VTUNgProvider } from "./vtung";
import { VTpassProvider } from "./vtpass";
import { MockVtuProvider } from "../mock";

export type LiveProviderId = Exclude<ProviderId, "mock">;

export type ProviderMode = "mock" | "http";

export interface ProviderRegistryEntry {
  id: ProviderId;
  name: string;
  provider: VtuProvider;
  /** True when the provider actually makes network calls (not a mock stand-in). */
  live: boolean;
  /** Runtime mode: "http" when configured with a base URL, else "mock". */
  mode: ProviderMode;
  /** True when the provider has real endpoint credentials configured. */
  configured: boolean;
}

export interface ProviderReadiness {
  id: ProviderId;
  name: string;
  /** True when the provider actually makes network calls (not a mock stand-in). */
  live: boolean;
  /** Runtime mode: "http" when configured with a base URL, else "mock". */
  mode: ProviderMode;
  /** True when the provider has real endpoint credentials configured. */
  configured: boolean;
  capabilities: ProviderCapabilities;
  active: boolean;
  lastHealth?: ProviderHealth | null;
}

const ACTIVE_CONFIG_KEY = "activeVtuProvider";

export class ProviderManager {
  private entries: Map<ProviderId, ProviderRegistryEntry>;
  private active: ProviderId;

  constructor(activeOverride?: string) {
    const configured: Array<{ id: LiveProviderId; p: VtuProvider; live: boolean }> = [
      { id: "bilalsadasub", p: new BilalsadasubProvider(), live: Boolean(BILALSADASUB_BASE_URL) },
      { id: "rapidbills", p: new RapidBillsProvider(), live: Boolean(RAPIDBILLS_BASE_URL) },
      { id: "cheapdatahub", p: new CheapDataHubProvider(), live: Boolean(CHEAPDATAHUB_BASE_URL) },
      { id: "vtung", p: new VTUNgProvider(), live: Boolean(VTUNG_BASE_URL) },
      { id: "vtpass", p: new VTpassProvider(), live: Boolean(VTPASS_BASE_URL) },
    ];

    this.entries = new Map();
    this.entries.set("mock", {
      id: "mock",
      name: "ANNASHUWA MOCK VTU",
      provider: new MockVtuProvider(),
      live: true,
      mode: "mock",
      configured: false,
    });
    for (const c of configured) {
      this.entries.set(c.id, {
        id: c.id,
        name: c.p.name,
        provider: c.p,
        live: c.live,
        mode: c.live ? "http" : "mock",
        configured: c.live,
      });
    }

    const override = activeOverride ?? DEFAULT_ACTIVE_PROVIDER;
    this.active = this.entries.has(override as ProviderId) ? (override as ProviderId) : "mock";
  }

  getActiveId(): ProviderId {
    return this.active;
  }

  getActiveProvider(): VtuProvider {
    return this.getProvider(this.active);
  }

  /** Loads a provider id that was persisted by a previous setActive() call. */
  async initActiveFromDb(): Promise<void> {
    try {
      const persisted = await getSystemConfig(ACTIVE_CONFIG_KEY);
      if (typeof persisted === "string" && this.entries.has(persisted as ProviderId)) {
        this.active = persisted as ProviderId;
      }
    } catch {
      // DB not ready; keep the env-configured default.
    }
  }

  /** Sets the active provider and persists the choice across restarts. */
  async setActive(id: string): Promise<boolean> {
    if (!this.entries.has(id as ProviderId)) return false;
    this.active = id as ProviderId;
    try {
      await setSystemConfig(ACTIVE_CONFIG_KEY, id);
    } catch {
      // persist is best-effort; in-memory switch still applies for this process
    }
    return true;
  }

  getProvider(id?: string): VtuProvider {
    const key = (id ?? this.active) as ProviderId;
    const entry = this.entries.get(key);
    if (!entry) return this.entries.get("mock")!.provider;
    return entry.provider;
  }

  list(): Array<{ id: ProviderId; name: string; live: boolean; active: boolean }> {
    return Array.from(this.entries.values()).map((e) => ({
      id: e.id,
      name: e.name,
      live: e.live,
      active: e.id === this.active,
    }));
  }

  async readiness(): Promise<ProviderReadiness[]> {
    const health = await this.healthCheckAll();
    const healthMap = new Map(health.map((h) => [h.provider, h]));
    return Array.from(this.entries.values()).map((e) => ({
      id: e.id,
      name: e.name,
      live: e.live,
      mode: e.mode,
      configured: e.configured,
      capabilities: { ...e.provider.capabilities },
      active: e.id === this.active,
      lastHealth: healthMap.get(e.id) ?? null,
    }));
  }

  async healthCheckAll(): Promise<ProviderHealth[]> {
    const results = await Promise.all(
      Array.from(this.entries.values()).map(async (e) => {
        try {
          return await e.provider.healthCheck();
        } catch (err) {
          return {
            provider: e.id,
            ok: false,
            latencyMs: 0,
            checkedAt: new Date().toISOString(),
            error: (err as Error).message,
          } as ProviderHealth;
        }
      })
    );
    return results;
  }
}

export const providerManager = new ProviderManager();
