import { describe, expect, test } from "bun:test";
import { resolveMcpUrl } from "./mcp";

describe("resolveMcpUrl", () => {
  test("returns URL with /mcp appended for direct URL without /mcp", () => {
    expect(resolveMcpUrl("https://example.com/agent")).toBe("https://example.com/agent/mcp");
  });

  test("returns URL unchanged if already ends with /mcp", () => {
    expect(resolveMcpUrl("https://example.com/agent/mcp")).toBe("https://example.com/agent/mcp");
  });

  test("returns URL unchanged if already ends with /mcp/", () => {
    expect(resolveMcpUrl("https://example.com/agent/mcp/")).toBe("https://example.com/agent/mcp/");
  });

  test("wraps short name into https://use-agently.com/{name}/services/mcp", () => {
    expect(resolveMcpUrl("echo-agent")).toBe("https://use-agently.com/echo-agent/services/mcp");
  });
});
