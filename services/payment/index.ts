import { TestGateway } from "./test";
import { PaystackGateway } from "./paystack";
import { FlutterwaveGateway } from "./flutterwave";
import { MonnifyGateway } from "./monnify";
import { findEnabledGateway } from "./types";
import type { PaymentGateway } from "./types";

const gateways = new Map<string, PaymentGateway>();
gateways.set("TEST", new TestGateway());
gateways.set("PAYSTACK", new PaystackGateway());
gateways.set("FLUTTERWAVE", new FlutterwaveGateway());
gateways.set("MONNIFY", new MonnifyGateway());

export function getPaymentProvider(preferred?: string): PaymentGateway {
  const name = findEnabledGateway(preferred);
  const gateway = gateways.get(name) ?? gateways.get("TEST")!;
  return gateway;
}

export function getTestProvider(): TestGateway {
  return gateways.get("TEST") as TestGateway;
}