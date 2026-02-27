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
function extractTextFromStreamEvent(event: any): string {
  if (!event) return "";

  // Direct message event
  if (event.kind === "message" && event.parts) {
    return extractTextFromParts(event.parts);
  }

  // Artifact update event
  if (event.kind === "artifact-update" && event.artifact?.parts) {
    return extractTextFromParts(event.artifact.parts);
  }

  // Task event — agent messages
  if (event.kind === "task") {
    if (event.messages) {
      const text = event.messages
        .filter((m: { role: string }) => m.role === "agent")
        .flatMap((m: { parts: unknown[] }) => extractTextFromParts(m.parts))
        .join("\n");
      if (text) return text;
    }
    if (event.artifacts?.length > 0) {
      const text = event.artifacts.flatMap((a: { parts: unknown[] }) => extractTextFromParts(a.parts)).join("\n");
      if (text) return text;
    }
  }

  return event.text || "";
}

export const a2aCommand = new Command("a2a")
  .description("Send a message to an agent via A2A protocol")
  .argument("<agent>", "Agent URI")
  .requiredOption("-m, --message <text>", "Message to send")
  .action(async (agentUri: string, options: { message: string }) => {
    const config = await getConfigOrThrow();
    const wallet = loadWallet(config.wallet);
    const paymentFetch = createPaymentFetch(wallet);
    const agentUrl = `https://use-agently.com/${agentUri}/`;
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
      const text = extractTextFromStreamEvent(event);
      if (text) {
        process.stdout.write(text);
        hasOutput = true;
      }
    }
    if (hasOutput) {
      process.stdout.write("\n");
    } else {
      console.log("The agent processed your request but returned no response.");
    }
  });
