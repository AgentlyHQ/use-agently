import { Command } from "commander";
import Table from "cli-table3";
import boxen from "boxen";

export type OutputFormat = "json" | "tui";

/** Available width: use terminal columns if known, otherwise 80, but at least 120. */
function getMaxWidth(): number {
  return Math.max(process.stdout.columns || 80, 120);
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function boldBlue(s: string): string {
  return `\x1b[1m\x1b[34m${s}\x1b[0m`;
}

function formatNamedItem(item: Record<string, unknown>): string {
  const rest = Object.entries(item).filter(([k, v]) => k !== "name" && v !== undefined);
  if (rest.length === 1) return stringify(rest[0][1]);
  return rest.map(([k, v]) => `${k}: ${stringify(v)}`).join(", ");
}

function flattenEntries(data: Record<string, unknown>, prefix = ""): [string, string][] {
  const result: [string, string][] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        if (item && typeof item === "object" && !Array.isArray(item) && "name" in item) {
          result.push([String(item.name), formatNamedItem(item as Record<string, unknown>)]);
        } else if (item && typeof item === "object" && !Array.isArray(item)) {
          result.push(...flattenEntries(item as Record<string, unknown>, `${fullKey}[${i}]`));
        } else {
          result.push([`${fullKey}[${i}]`, stringify(item)]);
        }
      }
    } else if (value && typeof value === "object") {
      result.push(...flattenEntries(value as Record<string, unknown>, fullKey));
    } else {
      result.push([fullKey, stringify(value)]);
    }
  }
  return result;
}

function renderKeyValueTable(data: Record<string, unknown>): string {
  const maxWidth = getMaxWidth();
  const stringified = flattenEntries(data);
  const keyWidth = Math.max(...stringified.map(([k]) => k.length)) + 2;
  const naturalWidth = stringified.reduce((max, [k, v]) => Math.max(max, k.length + v.length + 5), 0);

  const options: Table.TableConstructorOptions = { wordWrap: true, wrapOnWordBoundary: true };
  if (naturalWidth > maxWidth) {
    options.colWidths = [keyWidth, maxWidth - keyWidth - 3];
  }

  const table = new Table(options);
  for (const [key, value] of stringified) {
    table.push({ [boldBlue(capitalize(key))]: [value] });
  }
  return table.toString();
}

function renderCollectionTable(items: Record<string, unknown>[]): string {
  const maxWidth = getMaxWidth();
  const keys = Object.keys(items[0]);

  // Detect well-known fields for smart formatting
  const hasId = keys.some((k) => k.toLowerCase() === "id" || k.toLowerCase() === "uri");
  const hasName = keys.includes("name");
  const hasDescription = keys.includes("description");
  const hasProtocols = keys.includes("protocols");

  // Smart layout: id | name+description | protocols
  if (hasId && hasName && hasDescription) {
    const idKey = keys.find((k) => k.toLowerCase() === "id" || k.toLowerCase() === "uri")!;

    // Split id: "eip155:1/erc8004:0xABC/123" → "eip155:1/erc8004:\n0xABC\n/123"
    const formatId = (id: string) => {
      const match = id.match(/^(.*?\/erc8004:)(0x[0-9a-fA-F]+)(\/\d+)$/);
      if (match) return `${match[1]}\n${match[2]}\n${match[3]}`;
      return id;
    };
    const idSegmentWidth =
      Math.max(
        ...items.flatMap((item) =>
          formatId(String(item[idKey] ?? ""))
            .split("\n")
            .map((line) => line.length),
        ),
      ) + 2;

    const protoWidth = hasProtocols ? 12 : 0;
    const nameDescWidth = maxWidth - idSegmentWidth - protoWidth - (hasProtocols ? 10 : 7);

    const options: Table.TableConstructorOptions = {
      wordWrap: true,
      wrapOnWordBoundary: true,
      colWidths: hasProtocols ? [idSegmentWidth, nameDescWidth, protoWidth] : [idSegmentWidth, nameDescWidth],
      head: hasProtocols ? [idKey, "agent (name & description)", "protocols"] : [idKey, "agent (name & description)"],
    };

    const table = new Table(options);
    for (const item of items) {
      const id = formatId(String(item[idKey] ?? ""));
      const name = boldBlue(String(item.name ?? ""));
      const desc = String(item.description ?? "");
      const nameDesc = `${name}\n${desc}`;
      const row = [id, nameDesc];
      if (hasProtocols) {
        row.push(Array.isArray(item.protocols) ? item.protocols.join(", ") : String(item.protocols ?? ""));
      }
      table.push(row);
    }
    return table.toString();
  }

  // Fallback: generic table
  const rows = items.map((item) => keys.map((k) => stringify(item[k] ?? "")));
  const naturalWidth = rows.reduce((max, row) => {
    const rowWidth = row.reduce((sum, cell) => sum + cell.length, 0) + keys.length * 3 + 1;
    return Math.max(max, rowWidth);
  }, 0);

  const options: Table.TableConstructorOptions = {
    head: keys,
    wordWrap: true,
    wrapOnWordBoundary: true,
  };
  if (naturalWidth > maxWidth) {
    const colWidth = Math.floor((maxWidth - 1) / keys.length) - 2;
    options.colWidths = keys.map(() => colWidth);
  }

  const table = new Table(options);
  for (const row of rows) {
    table.push(row);
  }
  return table.toString();
}

export function output(command: Command, data: unknown): void {
  const format: OutputFormat = command.optsWithGlobals().output ?? "tui";
  if (format === "json") {
    console.log(JSON.stringify(data));
  } else if (typeof data === "string") {
    console.log(data);
  } else if (data && typeof data === "object" && !Array.isArray(data)) {
    console.log(renderKeyValueTable(data as Record<string, unknown>));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

/**
 * Output a collection as NDJSON (one JSON object per line) in JSON mode,
 * or as a cli-table3 table in tui mode.
 */
export function outputCollection(command: Command, items: unknown[]): void {
  const format: OutputFormat = command.optsWithGlobals().output ?? "tui";
  if (items.length === 0) {
    if (format === "json") {
      console.error("No results found.");
    } else {
      console.error(
        boxen("No results found.", { padding: { top: 0, bottom: 0, left: 1, right: 1 }, borderStyle: "round" }),
      );
    }
    return;
  }
  if (format === "json") {
    for (const item of items) {
      console.log(JSON.stringify(item));
    }
  } else {
    console.log(renderCollectionTable(items as Record<string, unknown>[]));
  }
}
