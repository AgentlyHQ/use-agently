import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { captureOutput, mockConfigModule } from "../testing";

mockConfigModule();

const { cli } = await import("../cli");

const TEST_AGENTS = [
  {
    uri: "eip155:8453/erc-8004:0x1234/1",
    name: "Echo Agent",
    description: "An echo agent",
    protocols: ["a2a", "mcp"],
  },
  {
    uri: "eip155:8453/erc-8004:0x1234/2",
    name: "Web Agent",
    description: "A web agent",
    protocols: ["a2a"],
  },
];

describe("erc-8004 command", () => {
  const out = captureOutput();
  let fetchSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ agents: TEST_AGENTS })));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  test("resolves a known ERC-8004 URI", async () => {
    await cli.parseAsync(["test", "use-agently", "erc-8004", "--uri", "eip155:8453/erc-8004:0x1234/1"]);
    const parsed = out.yaml as Record<string, unknown>;
    expect(parsed).toHaveProperty("name", "Echo Agent");
    expect(parsed).toHaveProperty("uri", "eip155:8453/erc-8004:0x1234/1");
  });

  test("json output for a known URI", async () => {
    await cli.parseAsync(["test", "use-agently", "-o", "json", "erc-8004", "--uri", "eip155:8453/erc-8004:0x1234/2"]);
    const parsed = out.json as Record<string, unknown>;
    expect(parsed).toHaveProperty("name", "Web Agent");
  });

  test("throws error for unknown URI", async () => {
    await expect(
      cli.parseAsync(["test", "use-agently", "erc-8004", "--uri", "eip155:8453/erc-8004:0xDEAD/99"]),
    ).rejects.toThrow("No agent found for URI");
  });
});
