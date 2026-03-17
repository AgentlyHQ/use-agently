import boxen from "boxen";
import type { OutputFormat } from "./output.js";

function isProcessExitError(err: unknown): err is Error {
  return err instanceof Error && err.message === "process.exit";
}

export function handleCliError(err: unknown, format: OutputFormat): never {
  if (isProcessExitError(err)) throw err;

  const message = err instanceof Error ? err.message : String(err);

  if (format === "json") {
    console.error(JSON.stringify({ error: { message } }));
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
