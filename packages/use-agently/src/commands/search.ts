import { Command } from "commander";
import { output } from "../output.js";
import { searchAgents } from "@use-agently/sdk";

export const searchCommand = new Command("search")
  .description("Search the Agently marketplace for agents")
  .argument("[query]", "Search query to filter agents by name or description")
  .option("-p, --protocol <protocols>", "Filter by protocol(s), comma-separated (e.g. a2a,mcp,web)")
  .addHelpText(
    "after",
    '\nExamples:\n  use-agently search\n  use-agently search "echo"\n  use-agently search --protocol a2a\n  use-agently search "assistant" --protocol "a2a,mcp"',
  )
  .action(async (query: string | undefined, options: { protocol?: string }, command: Command) => {
    const protocols = options.protocol ? options.protocol.split(",").map((p) => p.trim().toLowerCase()) : undefined;
    const agents = await searchAgents({ query, protocols });
    output(command, { agents });
  });
