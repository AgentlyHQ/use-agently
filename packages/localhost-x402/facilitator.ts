import { createServer } from "node:net";

/**
 * Minimal mock x402 facilitator server for local integration testing.
 *
 * This server exposes the three endpoints that HTTPFacilitatorClient calls:
 *   GET  /supported  → returns supported payment kinds for eip155:84532
 *   POST /verify     → always accepts (isValid: true) — no on-chain check
 *   POST /settle     → always succeeds — no on-chain transaction
 *
 * Using anvil as the backing chain ensures we have a valid chain ID (84532)
 * for the EIP-712 domain in EIP-3009 signatures, while the facilitator itself
 * operates off-chain to keep tests fast and dependency-free.
 */

// Anvil account 0 — used as the facilitator "signer" address.
const FACILITATOR_SIGNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

// The network this facilitator supports (must match localhost-x402 aixyz.config.ts).
const NETWORK = "eip155:84532";

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const address = server.address();
      server.close((err) => {
        if (err) return reject(err);
        if (!address || typeof address !== "object") return reject(new Error("Failed to obtain a free port"));
        resolve(address.port);
      });
    });
    server.on("error", reject);
  });
}

export interface FacilitatorServer {
  port: number;
  stop: () => void;
}

export async function startFacilitator(port?: number): Promise<FacilitatorServer> {
  const resolvedPort = port ?? (await getFreePort());

  const server = Bun.serve({
    port: resolvedPort,
    async fetch(req) {
      const url = new URL(req.url);

      if (req.method === "GET" && url.pathname === "/supported") {
        return Response.json({
          kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }],
          extensions: [],
          signers: { [NETWORK]: [FACILITATOR_SIGNER] },
        });
      }

      if (req.method === "POST" && url.pathname === "/verify") {
        const body = (await req.json()) as { paymentPayload?: { payload?: { authorization?: { from?: string } } } };
        const payer = body?.paymentPayload?.payload?.authorization?.from ?? FACILITATOR_SIGNER;
        return Response.json({ isValid: true, payer });
      }

      if (req.method === "POST" && url.pathname === "/settle") {
        const body = (await req.json()) as { paymentPayload?: { payload?: { authorization?: { from?: string } } } };
        const payer = body?.paymentPayload?.payload?.authorization?.from ?? FACILITATOR_SIGNER;
        return Response.json({
          success: true,
          transaction: "0x0000000000000000000000000000000000000000000000000000000000000001",
          network: NETWORK,
          payer,
        });
      }

      return new Response("Not found", { status: 404 });
    },
  });

  return {
    port: resolvedPort,
    stop: () => server.stop(),
  };
}
