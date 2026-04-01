import { Command } from "commander";
import { initCommand } from "./commands/init";
import { whoamiCommand } from "./commands/whoami";
import { balanceCommand } from "./commands/balance";
import { searchCommand } from "./commands/search";
import { viewCommand } from "./commands/view";
import { a2aCommand } from "./commands/a2a";
import { mcpCommand } from "./commands/mcp";
import { toolsCommand } from "./commands/tools";
import { webCommand } from "./commands/web";
import { doctorCommand } from "./commands/doctor";
import { updateCommand } from "./commands/update";
import { walletCommand } from "./commands/wallet";

import pkg from "../package.json" with { type: "json" };

export const cli = new Command();

cli
  .name("use-agently")
  .description(
    "Agently is the way AI coordinate and transact. All protocol interactions (A2A, MCP, Web/HTTP) go through this CLI.",
  )
  .version(pkg.version)
  .option("-o, --output <format>", "Output format (tui, json)", process.stdout.isTTY ? "tui" : "json")
  .argument("[args...]")
  .action((args: string[]) => {
    if (args.length > 0) {
      // @ts-expect-error — unknownCommand() is an undocumented Commander.js method
      cli.unknownCommand();
      return;
    }
    cli.outputHelp();
  });

// Diagnostics
cli.addCommand(doctorCommand.helpGroup("Diagnostics"));
cli.addCommand(whoamiCommand.helpGroup("Diagnostics"));
cli.addCommand(balanceCommand.helpGroup("Diagnostics"));

// Discovery
cli.addCommand(searchCommand.helpGroup("Discovery"));
cli.addCommand(viewCommand.helpGroup("Discovery"));

// Protocols
cli.addCommand(a2aCommand.helpGroup("Protocols"));
cli.addCommand(toolsCommand.helpGroup("Protocols"));
cli.addCommand(mcpCommand.helpGroup("Protocols"));
cli.addCommand(webCommand.helpGroup("Protocols"));

// Lifecycle
cli.addCommand(initCommand.helpGroup("Lifecycle"));
cli.addCommand(walletCommand.helpGroup("Lifecycle"));
cli.addCommand(updateCommand.helpGroup("Lifecycle"));

cli.addHelpText(
  "after",
  `
Getting started: use-agently init → use-agently doctor → use-agently search

Quick Reference:

  Send a message or fetch an agent card via A2A:
    a2a send -u <uri> -m <message> [--pay]
    a2a card -u <uri>

  List or call tools on an MCP server:
    tools -u <uri>
    tools call -u <uri> --tool <name> [--args <json>] [--pay]

  (Legacy) List or call tools via the MCP command:
    mcp tools -u <uri>
    mcp call  -u <uri> --tool <name> [--args <json>] [--pay]

  HTTP requests with x402 payment support:
    web get|post|put|patch|delete <url> [-d <body>] [-H <header>] [-v] [--pay]

  Manage wallet providers and spend limits:
    wallet providers
    wallet set <provider>
    wallet spend
    wallet spend set-max <value>

  <uri> = HTTP URL or CAIP-19 ID (e.g. eip155:8453/erc8004:0x…/1)
  Run "use-agently <command> -h" for full option details.`,
);

// Propagate showGlobalOptions to all subcommands added via addCommand(),
// which does not inherit configureHelp from the parent.
function enableGlobalOptionsInHelp(cmd: Command) {
  for (const sub of cmd.commands) {
    sub.configureHelp({ showGlobalOptions: true });
    enableGlobalOptionsInHelp(sub);
  }
}
enableGlobalOptionsInHelp(cli);
