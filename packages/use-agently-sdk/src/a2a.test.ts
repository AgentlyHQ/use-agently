import { describe, expect, test } from "bun:test";
import { resolveAgentUrl, extractAgentText, extractStreamEventText } from "./a2a";

describe("resolveAgentUrl", () => {
  test("returns URL unchanged for http:// input", () => {
    expect(resolveAgentUrl("http://localhost:3000")).toBe("http://localhost:3000");
  });

  test("returns URL unchanged for https:// input", () => {
    expect(resolveAgentUrl("https://example.com/agent/")).toBe("https://example.com/agent/");
  });

  test("wraps short name into https://use-agently.com/{name}/", () => {
    expect(resolveAgentUrl("echo-agent")).toBe("https://use-agently.com/echo-agent/");
  });
});

describe("extractAgentText", () => {
  test("returns fallback for null/undefined result", () => {
    expect(extractAgentText(null)).toBe("The agent processed your request but returned no response.");
    expect(extractAgentText(undefined)).toBe("The agent processed your request but returned no response.");
  });

  test("extracts text from direct message response", () => {
    const result = {
      kind: "message",
      parts: [
        { kind: "text", text: "Hello " },
        { kind: "text", text: "world" },
      ],
    };
    expect(extractAgentText(result)).toBe("Hello world");
  });

  test("extracts agent messages from task-based response", () => {
    const result = {
      kind: "task",
      messages: [
        { role: "user", parts: [{ kind: "text", text: "ignored" }] },
        { role: "agent", parts: [{ kind: "text", text: "agent reply" }] },
      ],
    };
    expect(extractAgentText(result)).toBe("agent reply");
  });

  test("extracts text from task artifacts", () => {
    const result = {
      kind: "task",
      messages: [],
      artifacts: [{ parts: [{ kind: "text", text: "artifact text" }] }],
    };
    expect(extractAgentText(result)).toBe("artifact text");
  });

  test("falls back to result.text property", () => {
    const result = { text: "fallback text" };
    expect(extractAgentText(result)).toBe("fallback text");
  });

  test("returns fallback when no text found", () => {
    const result = { kind: "unknown" };
    expect(extractAgentText(result)).toBe("The agent processed your request but returned no text response.");
  });
});

describe("extractStreamEventText", () => {
  test("extracts text from artifact-update events", () => {
    const event = {
      kind: "artifact-update",
      artifact: { parts: [{ kind: "text", text: "streamed artifact" }] },
    };
    expect(extractStreamEventText(event)).toBe("streamed artifact");
  });

  test("extracts text from agent message events", () => {
    const event = {
      kind: "message",
      role: "agent",
      parts: [{ kind: "text", text: "streamed message" }],
    };
    expect(extractStreamEventText(event)).toBe("streamed message");
  });

  test("returns empty string for unknown event kinds", () => {
    expect(extractStreamEventText({ kind: "status-update" })).toBe("");
    expect(extractStreamEventText({ kind: "message", role: "user", parts: [] })).toBe("");
  });
});
