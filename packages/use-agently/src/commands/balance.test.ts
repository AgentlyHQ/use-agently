import { describe, expect, mock, test } from "bun:test";
import { captureOutput, mockConfigModule, TEST_ADDRESS } from "../testing";

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
  const out = captureOutput();

  test("text output", async () => {
    await cli.parseAsync(["test", "use-agently", "balance"]);

    expect(out.yaml).toEqual({
      address: TEST_ADDRESS,
      balance: "100.5",
      currency: "USDC",
      network: "Base",
    });
  });

  test("json output", async () => {
    await cli.parseAsync(["test", "use-agently", "-o", "json", "balance"]);

    expect(out.json).toEqual({
      address: TEST_ADDRESS,
      balance: "100.5",
      currency: "USDC",
      network: "Base",
    });
  });
});
