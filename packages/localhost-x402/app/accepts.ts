import { HTTPFacilitatorClient } from "@x402/core/server";

// The local mock x402 facilitator started by X402Testing.
// FACILITATOR_PORT is injected by X402Testing when spawning the server process.
const facilitatorPort = process.env.FACILITATOR_PORT ?? "4022";

export const facilitator = new HTTPFacilitatorClient({
  url: `http://localhost:${facilitatorPort}`,
});
