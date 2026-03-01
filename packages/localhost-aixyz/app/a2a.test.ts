import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import { ClientFactory, JsonRpcTransportFactory, RestTransportFactory } from "@a2a-js/sdk/client";
import type { Task } from "@a2a-js/sdk";
import { AixyzServer } from "aixyz/server";
import { useA2A } from "aixyz/server/adapters/a2a";
import { facilitator } from "aixyz/accepts";
import * as agent from "./agent";

const TEST_PORT = 3000;
const AGENT_BASE_URL = `http://localhost:${TEST_PORT}`;

let httpServer: Server;

beforeAll(async () => {
  const server = new AixyzServer(facilitator);
  useA2A(server, agent);
  await new Promise<void>((resolve) => {
    httpServer = server.express.listen(TEST_PORT, resolve);
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => httpServer?.close(() => resolve()));
});

async function createClient() {
  const factory = new ClientFactory({
    transports: [new JsonRpcTransportFactory({ fetchImpl: fetch }), new RestTransportFactory({ fetchImpl: fetch })],
  });
  return factory.createFromUrl(AGENT_BASE_URL);
}

function extractTextFromTask(task: Task): string | undefined {
  const part = task.artifacts?.flatMap((a) => a.parts).find((p) => p.kind === "text");
  return part ? (part as { kind: "text"; text: string }).text : undefined;
}

describe("localhost-aixyz a2a", () => {
  test("agent card is accessible", async () => {
    const response = await fetch(`${AGENT_BASE_URL}/.well-known/agent-card.json`);
    expect(response.ok).toBe(true);
    const card = await response.json();
    expect(card.name).toBe("localhost-aixyz");
    expect(card.protocolVersion).toBe("0.3.0");
  });

  test("echo agent responds via A2A protocol", async () => {
    const client = await createClient();
    const result = await client.sendMessage({
      message: {
        kind: "message",
        messageId: randomUUID(),
        role: "user",
        parts: [{ kind: "text", text: "hello world" }],
      },
    });

    expect(result).toBeDefined();
    const task = result as Task;
    expect(task.kind).toBe("task");
    expect(task.status.state).toBe("completed");
    expect(extractTextFromTask(task)).toBe("hello world");
  });

  test("echo agent echoes different messages", async () => {
    const client = await createClient();
    const message = "use-agently integration test";
    const result = await client.sendMessage({
      message: {
        kind: "message",
        messageId: randomUUID(),
        role: "user",
        parts: [{ kind: "text", text: message }],
      },
    });

    const task = result as Task;
    expect(extractTextFromTask(task)).toBe(message);
  });
});
