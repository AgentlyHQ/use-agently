import { Command } from "commander";
import { getConfigOrThrow } from "../config.js";
import { loadWallet } from "../wallets/wallet.js";
import { resolveOutputFormat, printJson } from "../output.js";

export const whoamiCommand = new Command("whoami")
  .description("Show current wallet info")
  .option("--output <format>", "Output format (json, text)")
  .action(async (options: { output?: string }) => {
    const config = await getConfigOrThrow();
    const wallet = loadWallet(config.wallet);
    const format = resolveOutputFormat(options.output, config.output);

    if (format === "json") {
      printJson({ type: wallet.type, address: wallet.address });
    } else {
      console.log(`Type:    ${wallet.type}`);
      console.log(`Address: ${wallet.address}`);
    }
  });
