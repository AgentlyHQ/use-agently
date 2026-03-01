import { Command } from "commander";
import { randomUUID } from "node:crypto";
import type { Message, Task, TaskArtifactUpdateEvent, TaskStatusUpdateEvent } from "@a2a-js/sdk";
import { getConfigOrThrow } from "../config.js";
import { loadWallet } from "../wallets/wallet.js";
import { createPaymentFetch, createA2AClient } from "../client.js";

type A2AStreamEvent = Message | Task | TaskStatusUpdateEvent | TaskArtifactUpdateEvent;

function extractTextFromParts(parts: any[]): string {
  return parts
    .filter((p) => p.kind === "text")
    .map((p) => p.text)
    .join("");
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

export function extractStreamText(event: A2AStreamEvent): string {
  if (event.kind === "message") {
    return extractTextFromParts(event.parts);
  }
  if (event.kind === "status-update" && event.status.message?.parts) {
    return extractTextFromParts(event.status.message.parts);
  }
  if (event.kind === "artifact-update") {
    return extractTextFromParts(event.artifact.parts);
  }
  return "";
}

export const a2aCommand = new Command("a2a")
  .description("Send a message to an agent via A2A protocol")
  .argument("<agent>", "Agent URI")
  .requiredOption("-m, --message <text>", "Message to send")
  .action(async (agentUri: string, options: { message: string }) => {
    const config = await getConfigOrThrow();
    const wallet = loadWallet(config.wallet);
    const paymentFetch = createPaymentFetch(wallet);
    const isDirectUrl = agentUri.startsWith("http://") || agentUri.startsWith("https://");
    const agentUrl = isDirectUrl ? agentUri : `https://use-agently.com/${agentUri}/`;
    const client = await createA2AClient(agentUrl, paymentFetch as typeof fetch);

    const stream = client.sendMessageStream({
      message: {
        kind: "message",
        messageId: randomUUID(),
        role: "user",
        parts: [{ kind: "text", text: options.message }],
      },
    });

    let hasOutput = false;
    for await (const event of stream) {
      const text = extractStreamText(event);
      if (text) {
        process.stdout.write(text);
        hasOutput = true;
      }
    }
    if (hasOutput) {
      process.stdout.write("\n");
    } else {
      console.log("The agent processed your request but returned no text response.");
    }
  });
