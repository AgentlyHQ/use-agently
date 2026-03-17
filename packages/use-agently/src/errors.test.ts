import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { handleCliError } from "./errors";

describe("handleCliError", () => {
  let exitSpy: ReturnType<typeof spyOn>;
  let errorSpy: ReturnType<typeof spyOn>;
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    originalIsTTY = process.stderr.isTTY;
    exitSpy = spyOn(process, "exit").mockImplementation((code?: number) => {
      throw new Error(`exit:${code ?? 0}`);
    });
    errorSpy = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(process.stderr, "isTTY", { value: originalIsTTY, configurable: true });
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test("prints json error when format is json", () => {
    expect(() => handleCliError(new Error("boom"), "json")).toThrow("exit:1");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(JSON.stringify({ error: { message: "boom" } }));
  });

  test("prints plain text when format is tui and stderr is not a TTY", () => {
    Object.defineProperty(process.stderr, "isTTY", { value: false, configurable: true });

    expect(() => handleCliError(new Error("oops"), "tui")).toThrow("exit:1");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith("Error: oops");
  });

  test("prints boxed error when format is tui and stderr is a TTY", () => {
    Object.defineProperty(process.stderr, "isTTY", { value: true, configurable: true });

    expect(() => handleCliError(new Error("boxed"), "tui")).toThrow("exit:1");
    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errorSpy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("boxed");
    expect(output).toContain("Error");
  });
});
