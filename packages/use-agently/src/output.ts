import { Command } from "commander";
import { stringify } from "yaml";
import boxen from "boxen";

export type OutputFormat = "json" | "yaml" | "text" | "human";

export function renderYaml(data: unknown): string {
  return stringify(data, { lineWidth: 0 }).trimEnd();
}

/** @deprecated use renderYaml */
export const renderText = renderYaml;

/**
 * Render a single value for human consumption.
 * Strings are returned as-is; objects/arrays are wrapped in a rounded boxen box.
 */
export function renderHuman(data: unknown): string {
  if (typeof data === "string") return data;
  return boxen(renderYaml(data), { padding: { top: 0, bottom: 0, left: 1, right: 1 }, borderStyle: "round" });
}

/**
 * Render a collection for human consumption.
 * Each item is formatted as YAML and separated by a horizontal rule.
 */
export function renderHumanCollection(items: unknown[]): string {
  if (items.length === 0) return "(no results)";
  const separator = "─".repeat(40);
  return items.map((item) => (typeof item === "string" ? item : renderYaml(item))).join(`\n${separator}\n`);
}

export function output(command: Command, data: unknown): void {
  const format: OutputFormat = command.optsWithGlobals().output ?? "human";
  if (format === "json") {
    console.log(JSON.stringify(data));
  } else if (format === "human") {
    console.log(renderHuman(data));
  } else {
    // "yaml" or "text" (backward-compat alias)
    console.log(renderYaml(data));
  }
}

/**
 * Output a collection as NDJSON (one JSON object per line) in JSON mode,
 * as YAML in yaml/text mode, or as a human-readable list in human mode.
 */
export function outputCollection(command: Command, items: unknown[]): void {
  const format: OutputFormat = command.optsWithGlobals().output ?? "human";
  if (format === "json") {
    for (const item of items) {
      console.log(JSON.stringify(item));
    }
  } else if (format === "human") {
    console.log(renderHumanCollection(items));
  } else {
    // "yaml" or "text" (backward-compat alias)
    console.log(renderYaml(items));
  }
}
