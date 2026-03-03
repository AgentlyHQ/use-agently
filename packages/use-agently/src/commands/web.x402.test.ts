/**
 * x402 payment flow integration tests
 *
 * These tests verify the full x402 payment cycle without mocking the HTTP client:
 *   1. CLI command makes a request
 *   2. Test server returns 402 with real payment requirements
 *   3. createPaymentFetch signs an EIP-3009 payload (pure EIP-712 crypto, no blockchain RPC needed)
 *   4. CLI retries with PAYMENT-SIGNATURE header
 *   5. Test server verifies the signature using viem's verifyTypedData
 *   6. Server returns 200 — the CLI command outputs the result
 */
import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { verifyTypedData, type Hex } from "viem";
import { captureOutput, mockConfigModule } from "../testing";

mockConfigModule();

const { cli } = await import("../cli");

// ─── x402 payment requirements ───────────────────────────────────────────────
// USDC on Base mainnet. The address + EIP-712 domain (name/version) are real
// so that the client's ExactEvmScheme signs a properly-formed payload.
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Hex;
const PAY_TO = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as Hex; // Anvil account 1

const EIP3009_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function encodePaymentRequired(resource: string) {
  const requirements = {
    x402Version: 2,
    error: null,
    resource,
    description: "x402 integration test resource",
    accepts: [
      {
        scheme: "exact",
        network: "eip155:8453",
        maxTimeoutSeconds: 300,
        asset: USDC_BASE,
        amount: "1",
        payTo: PAY_TO,
        extra: { name: "USD Coin", version: "2" },
      },
    ],
  };
  return btoa(JSON.stringify(requirements));
}

function decodePaymentSignature(header: string) {
  return JSON.parse(atob(header)) as {
    x402Version: number;
    payload: {
      authorization: {
        from: Hex;
        to: Hex;
        value: string;
        validAfter: string;
        validBefore: string;
        nonce: Hex;
      };
      signature: Hex;
    };
  };
}

async function verifyPayment(header: string): Promise<boolean> {
  const { payload } = decodePaymentSignature(header);
  const { authorization, signature } = payload;

  return verifyTypedData({
    address: authorization.from,
    domain: { name: "USD Coin", version: "2", chainId: 8453, verifyingContract: USDC_BASE },
    types: EIP3009_TYPES,
    primaryType: "TransferWithAuthorization",
    message: {
      from: authorization.from,
      to: authorization.to,
      value: BigInt(authorization.value),
      validAfter: BigInt(authorization.validAfter),
      validBefore: BigInt(authorization.validBefore),
      nonce: authorization.nonce,
    },
    signature,
  });
}

// ─── Payment-gated test server ────────────────────────────────────────────────

let lastVerifiedPayment: ReturnType<typeof decodePaymentSignature> | null = null;

const x402Server = Bun.serve({
  port: 0,
  async fetch(req) {
    const paymentHeader = req.headers.get("payment-signature");

    if (!paymentHeader) {
      return new Response("payment required", {
        status: 402,
        headers: {
          "content-type": "application/json",
          "PAYMENT-REQUIRED": encodePaymentRequired(req.url),
        },
      });
    }

    const isValid = await verifyPayment(paymentHeader);
    if (!isValid) {
      return new Response(JSON.stringify({ error: "invalid payment signature" }), {
        status: 402,
        headers: { "content-type": "application/json" },
      });
    }

    lastVerifiedPayment = decodePaymentSignature(paymentHeader);

    return new Response(JSON.stringify({ paid: true, method: req.method }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  },
});

const x402Url = `http://localhost:${x402Server.port}`;

beforeEach(() => {
  lastVerifiedPayment = null;
});

afterAll(() => {
  x402Server.stop();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("x402 payment flow", () => {
  const out = captureOutput();

  test("web:get transparently pays x402 and returns the response", async () => {
    await cli.parseAsync(["test", "use-agently", "web:get", `${x402Url}/resource`]);
    expect(lastVerifiedPayment).not.toBeNull();
    expect(lastVerifiedPayment?.payload.authorization.to.toLowerCase()).toBe(PAY_TO.toLowerCase());
    expect(out.yaml).toEqual({ paid: true, method: "GET" });
  });

  test("web:put transparently pays x402 and returns the response", async () => {
    await cli.parseAsync(["test", "use-agently", "web:put", `${x402Url}/resource`, "-d", '{"x":1}']);
    expect(lastVerifiedPayment).not.toBeNull();
    expect(lastVerifiedPayment?.payload.authorization.to.toLowerCase()).toBe(PAY_TO.toLowerCase());
    expect(out.yaml).toEqual({ paid: true, method: "PUT" });
  });

  test("web:delete transparently pays x402 and returns the response", async () => {
    await cli.parseAsync(["test", "use-agently", "web:delete", `${x402Url}/resource/123`]);
    expect(lastVerifiedPayment).not.toBeNull();
    expect(lastVerifiedPayment?.payload.authorization.to.toLowerCase()).toBe(PAY_TO.toLowerCase());
    expect(out.yaml).toEqual({ paid: true, method: "DELETE" });
  });

  test("payment payload has correct authorization fields", async () => {
    await cli.parseAsync(["test", "use-agently", "web:get", `${x402Url}/resource`]);
    expect(lastVerifiedPayment).not.toBeNull();
    const { authorization } = lastVerifiedPayment!.payload;
    expect(authorization.value).toBe("1"); // amount matches payment requirement
    expect(authorization.to.toLowerCase()).toBe(PAY_TO.toLowerCase());
    expect(authorization.nonce).toMatch(/^0x[0-9a-f]{64}$/i);
  });
});
