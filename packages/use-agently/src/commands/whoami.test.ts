import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { parse } from "yaml";
import { mockConfigModule, TEST_ADDRESS } from "../testing";

mockConfigModule();

const { cli } = await import("../cli");

describe("whoami command", () => {
  let logSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    logSpy = spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  test("text output shows type and address", async () => {
    await cli.parseAsync(["test", "use-agently", "whoami"]);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain("type: evm-private-key");
    expect(output).toContain(TEST_ADDRESS);
  });

  test("json output returns structured data", async () => {
    await cli.parseAsync(["test", "use-agently", "--output", "json", "whoami"]);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(parsed).toEqual({
      type: "evm-private-key",
      address: TEST_ADDRESS,
    });
  });

  test("json output is pretty-printed", async () => {
    await cli.parseAsync(["test", "use-agently", "-o", "json", "whoami"]);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const raw = logSpy.mock.calls[0][0] as string;
    expect(raw).toBe(JSON.stringify({ type: "evm-private-key", address: TEST_ADDRESS }, null, 2));
  });

  test("text output is valid yaml", async () => {
    await cli.parseAsync(["test", "use-agently", "whoami"]);

    const output = logSpy.mock.calls[0][0] as string;
    const parsed = parse(output);
    expect(parsed).toEqual({
      type: "evm-private-key",
      address: TEST_ADDRESS,
    });
  });
});
