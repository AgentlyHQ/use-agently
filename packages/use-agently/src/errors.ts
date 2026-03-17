import boxen from "boxen";
import type { OutputFormat } from "./output.js";

function formatErrorMessage(err: unknown): string {
  if (err instanceof AggregateError && err.errors?.length) {
    return err.errors.map((e) => formatErrorMessage(e)).join("; ");
  }
  if (err instanceof Error) {
    return err.message || err.toString();
  }
  if (typeof err === "string") return err;
  return "An unknown error occurred.";
}

export function handleCliError(err: unknown, options?: { output?: OutputFormat }): never {
  const output = options?.output ?? (process.stdout.isTTY ? "tui" : "json");
  const message = formatErrorMessage(err);

  if (output === "json") {
    console.error(JSON.stringify({ error: message }));
  } else if (process.stderr.isTTY) {
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
