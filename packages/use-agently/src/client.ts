import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ClientFactory, JsonRpcTransportFactory, RestTransportFactory } from "@a2a-js/sdk/client";
import type { Wallet } from "./wallets/wallet.js";

export interface PaymentAcceptance {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  description?: string;
}

export class PaymentRequiredError extends Error {
  constructor(public readonly accepts: PaymentAcceptance[]) {
    const first = accepts[0];
    const amount = first ? first.maxAmountRequired : "unknown amount";
    const network = first?.network ?? "unknown network";
    const scheme = first?.scheme ?? "unknown scheme";
    super(`This agent requires payment: up to ${amount} (${scheme} on ${network}). Add --pay to approve.`);
    this.name = "PaymentRequiredError";
  }
}

export function createDryRunFetch(): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await fetch(input, init);
    if (response.status !== 402) {
      return response;
    }
    let accepts: PaymentAcceptance[] = [];
    try {
      const header = response.headers.get("PAYMENT-REQUIRED");
      let paymentRequired: { accepts?: PaymentAcceptance[] };
      if (header) {
        paymentRequired = JSON.parse(atob(header));
      } else {
        paymentRequired = await response.json();
      }
      accepts = paymentRequired?.accepts ?? [];
    } catch {
      // ignore parse errors
    }
    throw new PaymentRequiredError(accepts);
  };
}

export function createPaymentFetch(wallet: Wallet) {
  return wrapFetchWithPaymentFromConfig(fetch, {
    schemes: wallet.getX402Schemes(),
  });
}

export async function createA2AClient(agentUrl: string, fetchImpl: typeof fetch) {
  const factory = new ClientFactory({
    transports: [new JsonRpcTransportFactory({ fetchImpl }), new RestTransportFactory({ fetchImpl })],
  });
  return factory.createFromUrl(agentUrl);
}
