import { Command } from "commander";
import { output } from "../output.js";
import { getAgent } from "@use-agently/sdk/agently";
import { defaultClient } from "../client.js";

export const viewCommand = new Command("view")
  .description("View an agent by its ID (e.g. CAIP-19)")
  .argument("<id>", "Agent ID (e.g. eip155:8453/erc8004:0x1234/1)")
  .addHelpText("after", "\nExamples:\n  use-agently view eip155:8453/erc8004:0x1234/1")
  .action(async (id: string, _options: Record<string, never>, command: Command) => {
    const agent = await getAgent(defaultClient, id);
    if (!agent) {
      throw new Error(`No agent found for ID: ${id}\nRun 'use-agently search' to find available agents.`);
    }
    output(command, agent);
  });
