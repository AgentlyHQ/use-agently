import { Command } from "commander";
import { getConfigOrThrow, saveConfig, getMaxSpendPerCall } from "../config";
import { output } from "../output";

export const walletCommand = new Command("wallet")
  .description("Manage wallet settings (spend limits)")
  .addHelpText("after", "\nExamples:\n  use-agently wallet spend\n  use-agently wallet spend set-max 0.5")
  .action(function () {
    (this as Command).outputHelp();
  });

// ─── wallet spend ────────────────────────────────────────────────────────────

const spendCommand = new Command("spend")
  .description("View or manage wallet spend limits")
  .showHelpAfterError(true)
  .addHelpText("after", "\nExamples:\n  use-agently wallet spend\n  use-agently wallet spend set-max 0.5")
  .action(async (_options: unknown, command: Command) => {
    const config = await getConfigOrThrow();
    output(command, { max: getMaxSpendPerCall(config) });
  });

const setMaxCommand = new Command("set-max")
  .description("Set the maximum USD spend per call")
  .argument("<value>", "Max spend in USD (0–1, e.g. 0.5)")
  .showHelpAfterError(true)
  .addHelpText("after", "\nExamples:\n  use-agently wallet spend set-max 0.5\n  use-agently wallet spend set-max 1")
  .action(async (value: string, _options: unknown, command: Command) => {
    const amount = Number(value);
    if (Number.isNaN(amount) || amount < 0 || amount > 1) {
      throw new Error(`Invalid value "${value}". Must be a number between 0 and 1 (e.g. 0.1, 0.5, 1).`);
    }

    const config = await getConfigOrThrow();
    (config.wallet as Record<string, unknown>).spend = { max: amount };
    await saveConfig(config);

    output(command, { max: amount });
  });

spendCommand.addCommand(setMaxCommand);
walletCommand.addCommand(spendCommand);
