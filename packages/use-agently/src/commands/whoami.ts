import { Command } from "commander";
import { getConfigOrThrow } from "../config.js";
import { output } from "../output.js";
import { loadWallet } from "../wallets/wallet.js";

export const whoamiCommand = new Command("whoami")
  .description("Show current wallet info")
  .action(async (_options: Record<string, never>, command: Command) => {
    const config = await getConfigOrThrow();
    const wallet = loadWallet(config.wallet);

    output(command, {
      namespace: "eip155",
      address: wallet.address,
    });
  });
