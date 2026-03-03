import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { whoamiCommand } from "./commands/whoami.js";
import { balanceCommand } from "./commands/balance.js";
import { agentsCommand } from "./commands/agents.js";
import { a2aCommand } from "./commands/a2a.js";
import { doctorCommand } from "./commands/doctor.js";
import { mcpCommand } from "./commands/mcp.js";

export const cli = new Command();

cli
  .name("use-agently")
  .description("use-agently CLI")
  .version("0.0.0")
  .option("-o, --output <format>", "Output format (text, json)", "text");

cli.addCommand(initCommand);
cli.addCommand(whoamiCommand);
cli.addCommand(balanceCommand);
cli.addCommand(agentsCommand);
cli.addCommand(a2aCommand);
cli.addCommand(doctorCommand);
cli.addCommand(mcpCommand);
