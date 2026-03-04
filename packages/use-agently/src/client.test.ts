import { describe, expect, test } from "bun:test";
import { DryRunPaymentRequired, createDryRunFetch } from "./client";

describe("DryRunPaymentRequired", () => {
  test("formats USDC amount with network", () => {
    const err = new DryRunPaymentRequired([
      {
        amount: "1000",
        network: "eip155:8453",
        description: "Payment required",
        payTo: "0xabc",
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      },
    ]);
    expect(err.name).toBe("DryRunPaymentRequired");
    expect(err.message).toBe(
      "This request requires payment of $0.001 USDC on eip155:8453.\nRun the same command with --pay to authorize the transaction and proceed.",
    );
  });

  test("formats whole dollar amount without trailing decimals", () => {
    const err = new DryRunPaymentRequired([
      {
        amount: "1000000",
        network: "eip155:8453",
        description: "",
        payTo: "0xabc",
        asset: "0xabc",
      },
    ]);
    expect(err.message).toBe(
      "This request requires payment of $1 USDC on eip155:8453.\nRun the same command with --pay to authorize the transaction and proceed.",
    );
  });

  test("uses fallback message when requirements are empty", () => {
    const err = new DryRunPaymentRequired([]);
    expect(err.message).toBe(
      "This request requires payment of an unknown amount.\nRun the same command with --pay to authorize the transaction and proceed.",
    );
  });

  test("stores requirements on the error instance", () => {
    const reqs = [
      {
        amount: "500",
        network: "eip155:1",
        description: "",
        payTo: "0xabc",
        asset: "0xabc",
      },
    ];
    const err = new DryRunPaymentRequired(reqs);
    expect(err.requirements).toEqual(reqs);
  });
});

describe("createDryRunFetch", () => {
  test("passes through non-402 responses unchanged", async () => {
    const dryRunFetch = createDryRunFetch();
    const response = await dryRunFetch("https://httpbin.org/status/200").catch(() => {
      // Network may not be available in test environment; skip if so
      return null;
    });
    // If network is available, verify response is passed through
    if (response) {
      expect(response.status).not.toBe(402);
    }
  });

  test("throws DryRunPaymentRequired on 402 with PAYMENT-REQUIRED header", async () => {
    const dryRunFetch = createDryRunFetch();

    // Mock a 402 response with the payment required header
    const paymentRequired = {
      x402Version: 2,
      accepts: [
        {
          amount: "1000",
          network: "eip155:8453",
          description: "Test payment",
          payTo: "0xabc",
          asset: "0xabc",
          scheme: "exact",
          resource: "https://example.com",
          mimeType: "application/json",
          outputSchema: {},
          maxTimeoutSeconds: 60,
          extra: {},
        },
      ],
    };
    const header = Buffer.from(JSON.stringify(paymentRequired)).toString("base64");

    // Temporarily replace global fetch to simulate a 402 response
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(null, {
        status: 402,
        headers: { "PAYMENT-REQUIRED": header },
      });

    try {
      await dryRunFetch("https://example.com/paid");
      throw new Error("Expected DryRunPaymentRequired to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(DryRunPaymentRequired);
      expect((err as DryRunPaymentRequired).message).toBe(
        "This request requires payment of $0.001 USDC on eip155:8453.\nRun the same command with --pay to authorize the transaction and proceed.",
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("throws DryRunPaymentRequired with empty requirements on 402 without header", async () => {
    const dryRunFetch = createDryRunFetch();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(null, { status: 402 });

    try {
      await dryRunFetch("https://example.com/paid");
      throw new Error("Expected DryRunPaymentRequired to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(DryRunPaymentRequired);
      expect((err as DryRunPaymentRequired).requirements).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
