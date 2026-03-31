import { Command } from "commander";
import { getConfigOrThrow, saveConfig, getMaxSpendPerCall, loadConfig, getActiveProvider } from "../config";
import { output, getOutputFormat, Table, boldBlue } from "../output";
import { detectProviders, getProvider } from "../providers";

export const walletCommand = new Command("wallet")
  .description("Manage wallet settings (providers, spend limits)")
  .addHelpText(
    "after",
    "\nExamples:\n  use-agently wallet providers\n  use-agently wallet set agentcash\n  use-agently wallet spend\n  use-agently wallet spend set-max 0.5",
  )
  .action(function () {
    (this as Command).outputHelp();
  });

// ─── wallet providers ─────────────────────────────────────────────────────────

const providersCommand = new Command("providers")
  .description("List detected wallet providers")
  .showHelpAfterError(true)
  .addHelpText("after", "\nExamples:\n  use-agently wallet providers\n  use-agently wallet providers -o json")
  .action(async (_options: unknown, command: Command) => {
    const config = await loadConfig();
    const activeProvider = config ? getActiveProvider(config) : "local";
    const detected = await detectProviders(activeProvider);
    const format = getOutputFormat(command);

    if (format === "json") {
      for (const p of detected) {
        console.log(JSON.stringify(p));
      }
    } else {
      const table = new Table({ head: ["Provider", "Address", "Status"] });
      for (const p of detected) {
        const status = p.active ? "active" : p.installed ? "installed" : "not installed";
        const name = p.active ? boldBlue(p.name) : p.name;
        table.push([name, p.address ?? "—", status]);
      }
      console.log(table.toString());
      console.log("\nSwitch provider: use-agently wallet set <provider>");
    }
  });

// ─── wallet set ───────────────────────────────────────────────────────────────

const setCommand = new Command("set")
  .description("Set the active wallet provider")
  .argument("<provider>", 'Provider type (e.g. "agentcash", "local")')
  .showHelpAfterError(true)
  .addHelpText("after", "\nExamples:\n  use-agently wallet set agentcash\n  use-agently wallet set local")
  .action(async (providerType: string, _options: unknown, command: Command) => {
    const provider = getProvider(providerType);
    if (!provider) {
      const detected = await detectProviders();
      const available = detected.map((p) => p.type).join(", ");
      throw new Error(`Unknown provider "${providerType}". Available: ${available}`);
    }

    const { installed } = await provider.detect();
    if (!installed) {
      throw new Error(`Provider "${providerType}" (${provider.name}) is not installed.`);
    }

    let config = await loadConfig();
    if (!config) {
      config = { wallet: { type: "none" } };
    }

    (config.wallet as Record<string, unknown>).provider = providerType;
    await saveConfig(config);

    const { address } = await provider.detect();
    output(command, {
      provider: providerType,
      address,
      message: `Switched to ${provider.name} wallet`,
    });
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
walletCommand.addCommand(providersCommand);
walletCommand.addCommand(setCommand);
walletCommand.addCommand(spendCommand);
