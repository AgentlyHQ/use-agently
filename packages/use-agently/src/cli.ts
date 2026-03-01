import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { whoamiCommand, printWhoami } from "./commands/whoami.js";
import { balanceCommand, printBalance } from "./commands/balance.js";
import { agentsCommand, printAgents } from "./commands/agents.js";
import { a2aCommand, printA2A } from "./commands/a2a.js";
import { doctorCommand, printDoctor } from "./commands/doctor.js";
import { flush, Printer } from "./output.js";

export const cli = new Command();

cli
  .name("use-agently")
  .description("use-agently CLI")
  .version("0.0.0")
  .option("--output <format>", "Output format (json, text)");

const printers: Record<string, Printer> = {
  whoami: printWhoami,
  balance: printBalance,
  agents: printAgents,
  a2a: printA2A,
  doctor: printDoctor,
};

cli.hook("postAction", (thisCommand, actionCommand) => {
  flush(printers[actionCommand.name()], thisCommand.opts().output as string | undefined);
});

cli.addCommand(initCommand);
cli.addCommand(whoamiCommand);
cli.addCommand(balanceCommand);
cli.addCommand(agentsCommand);
cli.addCommand(a2aCommand);
cli.addCommand(doctorCommand);
