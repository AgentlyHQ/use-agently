import { Command } from "commander";
import { output } from "../output.js";

const MCP_PROTOCOL_VERSION = "2024-11-05";

interface JsonRpcResponse {
  jsonrpc: string;
  id?: number | string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

async function mcpRequest(serverUrl: string, method: string, id: number, params?: unknown): Promise<JsonRpcResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };

  const body = JSON.stringify({ jsonrpc: "2.0", id, method, ...(params !== undefined ? { params } : {}) });
  const response = await fetch(serverUrl, { method: "POST", headers, body });

  if (!response.ok) {
    throw new Error(`MCP server returned HTTP ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/event-stream")) {
    const text = await response.text();
    for (const line of text.split("\n")) {
      if (line.startsWith("data: ")) {
        const parsed: JsonRpcResponse = JSON.parse(line.slice(6));
        if (parsed.id === id) return parsed;
      }
    }
    throw new Error("No matching result found in SSE stream");
  }

  return (await response.json()) as JsonRpcResponse;
}

export const mcpCommand = new Command("mcp")
  .description("Connect to an MCP server and list its capabilities")
  .argument("<url>", "MCP server URL")
  .action(async (url: string, _options: Record<string, unknown>, command: Command) => {
    let nextId = 1;
    const initResponse = await mcpRequest(url, "initialize", nextId++, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "use-agently", version: "0.0.0" },
    });

    if (initResponse.error) {
      throw new Error(`MCP initialize failed: ${initResponse.error.message}`);
    }

    const initResult = initResponse.result as {
      serverInfo?: { name?: string; version?: string };
      capabilities?: Record<string, unknown>;
      protocolVersion?: string;
    };

    // Send initialized notification — no response expected; ignore errors
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    }).catch(() => {});

    const [toolsResp, resourcesResp, promptsResp] = await Promise.allSettled([
      mcpRequest(url, "tools/list", nextId++),
      mcpRequest(url, "resources/list", nextId++),
      mcpRequest(url, "prompts/list", nextId++),
    ]);

    const tools =
      toolsResp.status === "fulfilled" && !toolsResp.value.error
        ? ((toolsResp.value.result as { tools?: unknown[] })?.tools ?? [])
        : [];
    const resources =
      resourcesResp.status === "fulfilled" && !resourcesResp.value.error
        ? ((resourcesResp.value.result as { resources?: unknown[] })?.resources ?? [])
        : [];
    const prompts =
      promptsResp.status === "fulfilled" && !promptsResp.value.error
        ? ((promptsResp.value.result as { prompts?: unknown[] })?.prompts ?? [])
        : [];

    output(command, {
      server: initResult.serverInfo,
      protocolVersion: initResult.protocolVersion,
      capabilities: initResult.capabilities,
      tools,
      resources,
      prompts,
    });
  });
