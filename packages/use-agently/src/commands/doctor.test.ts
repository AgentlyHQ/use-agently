import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, spyOn, test } from "bun:test";
import {
  captureOutput,
  mockConfigModule,
  startX402FacilitatorLocal,
  stopX402FacilitatorLocal,
  testConfig,
  type X402FacilitatorLocal,
} from "../testing";

let mockConfig: unknown = testConfig();
// Allow tests to simulate a corrupt config file by setting mockConfigThrow to an Error
let mockConfigThrow: Error | null = null;
mockConfigModule(() => {
  if (mockConfigThrow) throw mockConfigThrow;
  return mockConfig;
});

const { cli } = await import("../cli");

describe("doctor command", () => {
  const out = captureOutput();
  let fixture: X402FacilitatorLocal;
  let exitSpy: ReturnType<typeof spyOn>;

  beforeAll(async () => {
    fixture = await startX402FacilitatorLocal();
  }, 120_000);

  afterAll(async () => {
    if (fixture) await stopX402FacilitatorLocal(fixture);
  }, 30_000);

  beforeEach(() => {
    mockConfig = testConfig();
    mockConfigThrow = null;
    exitSpy = spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  test("all checks pass - text output", async () => {
    await cli.parseAsync(["test", "use-agently", "doctor", "--rpc", fixture.container.getRpcUrl()]);

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
    await cli.parseAsync(["test", "use-agently", "-o", "json", "doctor", "--rpc", fixture.container.getRpcUrl()]);

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
      await cli.parseAsync(["test", "use-agently", "-o", "json", "doctor", "--rpc", fixture.container.getRpcUrl()]);
    } catch {
      // expected: process.exit throws
    }

    const parsed = out.json as any;
    expect(parsed.ok).toStrictEqual(false);
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
    try {
      await cli.parseAsync(["test", "use-agently", "-o", "json", "doctor", "--rpc", "http://127.0.0.1:1"]);
    } catch {
      // expected: process.exit throws
    }

    const parsed = out.json as any;
    expect(parsed.ok).toStrictEqual(false);
    expect(parsed.checks[2].name).toStrictEqual("Network reachable (Base RPC)");
    expect(parsed.checks[2].ok).toStrictEqual(false);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test("--fix with corrupt config - auto-fixes and all checks pass", async () => {
    mockConfigThrow = new Error("Config file at ~/.use-agently/config.json contains invalid JSON.");

    await cli.parseAsync([
      "test",
      "use-agently",
      "-o",
      "json",
      "doctor",
      "--fix",
      "--rpc",
      fixture.container.getRpcUrl(),
    ]);

    const parsed = out.json as any;
    expect(parsed.ok).toStrictEqual(true);
    expect(parsed.checks[0]).toEqual({ name: "Wallet configured", ok: true, fixed: true });
    expect(parsed.checks[1]).toEqual({ name: "Wallet loadable", ok: true });
    expect(parsed.checks[2]).toEqual({ name: "Network reachable (Base RPC)", ok: true });
    expect(exitSpy).not.toHaveBeenCalled();
  });

  test("--fix with no wallet - auto-fixes and all checks pass", async () => {
    mockConfig = undefined;

    await cli.parseAsync([
      "test",
      "use-agently",
      "-o",
      "json",
      "doctor",
      "--fix",
      "--rpc",
      fixture.container.getRpcUrl(),
    ]);

    const parsed = out.json as any;
    expect(parsed.ok).toStrictEqual(true);
    expect(parsed.checks[0]).toEqual({ name: "Wallet configured", ok: true, fixed: true });
    expect(parsed.checks[1]).toEqual({ name: "Wallet loadable", ok: true });
    expect(parsed.checks[2]).toEqual({ name: "Network reachable (Base RPC)", ok: true });
    expect(exitSpy).not.toHaveBeenCalled();
  });

  test("--fix with invalid wallet private key - auto-fixes and all checks pass", async () => {
    mockConfig = {
      wallet: {
        type: "evm-private-key",
        privateKey: "0xinvalid",
        address: "0x0000000000000000000000000000000000000000",
      },
    };

    await cli.parseAsync([
      "test",
      "use-agently",
      "-o",
      "json",
      "doctor",
      "--fix",
      "--rpc",
      fixture.container.getRpcUrl(),
    ]);

    const parsed = out.json as any;
    expect(parsed.ok).toStrictEqual(true);
    expect(parsed.checks[0]).toEqual({ name: "Wallet configured", ok: true });
    expect(parsed.checks[1]).toEqual({ name: "Wallet loadable", ok: true, fixed: true });
    expect(parsed.checks[2]).toEqual({ name: "Network reachable (Base RPC)", ok: true });
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
