import { Command } from "commander";
import { output } from "../output.js";
import { fetchAgents } from "@use-agently/sdk";
import { clientFetch } from "../client.js";

export const agentsCommand = new Command("agents")
  .description("List available agents on Agently")
  .action(async (_options: Record<string, never>, command: Command) => {
    const agents = await fetchAgents(clientFetch);
    output(command, { agents });
  });
