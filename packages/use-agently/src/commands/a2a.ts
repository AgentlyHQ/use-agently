import { Command } from "commander";
import {
  type TransactionMode,
  DryRunTransaction,
  PayTransaction,
  sendA2AMessageStream,
  getA2ACard,
  extractStreamEventText,
  extractAgentText,
  DryRunPaymentRequired,
  loadWallet,
} from "@use-agently/sdk";
import { getConfigOrThrow } from "../config.js";
import { clientFetch, handleDryRunError } from "../client.js";
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

async function resolveTransactionMode(pay?: boolean): Promise<TransactionMode> {
  if (pay) {
    const config = await getConfigOrThrow();
    const wallet = loadWallet(config.wallet);
    return PayTransaction(wallet);
  }
  return DryRunTransaction;
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
    const uri = resolveUriOption(options, "a2a send");
    const transaction = await resolveTransactionMode(options.pay);

    try {
      const stream = await sendA2AMessageStream(uri, options.message, { transaction, fetchImpl: clientFetch });

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
    const uri = resolveUriOption(options, "a2a card");
    const card = await getA2ACard(uri, { fetchImpl: clientFetch });
    output(command, card);
  });

a2aCommand.addCommand(a2aSendCommand);
a2aCommand.addCommand(a2aCardSubCommand);
