import { Command } from "commander";
import { stringify } from "yaml";

export type OutputFormat = "json" | "text";

export function renderText(data: unknown): string {
  return stringify(data, { lineWidth: 0 }).trimEnd();
}

export function output(command: Command, data: unknown): void {
  if (command.optsWithGlobals().output === "json") {
    console.log(JSON.stringify(data));
  } else {
    console.log(renderText(data));
  }
}

/**
 * Output a collection as NDJSON (one JSON object per line) in JSON mode,
 * or as YAML text in text mode.
 */
export function outputCollection(command: Command, items: unknown[]): void {
  if (command.optsWithGlobals().output === "json") {
    for (const item of items) {
      console.log(JSON.stringify(item));
    }
  } else {
    console.log(renderText(items));
  }
}
