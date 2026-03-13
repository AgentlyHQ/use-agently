import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { x402MCPClient, x402MCPToolCallResult } from "@x402/mcp";
import { DryRunPaymentRequired, resolveFetchForTransaction, createMcpPaymentClient } from "./client.js";
import { DryRunTransaction, PayTransaction, type TransactionMode } from "./utils/transaction.js";
import type { Wallet } from "./wallets/wallet.js";
import pkg from "./package.json" with { type: "json" };

export interface McpCallOptions {
  transaction?: TransactionMode;
  fetchImpl?: typeof fetch;
  clientInfo?: { name: string; version: string };
}

export function resolveMcpUrl(input: string): string {
  const isDirectUrl = input.startsWith("http://") || input.startsWith("https://");
  const base = isDirectUrl ? input : `https://use-agently.com/${input}/services/mcp`;
  const url = new URL(base);
  if (!url.pathname.endsWith("/mcp") && !url.pathname.endsWith("/mcp/")) {
    url.pathname = url.pathname.replace(/\/?$/, "/mcp");
  }
  return url.toString();
}

async function createMcpClient(
  mcpUrl: string,
  options: { clientInfo?: { name: string; version: string }; fetchImpl?: typeof fetch; wallet: Wallet },
): Promise<x402MCPClient>;
async function createMcpClient(
  mcpUrl: string,
  options?: { clientInfo?: { name: string; version: string }; fetchImpl?: typeof fetch },
): Promise<Client>;
async function createMcpClient(
  mcpUrl: string,
  options?: { clientInfo?: { name: string; version: string }; fetchImpl?: typeof fetch; wallet?: Wallet },
): Promise<Client | x402MCPClient> {
  const client = new Client(options?.clientInfo ?? { name: "@use-agently/sdk", version: pkg.version });
  const transport = new StreamableHTTPClientTransport(
    new URL(mcpUrl),
    options?.fetchImpl ? { fetch: options.fetchImpl } : undefined,
  );

  if (options?.wallet) {
    const x402Client = createMcpPaymentClient(client, options.wallet);
    await x402Client.connect(transport);
    return x402Client;
  }

  await client.connect(transport);
  return client;
}

/** List all tools available on an MCP server. */
export async function listMcpTools(uri: string, options?: McpCallOptions): Promise<Tool[]> {
  const mcpUrl = resolveMcpUrl(uri);
  const resolvedFetch = resolveFetchForTransaction(options?.transaction, options?.fetchImpl);
  const client = await createMcpClient(mcpUrl, { clientInfo: options?.clientInfo, fetchImpl: resolvedFetch });
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
  options?: McpCallOptions & { transaction: PayTransaction },
): Promise<x402MCPToolCallResult>;
export async function callMcpTool(
  uri: string,
  tool: string,
  args?: Record<string, unknown>,
  options?: McpCallOptions & { transaction: DryRunTransaction },
): Promise<CallToolResult>;
export async function callMcpTool(
  uri: string,
  tool: string,
  args?: Record<string, unknown>,
  options?: McpCallOptions,
): Promise<CallToolResult | x402MCPToolCallResult>;
export async function callMcpTool(
  uri: string,
  tool: string,
  args?: Record<string, unknown>,
  options?: McpCallOptions,
): Promise<CallToolResult | x402MCPToolCallResult> {
  const mcpUrl = resolveMcpUrl(uri);
  const transaction = options?.transaction ?? DryRunTransaction;
  const resolvedFetch = resolveFetchForTransaction(transaction, options?.fetchImpl);

  if (transaction.mode === "pay") {
    // Use the caller's fetchImpl (e.g. User-Agent), but skip the payment-wrapped fetch —
    // x402MCPClient handles payment at the MCP protocol level.
    const x402Client = await createMcpClient(mcpUrl, {
      clientInfo: options?.clientInfo,
      fetchImpl: options?.fetchImpl,
      wallet: transaction.wallet,
    });
    try {
      return await x402Client.callTool(tool, args ?? {});
    } finally {
      await x402Client.close();
    }
  }

  // Dry-run mode
  const client = await createMcpClient(mcpUrl, { clientInfo: options?.clientInfo, fetchImpl: resolvedFetch });
  try {
    const result = await client.callTool({ name: tool, arguments: args ?? {} });
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
