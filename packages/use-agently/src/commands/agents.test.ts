import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { captureOutput, mockConfigModule } from "../testing";

mockConfigModule();

const { cli } = await import("../cli");

const TEST_AGENTS = [
  {
    uri: "eip155:8453/erc-8004:0x1234/1",
    name: "Test Agent",
    description: "A test agent",
    protocols: ["a2a", "mcp"],
  },
  {
    uri: "eip155:8453/erc-8004:0x1234/2",
    name: "Another Agent",
    protocols: ["a2a"],
  },
];

const MARKETPLACE_URL = "https://use-agently.com/marketplace.json";

describe("agents command", () => {
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

  test("text output", async () => {
    await cli.parseAsync(["test", "use-agently", "agents"]);

    const parsed = out.yaml as any;
    expect(parsed.agents).toHaveLength(2);
    expect(parsed.agents[0]).toEqual(TEST_AGENTS[0]);
    expect(parsed.agents[1]).toEqual(TEST_AGENTS[1]);
  });

  test("json output", async () => {
    await cli.parseAsync(["test", "use-agently", "-o", "json", "agents"]);

    const parsed = out.json as any;
    expect(parsed.agents).toHaveLength(2);
    expect(parsed.agents[0]).toEqual(TEST_AGENTS[0]);
    expect(parsed.agents[1]).toEqual(TEST_AGENTS[1]);
  });

  test("empty agents list", async () => {
    fetchSpy.mockImplementation((input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url === MARKETPLACE_URL) return Promise.resolve(new Response(JSON.stringify({ agents: [] })));
      return realFetch(input, init);
    });
    await cli.parseAsync(["test", "use-agently", "-o", "json", "agents"]);

    expect(out.json).toEqual({ agents: [] });
  });

  test("fetches from marketplace url", async () => {
    await cli.parseAsync(["test", "use-agently", "agents"]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toStrictEqual("https://use-agently.com/marketplace.json");
  });
});
