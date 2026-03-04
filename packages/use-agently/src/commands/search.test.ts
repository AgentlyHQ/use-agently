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
  {
    uri: "eip155:8453/erc-8004:0x1234/3",
    name: "MCP Agent",
    description: "An MCP agent",
    protocols: ["mcp"],
  },
];

const MARKETPLACE_URL = "https://use-agently.com/marketplace.json";

describe("search command", () => {
  const out = captureOutput();
  let fetchSpy: ReturnType<typeof spyOn>;
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    fetchSpy = spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url === MARKETPLACE_URL) return Promise.resolve(new Response(JSON.stringify({ agents: TEST_AGENTS })));
      return realFetch(input, init);
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  test("returns all agents when no query or protocol", async () => {
    await cli.parseAsync(["test", "use-agently", "search"]);
    const parsed = out.yaml as any;
    expect(parsed.agents).toHaveLength(3);
  });

  test("filters agents by query", async () => {
    await cli.parseAsync(["test", "use-agently", "search", "echo"]);
    const parsed = out.yaml as any;
    expect(parsed.agents).toHaveLength(1);
    expect(parsed.agents[0].name).toStrictEqual("Echo Agent");
  });

  test("filters agents by protocol", async () => {
    await cli.parseAsync(["test", "use-agently", "search", "--protocol", "mcp"]);
    const parsed = out.yaml as any;
    expect(parsed.agents).toHaveLength(2);
  });

  test("filters agents by query and protocol", async () => {
    await cli.parseAsync(["test", "use-agently", "search", "echo", "--protocol", "mcp"]);
    const parsed = out.yaml as any;
    expect(parsed.agents).toHaveLength(1);
    expect(parsed.agents[0].name).toStrictEqual("Echo Agent");
  });

  test("json output", async () => {
    await cli.parseAsync(["test", "use-agently", "-o", "json", "search"]);
    const parsed = out.json as any;
    expect(parsed.agents).toHaveLength(3);
  });
});
