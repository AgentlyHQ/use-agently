import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { captureOutput } from "../testing";

let mockVersion = "1.0.0";

mock.module("node:fs", () => ({
  readFileSync: () => JSON.stringify({ name: "use-agently", version: mockVersion }),
}));

let mockExecSync = mock((_cmd: string, _opts?: unknown) => {});
mock.module("node:child_process", () => ({
  execSync: (...args: unknown[]) => mockExecSync(...(args as [string, unknown?])),
}));

const { cli } = await import("../cli");

describe("update command", () => {
  const out = captureOutput();
  let fetchSpy: ReturnType<typeof spyOn>;
  let exitSpy: ReturnType<typeof spyOn>;
  let mockLatestVersion = "1.0.0";

  beforeEach(() => {
    mockVersion = "1.0.0";
    mockLatestVersion = "1.0.0";
    mockExecSync = mock((_cmd: string, _opts?: unknown) => {});
    fetchSpy = spyOn(globalThis, "fetch").mockImplementation(async () => {
      return new Response(JSON.stringify({ version: mockLatestVersion }));
    });
    exitSpy = spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("already up to date - text output", async () => {
    await cli.parseAsync(["test", "use-agently", "update"]);

    expect(out.yaml).toEqual({
      current: "1.0.0",
      latest: "1.0.0",
      message: "Already up to date.",
    });
    expect(mockExecSync).not.toHaveBeenCalled();
  });

  test("already up to date - json output", async () => {
    await cli.parseAsync(["test", "use-agently", "-o", "json", "update"]);

    expect(out.json).toEqual({
      current: "1.0.0",
      latest: "1.0.0",
      message: "Already up to date.",
    });
    expect(mockExecSync).not.toHaveBeenCalled();
  });

  test("update available - outputs message and runs npm install", async () => {
    mockLatestVersion = "2.0.0";

    await cli.parseAsync(["test", "use-agently", "update"]);

    expect(out.yaml).toEqual({
      current: "1.0.0",
      latest: "2.0.0",
      message: "Updating to 2.0.0...",
    });
    expect(mockExecSync).toHaveBeenCalledWith("npm install -g use-agently@2.0.0", { stdio: "inherit" });
  });

  test("fetches from npm registry", async () => {
    await cli.parseAsync(["test", "use-agently", "update"]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe("https://registry.npmjs.org/use-agently/latest");
  });

  test("registry fetch fails - prints error and exits with 1", async () => {
    fetchSpy.mockImplementation(async () => {
      throw new Error("Network error");
    });

    try {
      await cli.parseAsync(["test", "use-agently", "update"]);
    } catch {
      // expected: process.exit throws
    }

    expect(out.stderr).toContain("Failed to check for updates: Network error");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test("npm install fails - prints error and exits with 1", async () => {
    mockLatestVersion = "2.0.0";
    mockExecSync = mock(() => {
      throw new Error("Permission denied");
    });

    try {
      await cli.parseAsync(["test", "use-agently", "update"]);
    } catch {
      // expected: process.exit throws
    }

    expect(out.stderr).toContain("Update failed: Permission denied");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test("registry returns invalid version format - prints error and exits with 1", async () => {
    fetchSpy.mockImplementation(async () => {
      return new Response(JSON.stringify({ version: "malicious; rm -rf /" }));
    });

    try {
      await cli.parseAsync(["test", "use-agently", "update"]);
    } catch {
      // expected: process.exit throws
    }

    expect(out.stderr).toContain("Unexpected version format from registry");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
