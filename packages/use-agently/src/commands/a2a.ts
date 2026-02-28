/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Command } from "commander";
import { randomUUID } from "node:crypto";
import { getConfigOrThrow } from "../config.js";
import { loadWallet } from "../wallets/wallet.js";
import { createPaymentFetch, createA2AClient } from "../client.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTextFromParts(parts: any[]): string {
  return parts
    .filter((p) => p.kind === "text")
    .map((p) => p.text)
    .join("");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAgentText(result: any): string {
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

export const a2aCommand = new Command("a2a")
  .description("Send a message to an agent via A2A protocol")
  .argument("<agent>", "Agent URI")
  .requiredOption("-m, --message <text>", "Message to send")
  .action(async (agentUri: string, options: { message: string }) => {
    const config = await getConfigOrThrow();
    const wallet = loadWallet(config.wallet);
    const paymentFetch = createPaymentFetch(wallet);
    const baseUrl = config.baseUrl ?? "https://use-agently.com";
    const agentUrl = `${baseUrl}/${agentUri}/`;
    const client = await createA2AClient(agentUrl, paymentFetch as typeof fetch);

    const result = await client.sendMessage({
      message: {
        kind: "message",
        messageId: randomUUID(),
        role: "user",
        parts: [{ kind: "text", text: options.message }],
      },
    });

    console.log(extractAgentText(result));
  });
