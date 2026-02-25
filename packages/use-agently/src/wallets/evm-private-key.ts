import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { ExactEvmScheme } from "@x402/evm";
import { toClientEvmSigner } from "@x402/evm";
import type { SchemeRegistration } from "@x402/fetch";
import type { Wallet } from "./wallet.js";
import type { WalletConfig } from "../config.js";

export interface EvmPrivateKeyConfig extends WalletConfig {
  type: "evm-private-key";
  privateKey: `0x${string}`;
  address: string;
}

export function generateEvmPrivateKeyConfig(): EvmPrivateKeyConfig {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return {
    type: "evm-private-key",
    privateKey,
    address: account.address,
  };
}

export class EvmPrivateKeyWallet implements Wallet {
  readonly type = "evm-private-key";
  readonly address: string;
  private readonly privateKey: `0x${string}`;

  constructor(privateKey: `0x${string}`) {
    this.privateKey = privateKey;
    this.address = privateKeyToAccount(privateKey).address;
  }

  getX402Schemes(): SchemeRegistration[] {
    const account = privateKeyToAccount(this.privateKey);
    const signer = toClientEvmSigner(account);
    return [
      {
        network: "eip155:*" as const,
        client: new ExactEvmScheme(signer),
      },
    ];
  }
}
