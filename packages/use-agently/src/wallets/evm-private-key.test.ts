import { describe, expect, test } from "bun:test";
import { ExactEvmScheme } from "@x402/evm";
import { mockConfigModule, TEST_PRIVATE_KEY } from "../testing";
import { loadWallet } from "./wallet";
import { EvmPrivateKeyWallet } from "./evm-private-key";

mockConfigModule();

describe("EvmPrivateKeyWallet", () => {
  describe("direct instantiation", () => {
    const wallet = new EvmPrivateKeyWallet(TEST_PRIVATE_KEY);

    test("type is evm-private-key", () => {
      expect(wallet.type).toStrictEqual("evm-private-key");
    });

    test("has address", () => {
      expect(wallet.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    describe("getX402Schemes", () => {
      const schemes = wallet.getX402Schemes();

      test("returns exactly one scheme", () => {
        expect(schemes).toHaveLength(1);
      });

      test("network is eip155:*", () => {
        expect(schemes[0].network).toStrictEqual("eip155:*");
      });

      test("client is ExactEvmScheme", () => {
        expect(schemes[0].client).toBeInstanceOf(ExactEvmScheme);
      });

      test("x402Version is 2", () => {
        expect(schemes[0].x402Version).toStrictEqual(2);
      });
    });
  });

  describe("via mockConfigModule + loadWallet", () => {
    test("loadWallet creates wallet with getX402Schemes", async () => {
      const { getConfigOrThrow } = await import("../config");
      const config = await getConfigOrThrow();
      const wallet = loadWallet(config.wallet);

      expect(wallet).toBeInstanceOf(EvmPrivateKeyWallet);
      expect(typeof wallet.getX402Schemes).toStrictEqual("function");

      const schemes = wallet.getX402Schemes();
      expect(schemes).toHaveLength(1);
      expect(schemes[0].network).toStrictEqual("eip155:*");
      expect(schemes[0].client).toBeInstanceOf(ExactEvmScheme);
      expect(schemes[0].x402Version).toStrictEqual(2);
    });
  });
});
