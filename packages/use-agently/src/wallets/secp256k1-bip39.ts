import { generateMnemonic, english, mnemonicToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { ExactEvmScheme } from "@x402/evm";
import { toClientEvmSigner } from "@x402/evm";
import type { SchemeRegistration } from "@x402/fetch";
import type { Wallet } from "./wallet.js";
import type { WalletConfig } from "../config.js";

export interface Secp256k1Bip39Config extends WalletConfig {
  type: "secp256k1-bip39";
  mnemonic: string;
  address: string;
}

export function generateSecp256k1Bip39Config(): Secp256k1Bip39Config {
  const mnemonic = generateMnemonic(english);
  const account = mnemonicToAccount(mnemonic);
  return {
    type: "secp256k1-bip39",
    mnemonic,
    address: account.address,
  };
}

export class Secp256k1Bip39Wallet implements Wallet {
  readonly type = "secp256k1-bip39";
  readonly address: string;
  private readonly mnemonic: string;
  private readonly publicClient = createPublicClient({ chain: base, transport: http() });

  constructor(mnemonic: string) {
    this.mnemonic = mnemonic;
    this.address = mnemonicToAccount(mnemonic).address;
  }

  getX402Schemes(): SchemeRegistration[] {
    const account = mnemonicToAccount(this.mnemonic);
    const signer = toClientEvmSigner(account, this.publicClient);
    return [
      {
        network: "eip155:*" as const,
        client: new ExactEvmScheme(signer),
      },
    ];
  }
}
