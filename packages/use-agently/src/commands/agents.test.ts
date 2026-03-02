import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { parse } from "yaml";
import { mockConfigModule } from "../testing";

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

describe("agents command", () => {
  let logSpy: ReturnType<typeof spyOn>;
  let fetchSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    logSpy = spyOn(console, "log").mockImplementation(() => {});
    fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ agents: TEST_AGENTS })));
  });

  afterEach(() => {
    logSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  test("text output lists agents", async () => {
    await cli.parseAsync(["test", "use-agently", "agents"]);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain("Test Agent");
    expect(output).toContain("Another Agent");
    expect(output).toContain("eip155:8453/erc-8004:0x1234/1");
  });

  test("text output is valid yaml", async () => {
    await cli.parseAsync(["test", "use-agently", "agents"]);

    const output = logSpy.mock.calls[0][0] as string;
    const parsed = parse(output);
    expect(parsed.agents).toHaveLength(2);
    expect(parsed.agents[0].name).toBe("Test Agent");
    expect(parsed.agents[0].protocols).toEqual(["a2a", "mcp"]);
    expect(parsed.agents[1].name).toBe("Another Agent");
  });

  test("json output returns structured data", async () => {
    await cli.parseAsync(["test", "use-agently", "-o", "json", "agents"]);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(parsed.agents).toHaveLength(2);
    expect(parsed.agents[0]).toEqual(TEST_AGENTS[0]);
    expect(parsed.agents[1]).toEqual(TEST_AGENTS[1]);
  });

  test("empty agents list", async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ agents: [] })));

    await cli.parseAsync(["test", "use-agently", "-o", "json", "agents"]);

    const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(parsed).toEqual({ agents: [] });
  });

  test("fetches from marketplace url", async () => {
    await cli.parseAsync(["test", "use-agently", "agents"]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe("https://use-agently.com/marketplace.json");
  });
});
