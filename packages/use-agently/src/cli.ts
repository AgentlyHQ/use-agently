import { Command } from "commander";
import { initCommand } from "./commands/init";
import { whoamiCommand } from "./commands/whoami";
import { balanceCommand } from "./commands/balance";
import { agentsCommand } from "./commands/agents";
import { a2aCommand, a2aCardCommand } from "./commands/a2a";
import { doctorCommand } from "./commands/doctor";
import { updateCommand } from "./commands/update";

export const cli = new Command();

cli
  .name("use-agently")
  .description("use-agently CLI")
  .version("0.0.0")
  .option("-o, --output <format>", "Output format (text, json)", "text")
  .helpCommand(true);

// Diagnostics
cli.addCommand(doctorCommand.helpGroup("Diagnostics"));
cli.addCommand(whoamiCommand.helpGroup("Diagnostics"));
cli.addCommand(balanceCommand.helpGroup("Diagnostics"));

// Discovery
cli.addCommand(agentsCommand.helpGroup("Discovery"));

// Protocols
cli.addCommand(a2aCommand.helpGroup("Protocols"));
cli.addCommand(a2aCardCommand.helpGroup("Protocols"));

// Lifecycle
cli.addCommand(initCommand.helpGroup("Lifecycle"));
cli.addCommand(updateCommand.helpGroup("Lifecycle"));
