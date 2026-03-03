import { Command } from "commander";
import { randomUUID } from "node:crypto";
import { DefaultAgentCardResolver } from "@a2a-js/sdk/client";
import { getConfigOrThrow } from "../config.js";
import { loadWallet } from "../wallets/wallet.js";
import { createPaymentFetch, createDryRunFetch, createA2AClient, PaymentRequiredError } from "../client.js";
import { output } from "../output.js";

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

function extractStreamEventText(event: any): string {
  if (event.kind === "artifact-update") {
    return extractTextFromParts(event.artifact?.parts || []);
  }
  if (event.kind === "message" && event.role === "agent") {
    return extractTextFromParts(event.parts || []);
  }
  return "";
}

export const a2aCommand = new Command("a2a")
  .description("Send a message to an agent via A2A protocol")
  .argument("<agent>", "Agent URI")
  .requiredOption("-m, --message <text>", "Message to send")
  .option("--pay", "Approve payment and send the message (default: dry run that shows cost)")
  .action(async (agentUri: string, options: { message: string; pay?: boolean }) => {
    const config = await getConfigOrThrow();
    const wallet = loadWallet(config.wallet);
    const agentUrl = resolveAgentUrl(agentUri);
    const fetchImpl = options.pay ? createPaymentFetch(wallet) : createDryRunFetch();
    const client = await createA2AClient(agentUrl, fetchImpl as typeof fetch);

    try {
      const stream = client.sendMessageStream({
        message: {
          kind: "message",
          messageId: randomUUID(),
          role: "user",
          parts: [{ kind: "text", text: options.message }],
        },
      });

      let wroteText = false;
      let lastResult: any = null;
      for await (const event of stream) {
        lastResult = event;
        const chunk = extractStreamEventText(event);
        if (chunk) {
          process.stdout.write(chunk);
          wroteText = true;
        }
      }

      if (wroteText) {
        process.stdout.write("\n");
      } else {
        console.log(extractAgentText(lastResult));
      }
    } catch (err) {
      if (err instanceof PaymentRequiredError) {
        console.error(err.message);
        console.error("Tip: run the same command with --pay to approve the transaction.");
        process.exit(1);
      }
      throw err;
    }
  });

export const a2aCardCommand = new Command("a2a:card")
  .description("Fetch and display the A2A agent card")
  .argument("<agent>", "Agent URL or URI (e.g. https://example.com/agent or my-agent)")
  .addHelpText(
    "after",
    "\nExamples:\n  use-agently a2a:card https://example.com/agent\n  use-agently a2a:card my-agent",
  )
  .action(async (agentInput: string, _options: Record<string, never>, command: Command) => {
    const agentUrl = resolveAgentUrl(agentInput);
    const resolver = new DefaultAgentCardResolver();
    const card = await resolver.resolve(agentUrl);
    output(command, card);
  });
