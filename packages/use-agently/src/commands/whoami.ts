import { Command } from "commander";
import { getConfigOrThrow } from "../config.js";
import { loadWallet } from "../wallets/wallet.js";
import { resolveOutputFormat, outputResult } from "../output.js";

export const whoamiCommand = new Command("whoami")
  .description("Show current wallet info")
  .option("--output <format>", "Output format (json, text)")
  .action(async (options: { output?: string }) => {
    const config = await getConfigOrThrow();
    const wallet = loadWallet(config.wallet);
    const data = { type: wallet.type, address: wallet.address };
    const format = resolveOutputFormat(options.output, config.output);

    outputResult(data, format, (d) => {
      console.log(`Type:    ${d.type}`);
      console.log(`Address: ${d.address}`);
    });
  });
