import { MockVtuProvider } from "./mock";
import { HttpVtuProvider } from "./http";
import type { VtuProvider } from "./types";

let provider: VtuProvider | null = null;

export function getVtuProvider(): VtuProvider {
  if (provider) return provider;
  const mock = process.env.MOCK_MODE === "true";
  provider = mock ? new MockVtuProvider() : new HttpVtuProvider();
  return provider;
}