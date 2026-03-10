import { Command } from "commander";
import { randomUUID } from "node:crypto";
import { DefaultAgentCardResolver } from "@a2a-js/sdk/client";
import { resolveAgentUrl, extractStreamEventText, extractAgentText } from "@use-agently/sdk";
import { resolveFetch, createA2AClient, handleDryRunError, DryRunPaymentRequired } from "../client.js";
import { output } from "../output.js";

// Re-export from SDK so test file can import from "./a2a"
export { extractAgentText };

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

    const fetchImpl = await resolveFetch(options.pay);

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
      if (err instanceof DryRunPaymentRequired) handleDryRunError(err);
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
