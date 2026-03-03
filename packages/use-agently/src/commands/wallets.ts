import { Command } from "commander";
import { getConfigOrThrow } from "../config.js";
import { output } from "../output.js";
import { loadWallet } from "../wallets/wallet.js";

export const walletsCommand = new Command("wallets")
  .description("Show current wallet info")
  .option("--show-mnemonic", "Reveal the mnemonic seed phrase in the output (sensitive)")
  .action(async (options: { showMnemonic?: boolean }, command: Command) => {
    const config = await getConfigOrThrow();
    const wallet = loadWallet(config.wallet);

    const result: Record<string, string> = {
      type: wallet.type,
      address: wallet.address,
    };

    if (config.wallet.type === "evm-mnemonic") {
      result.mnemonic = options.showMnemonic
        ? (config.wallet.mnemonic as string)
        : "[hidden - use --show-mnemonic to reveal]";
    }

    output(command, result);
  });
