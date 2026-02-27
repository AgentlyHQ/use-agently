import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";
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
  private readonly rpcUrl?: string;

  constructor(privateKey: `0x${string}`, rpcUrl?: string) {
    this.privateKey = privateKey;
    this.rpcUrl = rpcUrl;
    this.address = privateKeyToAccount(privateKey).address;
  }

  getX402Schemes(): SchemeRegistration[] {
    const account = privateKeyToAccount(this.privateKey);

    const mainnetClient = createPublicClient({ chain: base, transport: http(this.rpcUrl) });
    const mainnetSigner = toClientEvmSigner(account, mainnetClient);

    const sepoliaClient = createPublicClient({ chain: baseSepolia, transport: http(this.rpcUrl) });
    const sepoliaSigner = toClientEvmSigner(account, sepoliaClient);

    return [
      {
        network: "eip155:8453" as const,
        client: new ExactEvmScheme(mainnetSigner),
      },
      {
        network: "eip155:84532" as const,
        client: new ExactEvmScheme(sepoliaSigner),
      },
    ];
  }
}
