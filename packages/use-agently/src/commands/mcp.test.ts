import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { AixyzTesting } from "localhost-aixyz/test";
import { captureOutput, mockConfigModule } from "../testing";

mockConfigModule();

const { cli } = await import("../cli");

const agent = new AixyzTesting();

beforeAll(() => agent.start(), 30000);
afterAll(() => agent.stop(), 10000);

describe("mcp command", () => {
  describe("list tools", () => {
    const out = captureOutput();

    test("lists available tools", async () => {
      await cli.parseAsync(["test", "use-agently", "mcp", "tools", "--uri", agent.getAgentUrl()]);
      const tools = out.yaml as Array<Record<string, unknown>>;
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      expect(tools[0]).toHaveProperty("name");
      expect(tools[0]).toHaveProperty("description");
    });

    test("json output lists tools as JSON array", async () => {
      await cli.parseAsync(["test", "use-agently", "-o", "json", "mcp", "tools", "--uri", agent.getAgentUrl()]);
      const tools = out.json as Array<Record<string, unknown>>;
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });
  });

  describe("call tool", () => {
    const out = captureOutput();

    test("calls echo tool and returns text content", async () => {
      await cli.parseAsync([
        "test",
        "use-agently",
        "mcp",
        "call",
        "echo",
        '{"message":"hello from mcp"}',
        "--uri",
        agent.getAgentUrl(),
      ]);
      const result = out.yaml as Record<string, unknown>;
      expect(result).toHaveProperty("content");
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toBe("hello from mcp");
    });
  });
});
