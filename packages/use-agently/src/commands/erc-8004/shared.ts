import type { Command } from "commander";

export interface SharedOptions {
  chainId?: number;
  rpcUrl?: string;
  registry?: string;
  broadcast?: boolean;
  outDir?: string;
}

export function addSharedOptions(cmd: Command): Command {
  return cmd
    .option("--chain-id <chainId>", "Target chain ID (e.g. 1, 11155111, 84532)", (v) => parseInt(v, 10))
    .option("--rpc-url <url>", "Custom RPC URL (uses default if not provided)")
    .option("--registry <address>", "Contract address of the registry")
    .option("--broadcast", "Sign and broadcast the transaction (default: dry-run)");
}
