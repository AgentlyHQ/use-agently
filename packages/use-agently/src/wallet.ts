import type { Config, Wallet } from "@use-agently/sdk";
import { getActiveProvider } from "./config";
import { loadWalletFromProvider } from "./providers";

export async function resolveWallet(config: Config): Promise<Wallet> {
  return loadWalletFromProvider(getActiveProvider(config));
}
