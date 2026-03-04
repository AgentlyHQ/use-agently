import { Command } from "commander";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { output } from "../output.js";
import { loadConfig } from "../config.js";
import { loadWallet } from "../wallets/wallet.js";
import { createMcpPaymentClient } from "../client.js";
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
  .addHelpText(
    "after",
    '\nExamples:\n  use-agently mcp call echo \'{"message":"hello"}\' --uri http://localhost:3000\n  use-agently mcp call echo --uri my-agent',
  )
  .action(async (tool: string, argsStr: string | undefined, options: { uri?: string }, command: Command) => {
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
      const config = await loadConfig();
      if (config?.wallet) {
        const wallet = loadWallet(config.wallet);
        const x402Client = createMcpPaymentClient(client, wallet);
        const result = await x402Client.callTool(tool, args);
        output(command, result);
      } else {
        const result = await client.callTool({ name: tool, arguments: args });
        output(command, result);
      }
    } finally {
      await client.close();
    }
  });

mcpCommand.addCommand(mcpToolsCommand);
mcpCommand.addCommand(mcpCallCommand);
