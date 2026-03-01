import { Command } from "commander";
import { createPublicClient, erc20Abi, formatUnits, http } from "viem";
import { base } from "viem/chains";
import { getConfigOrThrow } from "../config.js";
import { loadWallet } from "../wallets/wallet.js";
import { emit } from "../output.js";

const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

export const balanceCommand = new Command("balance")
  .description("Check wallet balance on-chain")
  .option("--rpc <url>", "Custom RPC URL")
  .option("--output <format>", "Output format (json, text)")
  .action(async (options: { rpc?: string }) => {
    const config = await getConfigOrThrow();
    const wallet = loadWallet(config.wallet);
    const address = wallet.address as `0x${string}`;

    const client = createPublicClient({
      chain: base,
      transport: http(options.rpc),
    });

    const balance = await client.readContract({
      address: BASE_USDC,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address],
    });

    const data = { address: wallet.address, balance: formatUnits(balance, 6), token: "USDC", chain: "Base" };

    emit(
      data,
      (d) => {
        console.log(`Address: ${d.address}`);
        console.log(`Balance: ${d.balance} USDC (Base)`);
      },
      config.output,
    );
  });
