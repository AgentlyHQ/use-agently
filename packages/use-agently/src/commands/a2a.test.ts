import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createA2AClient } from "../client.js";
import { extractAgentText } from "./a2a.js";

const AGENT_URL = "http://localhost:3000";
const SERVER_SCRIPT = resolve(import.meta.dir, "../../../localhost-aixyz/server.ts");
const SERVER_CWD = resolve(import.meta.dir, "../../../localhost-aixyz");

let proc: ReturnType<typeof Bun.spawn>;

async function waitForServer(url: string, timeout = 10000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`${url}/.well-known/agent-card.json`);
      if (res.ok) return;
    } catch {}
    await Bun.sleep(200);
  }
  throw new Error(`Server at ${url} did not start within ${timeout}ms`);
}

beforeAll(async () => {
  proc = Bun.spawn(["bun", SERVER_SCRIPT], {
    cwd: SERVER_CWD,
    stdout: "ignore",
    stderr: "ignore",
  });
  await waitForServer(AGENT_URL);
});

afterAll(async () => {
  proc.kill();
  await proc.exited;
});

describe("a2a command", () => {
  test("createA2AClient connects to a free agent", async () => {
    const client = await createA2AClient(AGENT_URL, fetch);
    expect(client).toBeDefined();
  });

  test("sendMessage returns echoed text via extractAgentText", async () => {
    const client = await createA2AClient(AGENT_URL, fetch);
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
    const client = await createA2AClient(AGENT_URL, fetch);
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
