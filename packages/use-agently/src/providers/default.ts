import { loadWallet, type Wallet } from "@use-agently/sdk";
import { loadConfig } from "../config";
import type { WalletProvider } from "./index";

export const defaultProvider: WalletProvider = {
  type: "local",
  name: "Default",

  async detect(): Promise<{ installed: boolean; address?: string }> {
    const config = await loadConfig();
    const wallet = config?.wallet;
    if (!wallet?.type || wallet.type === "none") return { installed: false };
    return { installed: true, address: (wallet as Record<string, unknown>).address as string | undefined };
  },

  async loadWallet(): Promise<Wallet> {
    const config = await loadConfig();
    if (!config?.wallet?.type || config.wallet.type === "none") {
      throw new Error("No built-in wallet configured. Run 'use-agently init' to create one.");
    }
    return loadWallet(config.wallet);
  },
};
