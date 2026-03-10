import { Command } from "commander";
import { output } from "../output.js";
import { resolveErc8004Agent, AgentNotFoundError } from "@use-agently/sdk";

function resolveUriOption(options: { uri?: string }): string {
  if (!options.uri) {
    throw new Error(
      "Missing required option --uri for 'erc-8004'.\nExpected an ERC-8004 agent URI, e.g. --uri eip155:8453/erc-8004:0x1234/1",
    );
  }
  return options.uri;
}

export const erc8004Command = new Command("erc-8004")
  .description("Resolve an ERC-8004 agent URI and display its details")
  .option("--uri <value>", "ERC-8004 agent URI (e.g. eip155:8453/erc-8004:0x1234/1)")
  .addHelpText(
    "after",
    "\nExamples:\n  use-agently erc-8004 --uri eip155:8453/erc-8004:0x1234/1\n  use-agently erc-8004 --uri eip155:8453/erc-8004:0xAbCd/42",
  )
  .action(async (options: { uri?: string }, command: Command) => {
    const uri = resolveUriOption(options);
    try {
      const agent = await resolveErc8004Agent(uri);
      output(command, agent);
    } catch (err) {
      if (err instanceof AgentNotFoundError) {
        throw new Error(`No agent found for URI: ${uri}\nRun 'use-agently agents' to see available agent URIs.`);
      }
      throw err;
    }
  });
