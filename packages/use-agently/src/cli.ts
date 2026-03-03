import { Command } from "commander";
import { initCommand } from "./commands/init";
import { whoamiCommand } from "./commands/whoami";
import { balanceCommand } from "./commands/balance";
import { agentsCommand } from "./commands/agents";
import { a2aCommand, a2aCardCommand } from "./commands/a2a";
import { webCommand, webGetCommand, webPutCommand, webDeleteCommand } from "./commands/web";
import { doctorCommand } from "./commands/doctor";
import { updateCommand } from "./commands/update";

import pkg from "../package.json" with { type: "json" };

export const cli = new Command();

cli
  .name("use-agently")
  .description(
    "Agently is the way AI coordinate and transact. The routing and settlement layer for your agent economy.",
  )
  .version(pkg.version)
  .option("-o, --output <format>", "Output format (text, json)", "text")
  .action(() => {
    cli.outputHelp();
  });

// Diagnostics
cli.addCommand(doctorCommand.helpGroup("Diagnostics"));
cli.addCommand(whoamiCommand.helpGroup("Diagnostics"));
cli.addCommand(balanceCommand.helpGroup("Diagnostics"));

// Discovery
cli.addCommand(agentsCommand.helpGroup("Discovery"));

// Protocols
cli.addCommand(a2aCommand.helpGroup("Protocols"));
cli.addCommand(a2aCardCommand.helpGroup("Protocols"));
cli.addCommand(webCommand.helpGroup("Protocols"));
cli.addCommand(webGetCommand.helpGroup("Protocols"));
cli.addCommand(webPutCommand.helpGroup("Protocols"));
cli.addCommand(webDeleteCommand.helpGroup("Protocols"));

// Lifecycle
cli.addCommand(initCommand.helpGroup("Lifecycle"));
cli.addCommand(updateCommand.helpGroup("Lifecycle"));
