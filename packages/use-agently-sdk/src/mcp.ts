import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { DryRunPaymentRequired, createMcpPaymentClient } from "./client.js";
import { DryRunTransaction, type TransactionMode } from "./utils/transaction.js";
import pkg from "../package.json" with { type: "json" };

export interface McpCallOptions {
  transaction?: TransactionMode;
}

function resolveMcpUrl(input: string): string {
  const isDirectUrl = input.startsWith("http://") || input.startsWith("https://");
  const base = isDirectUrl ? input : `https://use-agently.com/${input}/services/mcp`;
  const url = new URL(base);
  if (!url.pathname.endsWith("/mcp") && !url.pathname.endsWith("/mcp/")) {
    url.pathname = url.pathname.replace(/\/?$/, "/mcp");
  }
  return url.toString();
}

async function createMcpClient(mcpUrl: string): Promise<Client> {
  const client = new Client({ name: "@use-agently/sdk", version: pkg.version });
  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
  await client.connect(transport);
  return client;
}

/** List all tools available on an MCP server. */
export async function listMcpTools(uri: string): Promise<Tool[]> {
  const mcpUrl = resolveMcpUrl(uri);
  const client = await createMcpClient(mcpUrl);
  try {
    const { tools } = await client.listTools();
    return tools;
  } finally {
    await client.close();
  }
}

/** Call a tool on an MCP server, with optional payment support. Defaults to dry-run mode. */
export async function callMcpTool(
  uri: string,
  tool: string,
  args?: Record<string, unknown>,
  options?: McpCallOptions,
): Promise<CallToolResult> {
  const mcpUrl = resolveMcpUrl(uri);
  const transaction = options?.transaction ?? DryRunTransaction;

  if (transaction.mode === "pay") {
    const client = await createMcpClient(mcpUrl);
    try {
      const x402Client = createMcpPaymentClient(client, transaction.wallet);
      return (await x402Client.callTool(tool, args ?? {})) as unknown as CallToolResult;
    } finally {
      await client.close();
    }
  }

  // Dry-run mode
  const client = await createMcpClient(mcpUrl);
  try {
    const result = await client.callTool({ name: tool, arguments: args });
    if (result.isError) {
      const content = result.content as Array<{ type: string; text?: string }>;
      if (content?.length > 0 && content[0].type === "text" && content[0].text) {
        try {
          const parsed = JSON.parse(content[0].text);
          if (parsed?.accepts) {
            throw new DryRunPaymentRequired(parsed.accepts);
          }
        } catch (e) {
          if (e instanceof DryRunPaymentRequired) throw e;
        }
      }
    }
    return result as CallToolResult;
  } finally {
    await client.close();
  }
}
