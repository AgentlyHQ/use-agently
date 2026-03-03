import { Command } from "commander";
import { stringify } from "yaml";

export type OutputFormat = "json" | "text";

export function renderText(data: unknown): string {
  return stringify(data, { lineWidth: 0 }).trimEnd();
}

export function output(command: Command, data: unknown): void {
  if (command.optsWithGlobals().output === "json") {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(renderText(data));
  }
}
