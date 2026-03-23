import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { DryRunPaymentRequired as SdkDryRunPaymentRequired } from "@use-agently/sdk";
import { mockConfigModule } from "./testing";

mockConfigModule();

const { DryRunPaymentRequired, SpendLimitExceeded, createSpendLimitedFetch, clientFetch } = await import("./client");

describe("DryRunPaymentRequired", () => {
  test("formats USDC amount with --pay hint", () => {
    const err = new DryRunPaymentRequired([
      { amount: "1000000", network: "eip155:8453", description: "", payTo: "0x0", asset: "USDC" },
    ]);
    expect(err.message).toContain("$1 USDC");
    expect(err.message).toContain("--pay");
  });

  test("handles missing amount gracefully", () => {
    const err = new DryRunPaymentRequired([]);
    expect(err.message).toContain("could not be determined");
    expect(err.message).toContain("--pay");
  });

  test("extends SDK DryRunPaymentRequired", () => {
    const err = new DryRunPaymentRequired([
      { amount: "1000000", network: "eip155:8453", description: "", payTo: "0x0", asset: "USDC" },
    ]);
    expect(err).toBeInstanceOf(SdkDryRunPaymentRequired);
  });
});

describe("clientFetch", () => {
  let fetchSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  test("sets User-Agent header", async () => {
    await clientFetch("http://example.com");
    const headers = fetchSpy.mock.calls[0][1]?.headers as Headers;
    expect(headers.get("User-Agent")).toMatch(/^use-agently:\S+ \(use-agently\.com\)$/);
  });

  test("does not override existing User-Agent header", async () => {
    await clientFetch("http://example.com", { headers: { "User-Agent": "custom/1.0" } });
    const headers = fetchSpy.mock.calls[0][1]?.headers as Headers;
    expect(headers.get("User-Agent")).toStrictEqual("custom/1.0");
  });
});

describe("SpendLimitExceeded", () => {
  test("includes amount and limit in message", () => {
    const err = new SpendLimitExceeded(0.5, 0.1);
    expect(err.message).toContain("$0.5");
    expect(err.message).toContain("$0.1");
    expect(err.message).toContain("must ask the wallet owner");
    expect(err.requestedAmount).toStrictEqual(0.5);
    expect(err.maxSpendPerCall).toStrictEqual(0.1);
  });
});

describe("createSpendLimitedFetch", () => {
  /** Create a mock fetch that always returns the given response. */
  function mockFetch(response: Response): typeof fetch {
    // @ts-expect-error — Bun's typeof fetch includes preconnect namespace (oven-sh/bun#23741)
    return () => Promise.resolve(response);
  }

  function make402Response(amountMicroUsdc: string, network = "eip155:8453") {
    const accepts = [{ amount: amountMicroUsdc, network, description: "", payTo: "0x0", asset: "USDC" }];
    const header = Buffer.from(JSON.stringify({ accepts })).toString("base64");
    return new Response(null, { status: 402, headers: { "PAYMENT-REQUIRED": header } });
  }

  test("passes through non-402 responses", async () => {
    const limitedFetch = createSpendLimitedFetch(mockFetch(new Response("ok", { status: 200 })), 0.1);
    const response = await limitedFetch("http://example.com");
    expect(response.status).toStrictEqual(200);
  });

  test("allows 402 within spend limit", async () => {
    // $0.05 USDC (50000 micro-USDC with 6 decimals) — within $0.1 limit
    const limitedFetch = createSpendLimitedFetch(mockFetch(make402Response("50000")), 0.1);
    const response = await limitedFetch("http://example.com");
    expect(response.status).toStrictEqual(402);
  });

  test("throws SpendLimitExceeded when 402 amount exceeds limit", async () => {
    // $0.5 USDC (500000 micro-USDC with 6 decimals) — exceeds $0.1 limit
    const limitedFetch = createSpendLimitedFetch(mockFetch(make402Response("500000")), 0.1);
    await expect(limitedFetch("http://example.com")).rejects.toBeInstanceOf(SpendLimitExceeded);
  });

  test("allows 402 at exact limit boundary", async () => {
    // $0.1 USDC exactly (100000 micro-USDC) — at the $0.1 limit
    const limitedFetch = createSpendLimitedFetch(mockFetch(make402Response("100000")), 0.1);
    const response = await limitedFetch("http://example.com");
    expect(response.status).toStrictEqual(402);
  });

  test("blocks 402 without parseable requirements (fail-closed)", async () => {
    const limitedFetch = createSpendLimitedFetch(mockFetch(new Response(null, { status: 402 })), 0.1);
    await expect(limitedFetch("http://example.com")).rejects.toBeInstanceOf(SpendLimitExceeded);
  });

  test("parses requirements from x402v1 body format", async () => {
    // $0.5 USDC in body (no header) — exceeds $0.1 limit
    const accepts = [{ amount: "500000", network: "eip155:8453", description: "", payTo: "0x0", asset: "USDC" }];
    const limitedFetch = createSpendLimitedFetch(
      mockFetch(new Response(JSON.stringify({ accepts }), { status: 402 })),
      0.1,
    );
    await expect(limitedFetch("http://example.com")).rejects.toBeInstanceOf(SpendLimitExceeded);
  });
});
