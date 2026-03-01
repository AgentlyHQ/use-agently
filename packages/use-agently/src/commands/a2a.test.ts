import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { AixyzTesting } from "../../../localhost-aixyz/test.ts";
import { createA2AClient } from "../client.js";
import { extractAgentText, extractStreamText } from "./a2a.js";

const agent = new AixyzTesting();

beforeAll(() => agent.start(), 30000);
afterAll(() => agent.stop(), 10000);

describe("a2a command", () => {
  test("createA2AClient connects to a free agent", async () => {
    const client = await createA2AClient(agent.getAgentUrl(), fetch);
    expect(client).toBeDefined();
  });

  test("sendMessage returns echoed text via extractAgentText", async () => {
    const client = await createA2AClient(agent.getAgentUrl(), fetch);
    const result = await client.sendMessage({
      message: {
        kind: "message",
        messageId: randomUUID(),
        role: "user",
        parts: [{ kind: "text", text: "hello world" }],
      },
    });
    expect(extractAgentText(result)).toBe("hello world");
  });

  test("extractAgentText handles different messages", async () => {
    const client = await createA2AClient(agent.getAgentUrl(), fetch);
    const message = "use-agently integration test";
    const result = await client.sendMessage({
      message: {
        kind: "message",
        messageId: randomUUID(),
        role: "user",
        parts: [{ kind: "text", text: message }],
      },
    });
    expect(extractAgentText(result)).toBe(message);
  });

  test("sendMessageStream yields echoed text", async () => {
    const client = await createA2AClient(agent.getAgentUrl(), fetch);
    const stream = client.sendMessageStream({
      message: {
        kind: "message",
        messageId: randomUUID(),
        role: "user",
        parts: [{ kind: "text", text: "stream test" }],
      },
    });
    let text = "";
    for await (const event of stream) {
      text += extractStreamText(event);
    }
    expect(text).toBe("stream test");
  });

  test("extractStreamText extracts text from message event", () => {
    const event = { kind: "message", parts: [{ kind: "text", text: "hello" }] };
    expect(extractStreamText(event)).toBe("hello");
  });

  test("extractStreamText extracts text from status-update event", () => {
    const event = {
      kind: "status-update",
      status: { message: { parts: [{ kind: "text", text: "working" }] } },
    };
    expect(extractStreamText(event)).toBe("working");
  });

  test("extractStreamText extracts text from artifact-update event", () => {
    const event = {
      kind: "artifact-update",
      artifact: { parts: [{ kind: "text", text: "artifact text" }] },
    };
    expect(extractStreamText(event)).toBe("artifact text");
  });

  test("extractStreamText returns empty string for task events", () => {
    // Task events do not carry incremental text in streaming; extractStreamText returns ""
    const event = { kind: "task", id: "t1", contextId: "c1", status: { state: "working" as const }, history: [] };
    expect(extractStreamText(event as any)).toBe("");
  });
});
