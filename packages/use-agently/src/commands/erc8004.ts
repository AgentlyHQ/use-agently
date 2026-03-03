import { Command } from "commander";
import { output } from "../output.js";

const MARKETPLACE_URL = `https://use-agently.com/marketplace.json`;

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
    const response = await fetch(MARKETPLACE_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch agents: ${response.status} ${response.statusText}`);
    }
    const data: any = await response.json();
    const agents: any[] = data.agents ?? [];
    const agent = agents.find((a) => a.uri === uri);
    if (!agent) {
      throw new Error(`No agent found for URI: ${uri}\nRun 'use-agently agents' to see available agent URIs.`);
    }
    output(command, agent);
  });
