import { Command } from "commander";
import {
  type TransactionMode,
  type unstable_Client,
  DryRunTransaction,
  PayTransaction,
  sendMessageStream,
  getAgentCard,
  extractStreamEventText,
  extractAgentText,
  DryRunPaymentRequired,
  loadWallet,
} from "@use-agently/sdk";
import { getConfigOrThrow, getMaxSpendPerCall } from "../config";
import {
  defaultClient,
  handleDryRunError,
  handleSpendLimitError,
  SpendLimitExceeded,
  createSpendLimitedClient,
} from "../client";
import { output } from "../output";

// Re-export from SDK so test file can import from "./a2a"
export { extractAgentText };

async function resolveTransactionMode(pay?: boolean): Promise<{ client: unstable_Client; mode: TransactionMode }> {
  if (pay) {
    const config = await getConfigOrThrow();
    const wallet = loadWallet(config.wallet);
    const maxSpend = getMaxSpendPerCall(config);
    return { client: createSpendLimitedClient(maxSpend), mode: PayTransaction(wallet) };
  }
  return { client: defaultClient, mode: DryRunTransaction };
}

export const a2aCommand = new Command("a2a")
  .description("Send messages and fetch agent cards via the A2A protocol")
  .addHelpText(
    "after",
    '\nExamples:\n  use-agently a2a send --uri <uri> -m "Hello!"\n  use-agently a2a card --uri <uri>',
  )
  .action(function () {
    (this as Command).outputHelp();
  });

const a2aSendCommand = new Command("send")
  .description("Send a message to an agent via A2A protocol")
  .requiredOption(
    "-u, --uri <value>",
    "Agent URL or CAIP-19 ID (e.g. https://example.com/agent or eip155:8453/erc8004:0x1234/1)",
  )
  .requiredOption("-m, --message <text>", "Message to send")
  .option("--pay", "Authorize payment if the agent requires it (default: dry-run, shows cost only)")
  .showHelpAfterError(true)
  .addHelpText(
    "after",
    '\nExamples:\n  use-agently a2a send --uri https://example.com/agent -m "Hello!"\n  use-agently a2a send --uri eip155:8453/erc8004:0x1234/1 -m "Hello!"\n  use-agently a2a send --uri https://example.com/agent -m "Hello!" --pay',
  )
  .action(async (options: { uri: string; message: string; pay?: boolean }) => {
    const uri = options.uri;
    const { client, mode } = await resolveTransactionMode(options.pay);

    try {
      // A2A send always streams text to stdout regardless of --output format.
      // Streaming is intentional: agents consume the response as it arrives,
      // and buffering would defeat the purpose of the streaming A2A protocol.
      const stream = await sendMessageStream(client, uri, options.message, { mode });

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
      if (err instanceof SpendLimitExceeded) handleSpendLimitError(err);
      if (err instanceof DryRunPaymentRequired) handleDryRunError(err);
      throw err;
    }
  });

const a2aCardSubCommand = new Command("card")
  .description("Fetch and display the A2A agent card")
  .requiredOption(
    "-u, --uri <value>",
    "Agent URL or CAIP-19 ID (e.g. https://example.com/agent or eip155:8453/erc8004:0x1234/1)",
  )
  .showHelpAfterError(true)
  .addHelpText(
    "after",
    "\nExamples:\n  use-agently a2a card --uri https://example.com/agent\n  use-agently a2a card --uri eip155:8453/erc8004:0x1234/1",
  )
  .action(async (options: { uri: string }, command: Command) => {
    const uri = options.uri;
    const card = await getAgentCard(defaultClient, uri);
    output(command, card);
  });

a2aCommand.addCommand(a2aSendCommand);
a2aCommand.addCommand(a2aCardSubCommand);
