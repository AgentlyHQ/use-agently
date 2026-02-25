import { Command } from "commander";
import { createPublicClient, http, formatEther } from "viem";
import { base } from "viem/chains";
import { getConfigOrThrow } from "../config.js";
import { loadWallet } from "../wallets/wallet.js";

export const balanceCommand = new Command("balance")
  .description("Check wallet balance on-chain")
  .option("--rpc <url>", "Custom RPC URL")
  .action(async (options: { rpc?: string }) => {
    const config = await getConfigOrThrow();
    const wallet = loadWallet(config.wallet);

    const client = createPublicClient({
      chain: base,
      transport: http(options.rpc),
    });

    const balance = await client.getBalance({ address: wallet.address as `0x${string}` });
    console.log(`Address: ${wallet.address}`);
    console.log(`Balance: ${formatEther(balance)} ETH (Base)`);
  });
