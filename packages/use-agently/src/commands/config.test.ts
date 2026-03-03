import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { captureOutput, TEST_ADDRESS, TEST_PRIVATE_KEY, testConfig } from "../testing";

let mockConfig: unknown = testConfig();

mock.module("../config", () => ({
  loadConfig: async () => mockConfig,
  getConfigOrThrow: async () => {
    if (!mockConfig || !(mockConfig as any).wallet) throw new Error("No wallet configured.");
    return mockConfig;
  },
  saveConfig: async () => {},
  backupConfig: async () => "",
}));

const { cli } = await import("../cli");

describe("config command", () => {
  const out = captureOutput();
  let exitSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mockConfig = testConfig();
    exitSpy = spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  test("text output masks privateKey", async () => {
    await cli.parseAsync(["test", "use-agently", "config"]);

    expect(out.yaml).toEqual({
      wallet: {
        type: "evm-private-key",
        privateKey: "***",
        address: TEST_ADDRESS,
      },
    });
  });

  test("json output masks privateKey", async () => {
    await cli.parseAsync(["test", "use-agently", "-o", "json", "config"]);

    expect(out.json).toEqual({
      wallet: {
        type: "evm-private-key",
        privateKey: "***",
        address: TEST_ADDRESS,
      },
    });
  });

  test("--get wallet.type returns wallet type", async () => {
    await cli.parseAsync(["test", "use-agently", "config", "--get", "wallet.type"]);

    expect(out.yaml).toEqual("evm-private-key");
  });

  test("--get wallet.address returns address", async () => {
    await cli.parseAsync(["test", "use-agently", "config", "--get", "wallet.address"]);

    expect(out.yaml).toEqual(TEST_ADDRESS);
  });

  test("--get wallet.privateKey returns raw private key", async () => {
    await cli.parseAsync(["test", "use-agently", "config", "--get", "wallet.privateKey"]);

    expect(out.yaml).toEqual(TEST_PRIVATE_KEY);
  });

  test("--get nonexistent key exits with 1", async () => {
    try {
      await cli.parseAsync(["test", "use-agently", "config", "--get", "does.not.exist"]);
    } catch {
      // expected: process.exit throws
    }

    expect(out.stderr).toContain("Key not found: does.not.exist");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test("no config exits with 1", async () => {
    mockConfig = undefined;

    try {
      await cli.parseAsync(["test", "use-agently", "config"]);
    } catch {
      // expected: process.exit throws
    }

    expect(out.stderr).toContain("No config found");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
