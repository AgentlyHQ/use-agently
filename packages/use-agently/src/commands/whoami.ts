import { Command } from "commander";
import { output } from "../output";
import { getConfigOrThrow, getActiveProvider } from "../config";
import { resolveWallet } from "../wallet";

export const whoamiCommand = new Command("whoami")
  .description("Show current wallet info")
  .showHelpAfterError(true)
  .addHelpText("after", "\nExamples:\n  use-agently whoami")
  .action(async (_options: Record<string, never>, command: Command) => {
    const config = await getConfigOrThrow();
    const wallet = await resolveWallet(config);
    const provider = getActiveProvider(config);

    output(command, {
      namespace: "eip155",
      address: wallet.address,
      provider,
    });
  });
