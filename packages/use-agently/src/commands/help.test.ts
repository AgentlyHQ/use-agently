import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { Command } from "commander";

const { cli } = await import("../cli");

describe("help command", () => {
  let writeSpy: ReturnType<typeof spyOn>;
  let exitSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    writeSpy = spyOn(process.stdout, "write").mockImplementation((..._args: any[]) => true);
    exitSpy = spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
  });

  afterEach(() => {
    writeSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("use-agently --help prints available commands", async () => {
    try {
      await cli.parseAsync(["test", "use-agently", "--help"]);
    } catch {
      // expected: --help calls process.exit(0)
    }

    const output = writeSpy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("use-agently");
    expect(output).toContain("Diagnostics");
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  test("use-agently (no args) prints available commands", async () => {
    await cli.parseAsync(["test", "use-agently"]);

    const output = writeSpy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("use-agently");
    expect(output).toContain("Diagnostics");
    expect(exitSpy).not.toHaveBeenCalled();
  });

  test("all commands and subcommands have showGlobalOptions enabled", () => {
    function collectAll(cmd: Command): Command[] {
      return [cmd, ...cmd.commands.flatMap(collectAll)];
    }

    const allCommands = collectAll(cli);
    for (const cmd of allCommands) {
      expect(cmd.configureHelp()).toMatchObject({ showGlobalOptions: true });
    }
  });
});
