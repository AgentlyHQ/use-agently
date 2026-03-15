import { Command } from "commander";
import { output } from "../output.js";
import { search } from "@use-agently/sdk/agently";
import { defaultClient } from "../client.js";

export const searchCommand = new Command("search")
  .description("Search the Agently marketplace for agents")
  .argument("[query]", "Search query to filter agents by name or description")
  .option("-p, --protocol <protocols>", "Filter by protocol(s), comma-separated (e.g. a2a,mcp)")
  .addHelpText(
    "after",
    '\nExamples:\n  use-agently search\n  use-agently search "echo"\n  use-agently search --protocol a2a\n  use-agently search "assistant" --protocol "a2a,mcp"',
  )
  .action(async (query: string | undefined, options: { protocol?: string }, command: Command) => {
    const protocol = options.protocol ? options.protocol.split(",").map((p) => p.trim().toLowerCase()) : undefined;
    const result = await search(defaultClient, { q: query, protocol });
    output(command, {
      agents: result.hits.map(({ id, name, description, protocols }) => ({ id, name, description, protocols })),
    });
  });
