import { Command } from "commander";
import { initCommand } from "./commands/init";
import { whoamiCommand } from "./commands/whoami";
import { balanceCommand } from "./commands/balance";
import { agentsCommand } from "./commands/agents";
import { searchCommand } from "./commands/search";
import { a2aCommand } from "./commands/a2a";
import { mcpCommand } from "./commands/mcp";
import { erc8004Command } from "./commands/erc8004";
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
cli.addCommand(searchCommand.helpGroup("Discovery"));

// Protocols
cli.addCommand(a2aCommand.helpGroup("Protocols"));
cli.addCommand(mcpCommand.helpGroup("Protocols"));
cli.addCommand(erc8004Command.helpGroup("Protocols"));

// Lifecycle
cli.addCommand(initCommand.helpGroup("Lifecycle"));
cli.addCommand(updateCommand.helpGroup("Lifecycle"));
