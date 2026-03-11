import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { fetchAgents, searchAgents, resolveErc8004Agent } from "./marketplace";

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

function mockFetch(agents: any[] = TEST_AGENTS) {
  return spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ agents })));
}

describe("fetchAgents", () => {
  let fetchSpy: ReturnType<typeof spyOn>;

  afterEach(() => {
    fetchSpy?.mockRestore();
  });

  test("returns agents array from marketplace response", async () => {
    fetchSpy = mockFetch();
    const agents = await fetchAgents();
    expect(agents).toHaveLength(3);
    expect(agents[0].name).toBe("Echo Agent");
  });

  test("returns empty array when no agents", async () => {
    fetchSpy = mockFetch([]);
    const agents = await fetchAgents();
    expect(agents).toEqual([]);
  });

  test("throws on non-ok response", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Not Found", { status: 404, statusText: "Not Found" }),
    );
    await expect(fetchAgents()).rejects.toThrow("Failed to fetch agents: 404 Not Found");
  });
});

describe("searchAgents", () => {
  let fetchSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    fetchSpy = mockFetch();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  test("returns all agents when no query or protocols", async () => {
    const agents = await searchAgents({});
    expect(agents).toHaveLength(3);
  });

  test("filters by query (case insensitive)", async () => {
    const agents = await searchAgents({ query: "echo" });
    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe("Echo Agent");
  });

  test("filters by description", async () => {
    const agents = await searchAgents({ query: "web agent" });
    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe("Web Agent");
  });

  test("filters by protocols array", async () => {
    const agents = await searchAgents({ protocols: ["mcp"] });
    expect(agents).toHaveLength(2);
  });

  test("filters by both query and protocols", async () => {
    const agents = await searchAgents({ query: "echo", protocols: ["mcp"] });
    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe("Echo Agent");
  });
});

describe("resolveErc8004Agent", () => {
  let fetchSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    fetchSpy = mockFetch();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  test("returns matching agent by URI", async () => {
    const agent = await resolveErc8004Agent("eip155:8453/erc-8004:0x1234/1");
    expect(agent.name).toBe("Echo Agent");
  });

  test("throws error for unknown URI", async () => {
    await expect(resolveErc8004Agent("eip155:8453/erc-8004:0xDEAD/99")).rejects.toThrow("No agent found for URI");
  });
});
