import { Command } from "commander";
import { output } from "../output.js";
import { search } from "@use-agently/sdk/agently";
import { defaultClient } from "../client.js";

/**
 * I think we should deprecate this command
 */
export const agentsCommand = new Command("agents")
  .description("List available agents on Agently")
  .action(async (_options: Record<string, never>, command: Command) => {
    const result = await search(defaultClient);
    output(command, {
      agents: result.hits.map(({ id, name, description, protocols }) => ({ id, name, description, protocols })),
    });
  });
