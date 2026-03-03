import { describe, expect, mock, test } from "bun:test";
import { captureOutput, mockConfigModule } from "../testing";

mockConfigModule();

// Mock the createPaymentFetch to return a controlled fetch
mock.module("../client", () => ({
  createPaymentFetch: () => mockFetch,
  createA2AClient: async () => ({}),
}));

let mockFetch: typeof fetch;

const { cli } = await import("../cli");

describe("web command", () => {
  const out = captureOutput();

  test("web GET returns JSON response as YAML text", async () => {
    mockFetch = async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(JSON.stringify({ hello: "world" }), { status: 200 });

    await cli.parseAsync(["test", "use-agently", "web", "https://example.com/api"]);
    expect(out.yaml).toEqual({ hello: "world" });
  });

  test("web GET returns plain text response", async () => {
    mockFetch = async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response("plain text response", { status: 200 });

    await cli.parseAsync(["test", "use-agently", "web", "https://example.com/api"]);
    expect(out.stdout).toBe("plain text response");
  });
});

describe("web:get command", () => {
  const out = captureOutput();

  test("GET request sends correct method", async () => {
    let capturedMethod: string | undefined;
    mockFetch = async (_url: string | URL | Request, init?: RequestInit) => {
      capturedMethod = init?.method;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    await cli.parseAsync(["test", "use-agently", "web:get", "https://example.com/api"]);
    expect(capturedMethod).toBe("GET");
    expect(out.yaml).toEqual({ ok: true });
  });

  test("GET with --header sends custom headers", async () => {
    let capturedHeaders: Record<string, string> = {};
    mockFetch = async (_url: string | URL | Request, init?: RequestInit) => {
      capturedHeaders = Object.fromEntries(new Headers(init?.headers as HeadersInit).entries());
      return new Response(JSON.stringify({}), { status: 200 });
    };

    await cli.parseAsync(["test", "use-agently", "web:get", "https://example.com/api", "-H", "X-Custom: value"]);
    expect(capturedHeaders["x-custom"]).toBe("value");
  });

  test("json output returns response as JSON", async () => {
    mockFetch = async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(JSON.stringify({ status: "ok" }), { status: 200 });

    await cli.parseAsync(["test", "use-agently", "-o", "json", "web:get", "https://example.com/api"]);
    expect(out.json).toEqual({ status: "ok" });
  });
});

describe("web:put command", () => {
  const out = captureOutput();

  test("PUT request sends correct method and body", async () => {
    let capturedMethod: string | undefined;
    let capturedBody: string | undefined;
    mockFetch = async (_url: string | URL | Request, init?: RequestInit) => {
      capturedMethod = init?.method;
      capturedBody = init?.body as string;
      return new Response(JSON.stringify({ updated: true }), { status: 200 });
    };

    await cli.parseAsync(["test", "use-agently", "web:put", "https://example.com/api", "-d", '{"key":"value"}']);
    expect(capturedMethod).toBe("PUT");
    expect(capturedBody).toBe('{"key":"value"}');
    expect(out.yaml).toEqual({ updated: true });
  });

  test("PUT with data sets Content-Type header automatically", async () => {
    let capturedHeaders: Record<string, string> = {};
    mockFetch = async (_url: string | URL | Request, init?: RequestInit) => {
      capturedHeaders = Object.fromEntries(new Headers(init?.headers as HeadersInit).entries());
      return new Response(JSON.stringify({}), { status: 200 });
    };

    await cli.parseAsync(["test", "use-agently", "web:put", "https://example.com/api", "-d", '{"a":1}']);
    expect(capturedHeaders["content-type"]).toBe("application/json");
  });
});

describe("web:delete command", () => {
  const out = captureOutput();

  test("DELETE request sends correct method", async () => {
    let capturedMethod: string | undefined;
    mockFetch = async (_url: string | URL | Request, init?: RequestInit) => {
      capturedMethod = init?.method;
      return new Response(JSON.stringify({ deleted: true }), { status: 200 });
    };

    await cli.parseAsync(["test", "use-agently", "web:delete", "https://example.com/resource/123"]);
    expect(capturedMethod).toBe("DELETE");
    expect(out.yaml).toEqual({ deleted: true });
  });
});
