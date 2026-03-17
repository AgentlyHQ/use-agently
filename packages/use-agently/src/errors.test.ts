import { describe, expect, test } from "bun:test";

import { cli } from "./cli";
import { handleCliError, resolveOutputFormat } from "./errors";
import type { OutputFormat } from "./output";
import { captureOutput } from "./testing";

describe("CLI error formatting", () => {
  const out = captureOutput();

  test("formats CLI errors in TUI mode without stack traces", async () => {
    const restoreTty = mockStderrTty(true);
    try {
      const exitCode = await runAndCapture(
        [
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
        ],
        "tui",
      );
      expect(exitCode).toBe(1);
      expect(out.stderr).toContain("Invalid JSON in --args");
      expect(out.stderr.split("\n").length).toBeGreaterThan(1);
      expect(out.stderr).toContain("Error");
      expect(out.stderr).not.toMatch(/\sat\s.+/);
    } finally {
      restoreTty();
    }
  });

  test("formats errors as json when requested", async () => {
    const exitCode = await runAndCapture(
      [
        "node",
        "use-agently",
        "-o",
        "json",
        "mcp",
        "call",
        "--uri",
        "http://example.com/mcp",
        "--tool",
        "echo",
        "--args",
        "{invalid",
      ],
      "json",
    );
    expect(exitCode).toBe(1);
    expect(JSON.parse(out.stderr)).toHaveProperty("error");
  });

  test("formats errors according to resolved output format", async () => {
    const exitCode = await runAndCapture([
      "node",
      "use-agently",
      "mcp",
      "call",
      "--uri",
      "http://example.com/mcp",
      "--tool",
      "echo",
      "--args",
      "{invalid",
    ]);
    expect(exitCode).toBe(1);
    const expectedFormat = resolveOutputFormat();
    if (expectedFormat === "json") {
      expect(JSON.parse(out.stderr).error).toContain("Invalid JSON in --args");
    } else {
      expect(out.stderr).toContain("Invalid JSON in --args");
    }
  });
});

function mockStderrTty(value: boolean): () => void {
  const stderr = process.stderr as NodeJS.WriteStream & { isTTY?: boolean };
  const original = stderr.isTTY;
  Object.defineProperty(stderr, "isTTY", { configurable: true, value });
  return () => {
    Object.defineProperty(stderr, "isTTY", { configurable: true, value: original });
  };
}

async function runCliWithErrorFormatting(argv: string[], output?: OutputFormat) {
  try {
    await cli.parseAsync(argv);
  } catch (err) {
    handleCliError(err, { output });
  }
}

async function runAndCapture(argv: string[], output?: OutputFormat): Promise<number | undefined> {
  let exitCode: number | undefined;
  const exitSignal = Symbol("exit");
  const originalExit = process.exit.bind(process);
  const mockExit: (code?: number) => never = (code) => {
    exitCode = code;
    throw exitSignal;
  };
  process.exit = mockExit as typeof process.exit;

  try {
    await runCliWithErrorFormatting(argv, output);
  } catch (err) {
    if (err !== exitSignal) throw err;
  } finally {
    process.exit = originalExit;
  }

  return exitCode;
}
