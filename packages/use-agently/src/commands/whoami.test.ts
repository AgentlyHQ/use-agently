import { describe, expect, test } from "bun:test";
import { captureOutput, mockConfigModule, TEST_ADDRESS } from "../testing";

mockConfigModule();

const { cli } = await import("../cli");

describe("whoami command", () => {
  const out = captureOutput();

  test("text output", async () => {
    await cli.parseAsync(["test", "use-agently", "-o", "text", "whoami"]);

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

  test("yaml output", async () => {
    await cli.parseAsync(["test", "use-agently", "-o", "yaml", "whoami"]);

    expect(out.yaml).toEqual({
      namespace: "eip155",
      address: TEST_ADDRESS,
    });
  });

  test("human output renders a box containing the data", async () => {
    await cli.parseAsync(["test", "use-agently", "-o", "human", "whoami"]);

    const rendered = out.stdout;
    expect(rendered).toContain("namespace");
    expect(rendered).toContain("eip155");
    expect(rendered).toContain("address");
    expect(rendered).toContain(TEST_ADDRESS);
    // boxen uses rounded corners
    expect(rendered).toMatch(/[╭╰]/);
  });
});
