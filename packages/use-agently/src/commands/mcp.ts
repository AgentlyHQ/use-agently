import { Command } from "commander";
import boxen from "boxen";
import { formatUnits } from "viem";
import {
  type TransactionMode,
  DryRunTransaction,
  PayTransaction,
  DryRunPaymentRequired,
  getChainConfigByNetwork,
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

        const content = result.content as Array<{ type: string; text?: string }>;

        // Handle error responses
        if (result.isError) {
          const text = content?.find((c) => c.type === "text")?.text;
          if (text) {
            try {
              const parsed = JSON.parse(text);
              if (parsed?.error && Array.isArray(parsed?.accepts) && parsed.accepts.length > 0) {
                let message: string;
                if (parsed.error === "insufficient_funds") {
                  const req = parsed.accepts[0];
                  let amountStr = "unknown amount";
                  try {
                    const { usdcDecimals } = getChainConfigByNetwork(req.network);
                    const raw = formatUnits(BigInt(req.amount), usdcDecimals);
                    const formatted = raw.includes(".") ? raw.replace(/\.?0+$/, "") : raw;
                    amountStr = `$${formatted} USDC on ${req.network}`;
                  } catch {
                    amountStr = `${req.amount} (raw units)`;
                  }
                  message = `Insufficient funds to pay for this tool.\nRequired: ${amountStr}\nEnsure your wallet has sufficient USDC balance and try again.`;
                } else {
                  message = `Payment error: ${parsed.error}`;
                }
                console.error(
                  boxen(message, {
                    title: parsed.error === "insufficient_funds" ? "Insufficient Funds" : "Payment Error",
                    titleAlignment: "center",
                    borderColor: "red",
                    padding: 1,
                  }),
                );
                process.exit(1);
              }
            } catch {
              // Not JSON — fall through to print as-is
            }
            console.error(text);
          } else {
            console.error("Tool call returned an error with no text content.");
          }
          process.exit(1);
        }

        // Success: extract text entries when all content is text, otherwise output the full result
        if (content?.every((c) => c.type === "text" && c.text)) {
          const texts = content.map((c) => c.text!);
          output(command, texts.length === 1 ? texts[0] : texts);
        } else {
          output(command, result);
        }
      } catch (err) {
        if (err instanceof DryRunPaymentRequired) handleDryRunError(err);
        throw err;
      }
    },
  );

mcpCommand.addCommand(mcpToolsCommand);
mcpCommand.addCommand(mcpCallCommand);
