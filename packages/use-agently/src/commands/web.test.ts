import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { captureOutput, mockConfigModule } from "../testing";

mockConfigModule();

const { cli } = await import("../cli");

interface RequestRecord {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

let lastRequest: RequestRecord | null = null;
let nextResponse: { status: number; body: string; contentType?: string } = {
  status: 200,
  body: JSON.stringify({ ok: true }),
};

const server = Bun.serve({
  port: 0,
  fetch(req) {
    return req.text().then((body) => {
      lastRequest = {
        method: req.method,
        url: req.url,
        headers: Object.fromEntries(req.headers.entries()),
        body,
      };
      return new Response(nextResponse.body, {
        status: nextResponse.status,
        headers: { "content-type": nextResponse.contentType ?? "application/json" },
      });
    });
  },
});

const baseUrl = `http://localhost:${server.port}`;

beforeEach(() => {
  lastRequest = null;
  nextResponse = { status: 200, body: JSON.stringify({ ok: true }) };
});

afterAll(() => {
  server.stop();
});

describe("web:get command", () => {
  const out = captureOutput();

  test("sends GET request and outputs JSON response as YAML", async () => {
    nextResponse = { status: 200, body: JSON.stringify({ hello: "world" }) };
    await cli.parseAsync(["test", "use-agently", "web:get", `${baseUrl}/api`]);
    expect(lastRequest?.method).toBe("GET");
    expect(out.yaml).toEqual({ hello: "world" });
  });

  test("sends custom header", async () => {
    nextResponse = { status: 200, body: JSON.stringify({}) };
    await cli.parseAsync(["test", "use-agently", "web:get", `${baseUrl}/api`, "-H", "X-Custom: test-value"]);
    expect(lastRequest?.headers["x-custom"]).toBe("test-value");
  });

  test("json output format", async () => {
    nextResponse = { status: 200, body: JSON.stringify({ status: "ok" }) };
    await cli.parseAsync(["test", "use-agently", "-o", "json", "web:get", `${baseUrl}/api`]);
    expect(out.json).toEqual({ status: "ok" });
  });

  test("outputs plain text for non-JSON response", async () => {
    const textServer = Bun.serve({
      port: 0,
      fetch() {
        return new Response("plain text", { status: 200, headers: { "content-type": "text/plain" } });
      },
    });
    try {
      await cli.parseAsync(["test", "use-agently", "web:get", `http://localhost:${textServer.port}/text`]);
      expect(out.stdout).toBe("plain text");
    } finally {
      textServer.stop();
    }
  });
});

describe("web:put command", () => {
  const out = captureOutput();

  test("sends PUT request with body", async () => {
    nextResponse = { status: 200, body: JSON.stringify({ updated: true }) };
    await cli.parseAsync(["test", "use-agently", "web:put", `${baseUrl}/resource`, "-d", '{"key":"value"}']);
    expect(lastRequest?.method).toBe("PUT");
    expect(lastRequest?.body).toBe('{"key":"value"}');
    expect(out.yaml).toEqual({ updated: true });
  });

  test("auto-sets content-type header when --data is provided", async () => {
    nextResponse = { status: 200, body: JSON.stringify({}) };
    await cli.parseAsync(["test", "use-agently", "web:put", `${baseUrl}/resource`, "-d", '{"a":1}']);
    expect(lastRequest?.headers["content-type"]).toBe("application/json");
  });

  test("does not override explicit content-type header", async () => {
    nextResponse = { status: 200, body: JSON.stringify({}) };
    await cli.parseAsync([
      "test",
      "use-agently",
      "web:put",
      `${baseUrl}/resource`,
      "-H",
      "content-type: text/plain",
      "-d",
      "raw body",
    ]);
    expect(lastRequest?.headers["content-type"]).toBe("text/plain");
  });
});

describe("web:delete command", () => {
  const out = captureOutput();

  test("sends DELETE request", async () => {
    nextResponse = { status: 200, body: JSON.stringify({ deleted: true }) };
    await cli.parseAsync(["test", "use-agently", "web:delete", `${baseUrl}/resource/123`]);
    expect(lastRequest?.method).toBe("DELETE");
    expect(out.yaml).toEqual({ deleted: true });
  });
});
