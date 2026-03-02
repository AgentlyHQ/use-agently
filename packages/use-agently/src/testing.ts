import { mock } from "bun:test";
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
