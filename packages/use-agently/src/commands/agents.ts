import { Command } from "commander";
import { output } from "../output.js";

const AGENTS_URL = `https://use-agently.com/marketplace.json`;

export const agentsCommand = new Command("agents")
  .description("List available agents on Agently")
  .action(async (_options: Record<string, never>, command: Command) => {
    const response = await fetch(AGENTS_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch agents: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();

    output(command, {
      agents: data.agents ?? [],
    });
  });
