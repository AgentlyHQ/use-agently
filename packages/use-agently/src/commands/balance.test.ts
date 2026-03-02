import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { parse } from "yaml";
import { mockConfigModule, TEST_ADDRESS } from "../testing";

const TEST_BALANCE = 100_500_000n; // 100.5 USDC (6 decimals)

mockConfigModule();

mock.module("viem", () => ({
  createPublicClient: () => ({
    readContract: async () => TEST_BALANCE,
    getChainId: async () => 8453n,
  }),
  http: () => ({}),
  erc20Abi: [],
  formatUnits: (value: bigint, decimals: number) => (Number(value) / 10 ** decimals).toString(),
}));

const { cli } = await import("../cli");

describe("balance command", () => {
  let logSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    logSpy = spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  test("text output shows address and balance", async () => {
    await cli.parseAsync(["test", "use-agently", "balance"]);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain(TEST_ADDRESS);
    expect(output).toContain("100.5");
    expect(output).toContain("USDC");
    expect(output).toContain("Base");
  });

  test("text output is valid yaml", async () => {
    await cli.parseAsync(["test", "use-agently", "balance"]);

    const output = logSpy.mock.calls[0][0] as string;
    const parsed = parse(output);
    expect(parsed.address).toBe(TEST_ADDRESS);
    expect(parsed.balance).toBe("100.5");
    expect(parsed.currency).toBe("USDC");
    expect(parsed.network).toBe("Base");
  });

  test("json output returns structured data", async () => {
    await cli.parseAsync(["test", "use-agently", "-o", "json", "balance"]);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(parsed).toEqual({
      address: TEST_ADDRESS,
      balance: "100.5",
      currency: "USDC",
      network: "Base",
    });
  });

  test("json output is pretty-printed", async () => {
    await cli.parseAsync(["test", "use-agently", "-o", "json", "balance"]);

    const raw = logSpy.mock.calls[0][0] as string;
    const expected = JSON.stringify(
      { address: TEST_ADDRESS, balance: "100.5", currency: "USDC", network: "Base" },
      null,
      2,
    );
    expect(raw).toBe(expected);
  });
});
