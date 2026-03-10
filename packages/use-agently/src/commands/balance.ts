import { Command } from "commander";
import { output } from "../output.js";
import { getConfigOrThrow, loadWallet, getBalance } from "@use-agently/sdk";

export const balanceCommand = new Command("balance")
  .description("Check wallet balance on-chain")
  .option("--rpc <url>", "Custom RPC URL")
  .action(async (options: { rpc?: string }, command: Command) => {
    const config = await getConfigOrThrow();
    const wallet = loadWallet(config.wallet);
    const result = await getBalance(wallet.address, { rpc: options.rpc });
    output(command, result);
  });
