import { Command } from "commander";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { output } from "../output.js";

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
  const client = new Client({ name: "use-agently", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
  await client.connect(transport);
  return client;
}

export const mcpCommand = new Command("mcp")
  .description("Connect to an MCP server and list or call tools")
  .argument("<url>", "MCP server URL or agent URI")
  .option("-t, --tool <name>", "Tool name to call")
  .option("-a, --args <json>", "JSON arguments to pass to the tool", "{}")
  .addHelpText(
    "after",
    '\nExamples:\n  use-agently mcp http://localhost:3000\n  use-agently mcp http://localhost:3000 --tool echo --args \'{"message":"hello"}\'',
  )
  .action(async (url: string, options: { tool?: string; args: string }, command: Command) => {
    const mcpUrl = resolveMcpUrl(url);
    const client = await createMcpClient(mcpUrl);

    try {
      if (options.tool) {
        let args: Record<string, unknown>;
        try {
          args = JSON.parse(options.args);
        } catch {
          throw new Error(
            `Invalid JSON in --args: ${options.args}\nExpected a JSON object, e.g. '{"message":"hello"}'`,
          );
        }
        const result = await client.callTool({ name: options.tool, arguments: args });
        output(command, result);
      } else {
        const { tools } = await client.listTools();
        output(command, tools);
      }
    } finally {
      await client.close();
    }
  });
