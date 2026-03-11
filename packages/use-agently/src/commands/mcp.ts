import { Command } from "commander";
import {
  type TransactionMode,
  DryRunTransaction,
  PayTransaction,
  DryRunPaymentRequired,
  loadWallet,
  listMcpTools,
  callMcpTool,
} from "@use-agently/sdk";
import { getConfigOrThrow } from "../config.js";
import { clientFetch, handleDryRunError } from "../client.js";
import pkg from "../../package.json" with { type: "json" };
import { output } from "../output.js";

function resolveUriOption(options: { uri?: string }, commandName: string): string {
  if (!options.uri) {
    throw new Error(
      `Missing required option --uri for '${commandName}'.\nExpected a URL or agent URI, e.g. --uri http://localhost:3000 or --uri my-agent`,
    );
  }
  return options.uri;
}

async function resolveTransactionMode(pay?: boolean): Promise<TransactionMode> {
  if (pay) {
    const config = await getConfigOrThrow();
    const wallet = loadWallet(config.wallet);
    return PayTransaction(wallet);
  }
  return DryRunTransaction;
}

export const mcpCommand = new Command("mcp")
  .description("Connect to an MCP server and list or call tools")
  .action(function () {
    (this as Command).outputHelp();
  });

const mcpToolsCommand = new Command("tools")
  .description("List available tools on an MCP server")
  .option("--uri <value>", "MCP server URI or URL")
  .addHelpText(
    "after",
    "\nExamples:\n  use-agently mcp tools --uri http://localhost:3000\n  use-agently mcp tools --uri my-agent",
  )
  .action(async (options: { uri?: string }, command: Command) => {
    const uri = resolveUriOption(options, "mcp tools");
    const tools = await listMcpTools(uri, {
      clientInfo: { name: "use-agently", version: pkg.version },
      fetchImpl: clientFetch,
    });
    output(command, tools);
  });

const mcpCallCommand = new Command("call")
  .description("Call a specific tool on an MCP server")
  .argument("<tool>", "Tool name to call")
  .argument("[args]", "JSON arguments to pass to the tool")
  .option("--uri <value>", "MCP server URI or URL")
  .option("--pay", "Authorize payment if the tool requires it (default: dry-run, shows cost only)")
  .addHelpText(
    "after",
    '\nExamples:\n  use-agently mcp call echo \'{"message":"hello"}\' --uri http://localhost:3000\n  use-agently mcp call echo --uri my-agent\n  use-agently mcp call paid-tool \'{"message":"hello"}\' --uri my-agent --pay',
  )
  .action(
    async (tool: string, argsStr: string | undefined, options: { uri?: string; pay?: boolean }, command: Command) => {
      const uri = resolveUriOption(options, "mcp call");
      let args: Record<string, unknown> = {};
      if (argsStr !== undefined) {
        try {
          args = JSON.parse(argsStr);
        } catch {
          throw new Error(`Invalid JSON in <args>: ${argsStr}\nExpected a JSON object, e.g. '{"message":"hello"}'`);
        }
      }
      const transaction = await resolveTransactionMode(options.pay);

      try {
        const result = await callMcpTool(uri, tool, args, {
          transaction,
          clientInfo: { name: "use-agently", version: pkg.version },
          fetchImpl: clientFetch,
        });
        output(command, result);
      } catch (err) {
        if (err instanceof DryRunPaymentRequired) handleDryRunError(err);
        throw err;
      }
    },
  );

mcpCommand.addCommand(mcpToolsCommand);
mcpCommand.addCommand(mcpCallCommand);
