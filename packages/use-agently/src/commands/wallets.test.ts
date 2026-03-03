import { describe, expect, mock, test } from "bun:test";
import { captureOutput, TEST_ADDRESS } from "../testing";

const TEST_MNEMONIC = "test test test test test test test test test test test junk";

let mockWalletConfig: { type: string; [key: string]: unknown } = {
  type: "evm-private-key",
  privateKey: "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  address: TEST_ADDRESS,
};

mock.module("../config", () => ({
  getConfigOrThrow: async () => ({ wallet: mockWalletConfig }),
  loadConfig: async () => ({ wallet: mockWalletConfig }),
  saveConfig: async () => {},
  backupConfig: async () => "",
}));

mock.module("../wallets/wallet", () => ({
  loadWallet: (_config: unknown) => ({
    type: (mockWalletConfig as any).type,
    address: TEST_ADDRESS,
    getX402Schemes: () => [],
  }),
}));

const { cli } = await import("../cli");

describe("wallets command", () => {
  const out = captureOutput();

  describe("evm-private-key wallet", () => {
    test("text output shows type and address", async () => {
      mockWalletConfig = {
        type: "evm-private-key",
        privateKey: "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        address: TEST_ADDRESS,
      };

      await cli.parseAsync(["test", "use-agently", "wallets"]);

      expect(out.yaml).toEqual({
        type: "evm-private-key",
        address: TEST_ADDRESS,
      });
    });

    test("json output shows type and address", async () => {
      mockWalletConfig = {
        type: "evm-private-key",
        privateKey: "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        address: TEST_ADDRESS,
      };

      await cli.parseAsync(["test", "use-agently", "-o", "json", "wallets"]);

      expect(out.json).toEqual({
        type: "evm-private-key",
        address: TEST_ADDRESS,
      });
    });
  });

  describe("secp256k1-bip39 wallet", () => {
    test("text output shows type, address, and hidden mnemonic by default", async () => {
      mockWalletConfig = {
        type: "secp256k1-bip39",
        mnemonic: TEST_MNEMONIC,
        address: TEST_ADDRESS,
      };

      await cli.parseAsync(["test", "use-agently", "wallets"]);

      expect(out.yaml).toEqual({
        type: "secp256k1-bip39",
        address: TEST_ADDRESS,
        mnemonic: "[hidden - use --show-mnemonic to reveal]",
      });
    });

    test("--show-mnemonic reveals mnemonic in output", async () => {
      mockWalletConfig = {
        type: "secp256k1-bip39",
        mnemonic: TEST_MNEMONIC,
        address: TEST_ADDRESS,
      };

      await cli.parseAsync(["test", "use-agently", "wallets", "--show-mnemonic"]);

      expect(out.yaml).toEqual({
        type: "secp256k1-bip39",
        address: TEST_ADDRESS,
        mnemonic: TEST_MNEMONIC,
      });
    });

    test("json output shows type, address, and hidden mnemonic by default", async () => {
      mockWalletConfig = {
        type: "secp256k1-bip39",
        mnemonic: TEST_MNEMONIC,
        address: TEST_ADDRESS,
      };

      await cli.parseAsync(["test", "use-agently", "-o", "json", "wallets"]);

      expect(out.json).toEqual({
        type: "secp256k1-bip39",
        address: TEST_ADDRESS,
        mnemonic: "[hidden - use --show-mnemonic to reveal]",
      });
    });

    test("--show-mnemonic json output reveals mnemonic", async () => {
      mockWalletConfig = {
        type: "secp256k1-bip39",
        mnemonic: TEST_MNEMONIC,
        address: TEST_ADDRESS,
      };

      await cli.parseAsync(["test", "use-agently", "-o", "json", "wallets", "--show-mnemonic"]);

      expect(out.json).toEqual({
        type: "secp256k1-bip39",
        address: TEST_ADDRESS,
        mnemonic: TEST_MNEMONIC,
      });
    });
  });
});
