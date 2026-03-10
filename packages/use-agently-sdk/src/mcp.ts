import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import pkg from "../package.json" with { type: "json" };

export function resolveMcpUrl(input: string): string {
  const isDirectUrl = input.startsWith("http://") || input.startsWith("https://");
  const base = isDirectUrl ? input : `https://use-agently.com/${input}/services/mcp`;
  const url = new URL(base);
  if (!url.pathname.endsWith("/mcp") && !url.pathname.endsWith("/mcp/")) {
    url.pathname = url.pathname.replace(/\/?$/, "/mcp");
  }
  return url.toString();
}

export async function createMcpClient(mcpUrl: string): Promise<Client> {
  const client = new Client({ name: "@use-agently/sdk", version: pkg.version });
  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
  await client.connect(transport);
  return client;
}
