import type { SchemeRegistration } from "@x402/fetch";
import type { WalletConfig } from "../config.js";
import { EvmPrivateKeyWallet } from "./evm-private-key.js";

export interface Wallet {
  type: string;
  address: string;
  getX402Schemes(): SchemeRegistration[];
}

export function loadWallet(walletConfig: WalletConfig): Wallet {
  switch (walletConfig.type) {
    case "evm-private-key":
      return new EvmPrivateKeyWallet(walletConfig.privateKey as `0x${string}`, walletConfig.rpcUrl as string);
    default:
      throw new Error(`Unknown wallet type: ${walletConfig.type}`);
  }
}
