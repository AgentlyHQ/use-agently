import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";

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

  test("use-agently help prints available commands", async () => {
    try {
      await cli.parseAsync(["test", "use-agently", "help"]);
    } catch {
      // expected: help calls process.exit(0)
    }

    const output = writeSpy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("use-agently");
    expect(output).toContain("Commands:");
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  test("use-agently (no args) prints available commands", async () => {
    await cli.parseAsync(["test", "use-agently"]);

    const output = writeSpy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("use-agently");
    expect(output).toContain("Commands:");
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
