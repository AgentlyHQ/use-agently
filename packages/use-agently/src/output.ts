import { Command } from "commander";

export type OutputFormat = "json" | "text";

function renderValue(value: unknown, indent: number): string {
  const prefix = "  ".repeat(indent);

  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value !== "object") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";

    // Arrays of primitives: comma-separated inline
    if (value.every((item) => typeof item !== "object" || item === null)) {
      return value.join(", ");
    }

    // Arrays of objects: each item as indented block separated by blank line
    return value
      .map((item) => {
        if (typeof item === "object" && item !== null && !Array.isArray(item)) {
          const entries = Object.entries(item as Record<string, unknown>).filter(
            ([, v]) => v !== undefined && v !== null,
          );
          let isFirst = true;
          const lines = entries.map(([k, v]) => {
            const rendered = renderValue(v, indent + 2);
            const isComplex =
              typeof v === "object" &&
              v !== null &&
              !(Array.isArray(v) && v.every((item) => typeof item !== "object" || item === null));
            if (isFirst) {
              isFirst = false;
              return isComplex ? `${prefix}- ${k}:\n${rendered}` : `${prefix}- ${k}: ${rendered}`;
            }
            return isComplex ? `${prefix}  ${k}:\n${rendered}` : `${prefix}  ${k}: ${rendered}`;
          });
          return lines.join("\n");
        }
        return `${prefix}- ${renderValue(item, indent + 1)}`;
      })
      .join("\n\n");
  }

  // Plain object: key-value pairs
  const entries = Object.entries(value as Record<string, unknown>);
  return entries
    .filter(([, v]) => v !== undefined)
    .map(([key, v]) => {
      const isComplex =
        typeof v === "object" &&
        v !== null &&
        !(Array.isArray(v) && v.every((item) => typeof item !== "object" || item === null));
      const rendered = renderValue(v, indent + 1);
      if (isComplex) {
        return `${prefix}${key}:\n${rendered}`;
      }
      return `${prefix}${key}: ${rendered}`;
    })
    .join("\n");
}

export function renderText(data: unknown): string {
  return renderValue(data, 0);
}

export function output(command: Command, data: unknown): void {
  if (command.optsWithGlobals().output === "json") {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(renderText(data));
  }
}
