import { Command } from "commander";
import { randomUUID } from "node:crypto";
import { DefaultAgentCardResolver } from "@a2a-js/sdk/client";
import boxen from "boxen";
import { getConfigOrThrow } from "../config.js";
import { loadWallet } from "../wallets/wallet.js";
import { createPaymentFetch, createA2AClient, createDryRunFetch, DryRunPaymentRequired } from "../client.js";
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

function resolveUriOption(options: { uri?: string }, commandName: string): string {
  if (!options.uri) {
    throw new Error(
      `Missing required option --uri for '${commandName}'.\nExpected a URL or agent URI, e.g. --uri https://example.com/agent or --uri echo-agent`,
    );
  }
  return options.uri;
}

export const a2aCommand = new Command("a2a")
  .description("Interact with agents via the A2A protocol")
  .action(function () {
    (this as Command).outputHelp();
  });

const a2aSendCommand = new Command("send")
  .description("Send a message to an agent via A2A protocol")
  .option("--uri <value>", "Agent URI or URL (e.g. https://example.com/agent or echo-agent)")
  .requiredOption("-m, --message <text>", "Message to send")
  .option("--pay", "Authorize payment if the agent requires it (default: dry-run, shows cost only)")
  .addHelpText(
    "after",
    '\nExamples:\n  use-agently a2a send --uri https://example.com/agent -m "Hello!"\n  use-agently a2a send --uri echo-agent -m "Hello!"\n  use-agently a2a send --uri paid-agent -m "Hello!" --pay',
  )
  .action(async (options: { uri?: string; message: string; pay?: boolean }) => {
    const agentInput = resolveUriOption(options, "a2a send");
    const agentUrl = resolveAgentUrl(agentInput);

    let fetchImpl: typeof fetch;
    if (options.pay) {
      const config = await getConfigOrThrow();
      const wallet = loadWallet(config.wallet);
      fetchImpl = createPaymentFetch(wallet) as typeof fetch;
    } else {
      fetchImpl = createDryRunFetch();
    }

    try {
      const client = await createA2AClient(agentUrl, fetchImpl);

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
      if (err instanceof DryRunPaymentRequired) {
        console.error(
          boxen(err.message, {
            title: "Payment Required",
            titleAlignment: "center",
            borderColor: "yellow",
            padding: 1,
          }),
        );
        process.exit(1);
      }
      throw err;
    }
  });

const a2aCardSubCommand = new Command("card")
  .description("Fetch and display the A2A agent card")
  .option("--uri <value>", "Agent URI or URL (e.g. https://example.com/agent or echo-agent)")
  .addHelpText(
    "after",
    "\nExamples:\n  use-agently a2a card --uri https://example.com/agent\n  use-agently a2a card --uri echo-agent",
  )
  .action(async (options: { uri?: string }, command: Command) => {
    const agentInput = resolveUriOption(options, "a2a card");
    const agentUrl = resolveAgentUrl(agentInput);
    const resolver = new DefaultAgentCardResolver();
    const card = await resolver.resolve(agentUrl);
    output(command, card);
  });

a2aCommand.addCommand(a2aSendCommand);
a2aCommand.addCommand(a2aCardSubCommand);
