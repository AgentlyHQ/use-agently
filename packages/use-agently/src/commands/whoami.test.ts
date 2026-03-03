import { describe, expect, test } from "bun:test";
import { captureOutput, mockConfigModule, TEST_ADDRESS } from "../testing";

mockConfigModule();

const { cli } = await import("../cli");

describe("whoami command", () => {
  const out = captureOutput();

  test("text output", async () => {
    await cli.parseAsync(["test", "use-agently", "whoami"]);

    expect(out.yaml).toEqual({
      namespace: "eip155",
      address: TEST_ADDRESS,
    });
  });

  test("json output", async () => {
    await cli.parseAsync(["test", "use-agently", "-o", "json", "whoami"]);

    expect(out.json).toEqual({
      namespace: "eip155",
      address: TEST_ADDRESS,
    });
  });
});
