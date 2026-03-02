import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { AixyzTesting } from "localhost-aixyz/test";
import { createA2AClient } from "../client.js";
import { extractAgentText } from "./a2a.js";

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
});
