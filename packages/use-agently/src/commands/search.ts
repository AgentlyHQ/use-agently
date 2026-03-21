import { Command } from "commander";
import { getOutputFormat, outputJsonCollection, outputNoResults, boldBlue, getMaxWidth, Table } from "../output";
import { search } from "@use-agently/sdk/agently";
import { defaultClient } from "../client";

export const searchCommand = new Command("search")
  .description("Search the Agently marketplace for agents")
  .option("-q, --query <text>", "Search query to filter agents by name or description")
  .option("-p, --protocol <protocols>", "Filter by protocol(s), comma-separated (e.g. a2a,mcp)")
  .showHelpAfterError(true)
  .addHelpText(
    "after",
    [
      "",
      "Examples:",
      "  use-agently search",
      '  use-agently search -q "web search"',
      "  use-agently search --protocol a2a",
      '  use-agently search -q "generate markdown report" --protocol "a2a,mcp"',
      "",
      "Workflow:",
      "  Search results include a 'protocols' column showing each agent's supported protocols.",
      "  Use the protocol commands to interact with the agent:",
      "",
      "  a2a  -> use-agently a2a send --uri <uri> -m <message>",
      "  mcp  -> use-agently mcp tools --uri <uri>",
      // TODO(?): document OSAF when implemented
    ].join("\n"),
  )
  .action(async (options: { query?: string; protocol?: string }, command: Command) => {
    const format = getOutputFormat(command);
    const protocol = options.protocol ? options.protocol.split(",").map((p) => p.trim().toLowerCase()) : undefined;
    const result = await search(defaultClient, { q: options.query, protocol });
    const items = result.hits.map(({ id, name, description, protocols }) => ({ id, name, description, protocols }));

    if (items.length === 0) {
      outputNoResults(format);
      return;
    }

    if (format === "tui") {
      renderAgentsTable(items);
    } else {
      outputJsonCollection(items);
    }
  });

function formatId(id: string): string {
  const match = id.match(/^(.*?\/erc8004:)(0x[0-9a-fA-F]+)(\/\d+)$/);
  if (match) return `${match[1]}\n${match[2]}\n${match[3]}`;
  return id;
}

function renderAgentsTable(items: { id: string; name: string; description: string; protocols: string[] }[]): void {
  const maxWidth = getMaxWidth();

  const idSegmentWidth =
    Math.max(
      ...items.flatMap((item) =>
        formatId(item.id)
          .split("\n")
          .map((line) => line.length),
      ),
    ) + 2;
  const protoWidth = 12;
  const nameDescWidth = maxWidth - idSegmentWidth - protoWidth - 10;

  const table = new Table({
    wordWrap: true,
    wrapOnWordBoundary: true,
    colWidths: [idSegmentWidth, nameDescWidth, protoWidth],
    head: ["id", "agent (name & description)", "protocols"],
  });

  for (const item of items) {
    table.push([formatId(item.id), `${boldBlue(item.name)}\n${item.description}`, (item.protocols ?? []).join(", ")]);
  }

  console.log(table.toString());
}
