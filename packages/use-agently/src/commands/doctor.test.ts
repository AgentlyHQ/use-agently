import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { captureOutput, mockConfigModule, testConfig } from "../testing";

let mockConfig: unknown = testConfig();
mockConfigModule(() => mockConfig);

let mockGetChainId: () => Promise<bigint> = async () => 8453n;

mock.module("viem", () => ({
  createPublicClient: () => ({
    readContract: async () => 0n,
    getChainId: () => mockGetChainId(),
  }),
  http: () => ({}),
  erc20Abi: [],
  formatUnits: () => "0",
}));

const { cli } = await import("../cli");

describe("doctor command", () => {
  const out = captureOutput();
  let exitSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mockConfig = testConfig();
    mockGetChainId = async () => 8453n;
    exitSpy = spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  test("all checks pass - text output", async () => {
    await cli.parseAsync(["test", "use-agently", "doctor"]);

    expect(out.yaml).toEqual({
      ok: true,
      checks: [
        { name: "Wallet configured", ok: true },
        { name: "Wallet loadable", ok: true },
        { name: "Network reachable (Base RPC)", ok: true },
      ],
    });
    expect(exitSpy).not.toHaveBeenCalled();
  });

  test("all checks pass - json output", async () => {
    await cli.parseAsync(["test", "use-agently", "-o", "json", "doctor"]);

    expect(out.json).toEqual({
      ok: true,
      checks: [
        { name: "Wallet configured", ok: true },
        { name: "Wallet loadable", ok: true },
        { name: "Network reachable (Base RPC)", ok: true },
      ],
    });
  });

  test("no wallet configured - fails with exit 1", async () => {
    mockConfig = undefined;

    try {
      await cli.parseAsync(["test", "use-agently", "-o", "json", "doctor"]);
    } catch {
      // expected: process.exit throws
    }

    const parsed = out.json as any;
    expect(parsed.ok).toBe(false);
    expect(parsed.checks[0]).toEqual({
      name: "Wallet configured",
      ok: false,
      message: "No wallet found. Run `use-agently init` to create one.",
    });
    expect(parsed.checks[1]).toEqual({
      name: "Wallet loadable",
      ok: false,
      message: "Skipped (no wallet configured).",
    });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test("network unreachable - fails with exit 1", async () => {
    mockGetChainId = async () => {
      throw new Error("Network error");
    };

    try {
      await cli.parseAsync(["test", "use-agently", "-o", "json", "doctor"]);
    } catch {
      // expected: process.exit throws
    }

    const parsed = out.json as any;
    expect(parsed.ok).toBe(false);
    expect(parsed.checks[2]).toEqual({
      name: "Network reachable (Base RPC)",
      ok: false,
      message: "Network error",
    });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
