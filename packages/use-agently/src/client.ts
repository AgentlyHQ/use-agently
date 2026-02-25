import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ClientFactory, JsonRpcTransportFactory, RestTransportFactory } from "@a2a-js/sdk/client";
import type { Wallet } from "./wallets/wallet.js";

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
