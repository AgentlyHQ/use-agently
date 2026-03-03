import { generateMnemonic, english, mnemonicToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { ExactEvmScheme } from "@x402/evm";
import { toClientEvmSigner } from "@x402/evm";
import type { SchemeRegistration } from "@x402/fetch";
import type { Wallet } from "./wallet.js";
import type { WalletConfig } from "../config.js";

export interface EvmMnemonicConfig extends WalletConfig {
  type: "evm-mnemonic";
  mnemonic: string;
  address: string;
}

export function generateEvmMnemonicConfig(): EvmMnemonicConfig {
  const mnemonic = generateMnemonic(english);
  const account = mnemonicToAccount(mnemonic);
  return {
    type: "evm-mnemonic",
    mnemonic,
    address: account.address,
  };
}

export class EvmMnemonicWallet implements Wallet {
  readonly type = "evm-mnemonic";
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
