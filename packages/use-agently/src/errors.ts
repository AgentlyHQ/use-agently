import boxen from "boxen";
import type { OutputFormat } from "./output.js";

function formatErrorMessage(err: unknown): string {
  if (err instanceof AggregateError) {
    if (err.errors.length > 0) {
      return err.errors.map((e) => formatErrorMessage(e)).join("; ");
    }
    return err.message || "An aggregate error occurred with no error details.";
  }
  if (err instanceof Error) {
    return err.message || err.toString();
  }
  if (typeof err === "string") return err;
  const errType = err === null ? "null" : typeof err;
  let detail: string;
  if (errType === "object") detail = "non-error object";
  else if (errType === "undefined") detail = "undefined";
  else detail = String(err);
  return `An unknown error occurred. Received: ${detail} (${errType}).`;
}

function isStderrTty(): boolean {
  return Boolean(process.stderr.isTTY);
}

export function resolveOutputFormat(output?: OutputFormat): OutputFormat {
  if (output === "json" || output === "tui") return output;
  // Agent-first default: when stdout is not a TTY (piped to another process or file), fall back to JSON for machine-readable output.
  return process.stdout.isTTY ? "tui" : "json";
}

export function handleCliError(err: unknown, options?: { output?: OutputFormat }): never {
  const output = resolveOutputFormat(options?.output);
  const message = formatErrorMessage(err);
  const tty = isStderrTty();

  if (output === "json") {
    console.error(JSON.stringify({ error: message }));
  } else if (tty) {
    console.error(
      boxen(message, {
        title: "Error",
        titleAlignment: "center",
        borderColor: "red",
        padding: 1,
      }),
    );
  } else {
    console.error(`Error: ${message}`);
  }

  process.exit(1);
}
