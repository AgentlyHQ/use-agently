import { afterEach, beforeEach, mock, spyOn } from "bun:test";
import { parse } from "yaml";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

export const TEST_PRIVATE_KEY = generatePrivateKey();
export const TEST_ADDRESS = privateKeyToAccount(TEST_PRIVATE_KEY).address;

export function testWalletConfig() {
  return {
    type: "evm-private-key" as const,
    privateKey: TEST_PRIVATE_KEY,
    address: TEST_ADDRESS,
  };
}

export function testConfig() {
  return { wallet: testWalletConfig() };
}

/**
 * Capture console.log and console.error output during tests.
 * Call inside a `describe` block. Spies are set up in beforeEach and restored in afterEach.
 */
export function captureOutput() {
  let logSpy: ReturnType<typeof spyOn>;
  let errorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    logSpy = spyOn(console, "log").mockImplementation(() => {});
    errorSpy = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  return {
    /** Raw stdout string from the first console.log call */
    get stdout(): string {
      return logSpy.mock.calls[0]?.[0] as string;
    },
    /** Raw stderr string from the first console.error call */
    get stderr(): string {
      return errorSpy.mock.calls[0]?.[0] as string;
    },
    /** Parse stdout as JSON */
    get json(): unknown {
      return JSON.parse(this.stdout);
    },
    /** Parse stdout as YAML */
    get yaml(): unknown {
      return parse(this.stdout);
    },
    get logSpy() {
      return logSpy;
    },
    get errorSpy() {
      return errorSpy;
    },
  };
}

/**
 * Mock `config.ts` with a static wallet config.
 * Accepts an optional getter so tests can swap the config dynamically.
 */
export function mockConfigModule(getConfig?: () => unknown) {
  const resolve = getConfig ?? (() => testConfig());
  mock.module("./config", () => ({
    getConfigOrThrow: async () => {
      const cfg = resolve();
      if (!cfg || !(cfg as any).wallet) throw new Error("No wallet configured. Run `use-agently init` first.");
      return cfg;
    },
    loadConfig: async () => resolve(),
    saveConfig: async () => {},
    backupConfig: async () => "",
  }));
}
