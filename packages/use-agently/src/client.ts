import { ClientFactory, JsonRpcTransportFactory, RestTransportFactory } from "@a2a-js/sdk/client";

export { createPaymentFetch, type PaymentInfo, type createPaymentFetchOptions } from "./utils/payment-fetch.js";

export async function createA2AClient(
  agentUrl: string,
  fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) {
  const f = fetchImpl as typeof fetch;
  const factory = new ClientFactory({
    transports: [new JsonRpcTransportFactory({ fetchImpl: f }), new RestTransportFactory({ fetchImpl: f })],
  });
  return factory.createFromUrl(agentUrl);
}
