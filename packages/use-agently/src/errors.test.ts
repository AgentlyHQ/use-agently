import { describe, expect, test } from "bun:test";

import { cli } from "./cli";
import { handleCliError } from "./errors";
import { captureOutput } from "./testing";

describe("CLI error formatting", () => {
  const out = captureOutput();

  test("formats errors without stack traces", async () => {
    let exitCode: number | undefined;
    const originalExit = process.exit.bind(process);
    process.exit = ((code?: number) => {
      exitCode = code;
      throw new Error(`process.exit(${code})`);
    }) as typeof process.exit;

    try {
      await runCliWithHandling([
        "node",
        "use-agently",
        "-o",
        "tui",
        "mcp",
        "call",
        "--uri",
        "http://example.com/mcp",
        "--tool",
        "echo",
        "--args",
        "{invalid",
      ]);
    } catch {
      // expected from mocked process.exit
    } finally {
      process.exit = originalExit;
    }

    expect(exitCode).toBe(1);
    expect(out.stderr).toContain("Invalid JSON in --args");
    expect(out.stderr).not.toMatch(/\sat\s.+/);
  });
});

async function runCliWithHandling(argv: string[]) {
  try {
    await cli.parseAsync(argv);
  } catch (err) {
    const output = cli.optsWithGlobals?.().output ?? (process.stdout.isTTY ? "tui" : "json");
    handleCliError(err, { output });
  }
}
