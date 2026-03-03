import { Command } from "commander";
import { output } from "../output.js";

const AGENTS_URL = `https://use-agently.com/marketplace.json`;

export const searchCommand = new Command("search")
  .description("Search the Agently marketplace for agents")
  .argument("[query]", "Search query to filter agents by name or description")
  .option("-p, --protocol <protocols>", "Filter by protocol(s), comma-separated (e.g. a2a,mcp,web)")
  .addHelpText(
    "after",
    '\nExamples:\n  use-agently search\n  use-agently search "echo"\n  use-agently search --protocol a2a\n  use-agently search "assistant" --protocol "a2a,mcp"',
  )
  .action(async (query: string | undefined, options: { protocol?: string }, command: Command) => {
    const response = await fetch(AGENTS_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch agents: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();
    let agents: any[] = data.agents ?? [];

    if (query) {
      const q = query.toLowerCase();
      agents = agents.filter(
        (a) =>
          (a.name && a.name.toLowerCase().includes(q)) ||
          (a.description && a.description.toLowerCase().includes(q)) ||
          (a.uri && a.uri.toLowerCase().includes(q)),
      );
    }

    if (options.protocol) {
      const protocols = options.protocol.split(",").map((p) => p.trim().toLowerCase());
      agents = agents.filter((a) => Array.isArray(a.protocols) && protocols.some((p) => a.protocols.includes(p)));
    }

    output(command, { agents });
  });
