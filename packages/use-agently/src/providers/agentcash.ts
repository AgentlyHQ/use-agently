import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { z } from "zod";
import { loadWallet, type Wallet } from "@use-agently/sdk";
import type { WalletProvider } from "./index";

const WALLET_PATH = join(homedir(), ".agentcash", "wallet.json");

const walletSchema = z.object({
  privateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid Ethereum private key"),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  createdAt: z.string(),
});

async function readWalletFile(): Promise<z.infer<typeof walletSchema> | undefined> {
  let contents: string;
  try {
    contents = await readFile(WALLET_PATH, "utf8");
  } catch {
    return undefined;
  }
  const parsed = walletSchema.safeParse(JSON.parse(contents));
  if (!parsed.success) return undefined;
  return parsed.data;
}

export const agentcashProvider: WalletProvider = {
  type: "agentcash",
  name: "AgentCash",

  async detect(): Promise<{ installed: boolean; address?: string }> {
    const wallet = await readWalletFile();
    if (!wallet) return { installed: false };
    return { installed: true, address: wallet.address };
  },

  async loadWallet(): Promise<Wallet> {
    const wallet = await readWalletFile();
    if (!wallet) {
      throw new Error(
        `AgentCash wallet not found at ${WALLET_PATH}.\nInstall and create a wallet: npx agentcash wallet create`,
      );
    }
    return loadWallet({
      type: "evm-private-key",
      privateKey: wallet.privateKey,
      address: wallet.address,
    });
  },
};
