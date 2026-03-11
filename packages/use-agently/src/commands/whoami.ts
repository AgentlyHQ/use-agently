import { Command } from "commander";
import { output } from "../output.js";
import { loadWallet } from "@use-agently/sdk";
import { getConfigOrThrow } from "../config.js";

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
