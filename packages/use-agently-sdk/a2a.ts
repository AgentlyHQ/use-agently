import { randomUUID } from "node:crypto";
import type { AgentCard } from "@a2a-js/sdk";
import { DefaultAgentCardResolver } from "@a2a-js/sdk/client";
import { createA2AClient, resolveFetchForTransaction } from "./client.js";
import type { TransactionMode } from "./utils/transaction.js";

export interface A2AMessageOptions {
  transaction?: TransactionMode;
  fetchImpl?: typeof fetch;
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
  const resolvedFetch = resolveFetchForTransaction(options?.transaction, options?.fetchImpl);
  const client = await createA2AClient(agentUrl, resolvedFetch);

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
  const resolvedFetch = resolveFetchForTransaction(options?.transaction, options?.fetchImpl);
  const client = await createA2AClient(agentUrl, resolvedFetch);

  return client.sendMessageStream({
    message: {
      kind: "message",
      messageId: randomUUID(),
      role: "user",
      parts: [{ kind: "text", text: message }],
    },
  });
}

/** Like `sendA2AMessageStream`, but falls back to non-streaming `sendMessage`
 *  when the server returns a non-SSE Content-Type (e.g. agents behind x402
 *  gateways that don't preserve `text/event-stream` on replay — coinbase/x402#367). */
export async function trySendA2AMessageStream(
  uri: string,
  message: string,
  options?: A2AMessageOptions,
): Promise<AsyncIterable<unknown>> {
  const agentUrl = resolveAgentUrl(uri);
  const resolvedFetch = resolveFetchForTransaction(options?.transaction, options?.fetchImpl);
  const client = await createA2AClient(agentUrl, resolvedFetch);

  const msgParams = {
    message: {
      kind: "message" as const,
      messageId: randomUUID(),
      role: "user" as const,
      parts: [{ kind: "text" as const, text: message }],
    },
  };

  try {
    // Eagerly pull the first event so SSE failures surface here, not mid-iteration.
    const stream = client.sendMessageStream(msgParams);
    const iterator = stream[Symbol.asyncIterator]();
    const first = await iterator.next();

    return (async function* () {
      if (!first.done) yield first.value;
      yield* { [Symbol.asyncIterator]: () => iterator };
    })();
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("Invalid response Content-Type for SSE stream")) {
      // Server doesn't support SSE — fall back to non-streaming request.
      const result = await client.sendMessage(msgParams);
      return (async function* () {
        yield result;
      })();
    }
    throw err;
  }
}

/** Resolve a URI and fetch the A2A agent card. */
export async function getA2ACard(uri: string, options?: { fetchImpl?: typeof fetch }): Promise<AgentCard> {
  const agentUrl = resolveAgentUrl(uri);
  const resolver = new DefaultAgentCardResolver(options?.fetchImpl ? { fetchImpl: options.fetchImpl } : undefined);
  return resolver.resolve(agentUrl);
}
