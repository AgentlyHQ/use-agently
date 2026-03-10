import { randomUUID } from "node:crypto";
import type { AgentCard } from "@a2a-js/sdk";
import { DefaultAgentCardResolver } from "@a2a-js/sdk/client";
import { DryRunTransaction, type TransactionMode } from "./utils/transaction.js";
import { createA2AClient, createDryRunFetch, createPaymentFetch } from "./client.js";

export interface A2AMessageOptions {
  transaction?: TransactionMode;
}

export interface A2AMessageResult {
  text: string;
  raw: unknown;
}

function extractTextFromParts(parts: any[]): string {
  return parts
    .filter((p) => p.kind === "text")
    .map((p) => p.text)
    .join("");
}

/** Defaults to dry-run when no transaction mode is provided */
function resolveFetchForTransaction(transaction: TransactionMode = DryRunTransaction): typeof fetch {
  if (transaction.mode === "dry-run") return createDryRunFetch();
  return createPaymentFetch(transaction.wallet) as typeof fetch;
}

function resolveAgentUrl(agentInput: string): string {
  const isDirectUrl = agentInput.startsWith("http://") || agentInput.startsWith("https://");
  return isDirectUrl ? agentInput : `https://use-agently.com/${agentInput}/`;
}

export function extractAgentText(result: any): string {
  if (!result) {
    return "The agent processed your request but returned no response.";
  }

  // Direct message response
  if (result.kind === "message" && result.parts) {
    return extractTextFromParts(result.parts);
  }

  // Task-based response — agent messages
  const messages = result.kind === "task" ? result.messages : result.task?.messages || result.messages;
  if (messages) {
    const text = messages
      .filter((m: { role: string }) => m.role === "agent")
      .flatMap((m: { parts: unknown[] }) => extractTextFromParts(m.parts))
      .join("\n");
    if (text) return text;
  }

  // Task artifacts response
  const artifacts = result.artifacts || result.task?.artifacts;
  if (artifacts && artifacts.length > 0) {
    const text = artifacts.flatMap((a: { parts: unknown[] }) => extractTextFromParts(a.parts)).join("\n");
    if (text) return text;
  }

  return result.text || "The agent processed your request but returned no text response.";
}

export function extractStreamEventText(event: any): string {
  if (event.kind === "artifact-update") {
    return extractTextFromParts(event.artifact?.parts || []);
  }
  if (event.kind === "message" && event.role === "agent") {
    return extractTextFromParts(event.parts || []);
  }
  return "";
}

/** Send a message to an A2A agent and return the complete result. */
export async function sendA2AMessage(
  uri: string,
  message: string,
  options?: A2AMessageOptions,
): Promise<A2AMessageResult> {
  const agentUrl = resolveAgentUrl(uri);
  const fetchImpl = resolveFetchForTransaction(options?.transaction);
  const client = await createA2AClient(agentUrl, fetchImpl);

  const result = await client.sendMessage({
    message: {
      kind: "message",
      messageId: randomUUID(),
      role: "user",
      parts: [{ kind: "text", text: message }],
    },
  });

  return { text: extractAgentText(result), raw: result };
}

/** Send a message to an A2A agent and return the stream for real-time iteration. */
export async function sendA2AMessageStream(
  uri: string,
  message: string,
  options?: A2AMessageOptions,
): Promise<AsyncIterable<unknown>> {
  const agentUrl = resolveAgentUrl(uri);
  const fetchImpl = resolveFetchForTransaction(options?.transaction);
  const client = await createA2AClient(agentUrl, fetchImpl);

  return client.sendMessageStream({
    message: {
      kind: "message",
      messageId: randomUUID(),
      role: "user",
      parts: [{ kind: "text", text: message }],
    },
  });
}

/** Resolve a URI and fetch the A2A agent card. */
export async function getA2ACard(uri: string): Promise<AgentCard> {
  const agentUrl = resolveAgentUrl(uri);
  const resolver = new DefaultAgentCardResolver();
  return resolver.resolve(agentUrl);
}
