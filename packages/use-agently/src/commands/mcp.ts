import { Command } from "commander";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { output } from "../output.js";
import { loadConfig } from "../config.js";
import { loadWallet } from "../wallets/wallet.js";
import { createMcpPaymentClient, DryRunPaymentRequired } from "../client.js";
import pkg from "../../package.json" with { type: "json" };

function resolveMcpUrl(input: string): string {
  const isDirectUrl = input.startsWith("http://") || input.startsWith("https://");
  const base = isDirectUrl ? input : `https://use-agently.com/${input}/`;
  const url = new URL(base);
  if (!url.pathname.endsWith("/mcp") && !url.pathname.endsWith("/mcp/")) {
    url.pathname = url.pathname.replace(/\/?$/, "/mcp");
  }
  return url.toString();
}

async function createMcpClient(mcpUrl: string): Promise<Client> {
  const client = new Client({ name: "use-agently", version: pkg.version });
  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
  await client.connect(transport);
  return client;
}

function resolveUriOption(options: { uri?: string }, commandName: string): string {
  if (!options.uri) {
    throw new Error(
      `Missing required option --uri for '${commandName}'.\nExpected a URL or agent URI, e.g. --uri http://localhost:3000 or --uri my-agent`,
    );
  }
  return options.uri;
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
    const mcpUrl = resolveMcpUrl(resolveUriOption(options, "mcp tools"));
    const client = await createMcpClient(mcpUrl);
    try {
      const { tools } = await client.listTools();
      output(command, tools);
    } finally {
      await client.close();
    }
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
      const mcpUrl = resolveMcpUrl(resolveUriOption(options, "mcp call"));
      let args: Record<string, unknown> = {};
      if (argsStr !== undefined) {
        try {
          args = JSON.parse(argsStr);
        } catch {
          throw new Error(`Invalid JSON in <args>: ${argsStr}\nExpected a JSON object, e.g. '{"message":"hello"}'`);
        }
      }
      const client = await createMcpClient(mcpUrl);
      try {
        if (options.pay) {
          const config = await loadConfig();
          if (!config?.wallet) {
            throw new Error("No wallet configured. Run `use-agently init` first.");
          }
          const wallet = loadWallet(config.wallet);
          const x402Client = createMcpPaymentClient(client, wallet);
          const result = await x402Client.callTool(tool, args);
          output(command, result);
        } else {
          const result = await client.callTool({ name: tool, arguments: args });
          if (result.isError) {
            const content = result.content as Array<{ type: string; text?: string }>;
            if (content?.length > 0 && content[0].type === "text" && content[0].text) {
              try {
                const parsed = JSON.parse(content[0].text);
                // x402 MCP payment-required errors encode PaymentRequired as JSON in the first content item
                if (parsed?.accepts) {
                  throw new DryRunPaymentRequired(parsed.accepts);
                }
              } catch (e) {
                // Re-throw DryRunPaymentRequired; ignore other parse failures (not a payment error)
                if (e instanceof DryRunPaymentRequired) throw e;
              }
            }
          }
          output(command, result);
        }
      } catch (err) {
        if (err instanceof DryRunPaymentRequired) {
          console.error(err.message);
          process.exit(1);
        }
        throw err;
      } finally {
        await client.close();
      }
    },
  );

mcpCommand.addCommand(mcpToolsCommand);
mcpCommand.addCommand(mcpCallCommand);
