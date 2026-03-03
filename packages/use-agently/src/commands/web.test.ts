import { describe, expect, mock, test } from "bun:test";
import { captureOutput, mockConfigModule } from "../testing";

mockConfigModule();

const TEST_URL = "https://example.com/api/resource";

let mockFetchImpl: typeof fetch = async () => new Response("hello", { status: 200 });

mock.module("../client", () => ({
  createPaymentFetch: () => (url: string, init?: RequestInit) => mockFetchImpl(url, init),
  createA2AClient: async () => ({}),
}));

const { cli } = await import("../cli");

describe("web commands", () => {
  describe("web (GET)", () => {
    const out = captureOutput();

    test("outputs text response", async () => {
      mockFetchImpl = async () =>
        new Response("hello world", { status: 200, headers: { "content-type": "text/plain" } });
      await cli.parseAsync(["test", "use-agently", "web", TEST_URL]);
      expect(out.stdout).toBe("hello world");
    });

    test("outputs JSON response", async () => {
      mockFetchImpl = async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      await cli.parseAsync(["test", "use-agently", "-o", "json", "web", TEST_URL]);
      expect(out.json).toEqual({ ok: true });
    });
  });

  describe("web:get", () => {
    const out = captureOutput();

    test("makes GET request and outputs response", async () => {
      mockFetchImpl = async (_url, init) => {
        expect(init?.method).toBe("GET");
        return new Response("get response", { status: 200, headers: { "content-type": "text/plain" } });
      };
      await cli.parseAsync(["test", "use-agently", "web:get", TEST_URL]);
      expect(out.stdout).toBe("get response");
    });
  });

  describe("web:put", () => {
    const out = captureOutput();

    test("makes PUT request with body", async () => {
      let capturedInit: RequestInit | undefined;
      mockFetchImpl = async (_url, init) => {
        capturedInit = init;
        return new Response(JSON.stringify({ updated: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      };
      await cli.parseAsync(["test", "use-agently", "-o", "json", "web:put", TEST_URL, "-d", '{"name":"test"}']);
      expect(capturedInit?.method).toBe("PUT");
      expect(capturedInit?.body).toBe('{"name":"test"}');
      expect(out.json).toEqual({ updated: true });
    });

    test("sets Content-Type to application/json by default when data is provided", async () => {
      let capturedHeaders: Record<string, string> | undefined;
      mockFetchImpl = async (_url, init) => {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response("ok", { status: 200 });
      };
      await cli.parseAsync(["test", "use-agently", "web:put", TEST_URL, "-d", '{"x":1}']);
      expect(capturedHeaders?.["Content-Type"]).toBe("application/json");
    });
  });

  describe("web:delete", () => {
    const out = captureOutput();

    test("makes DELETE request", async () => {
      let capturedInit: RequestInit | undefined;
      mockFetchImpl = async (_url, init) => {
        capturedInit = init;
        return new Response("deleted", { status: 200, headers: { "content-type": "text/plain" } });
      };
      await cli.parseAsync(["test", "use-agently", "web:delete", TEST_URL]);
      expect(capturedInit?.method).toBe("DELETE");
      expect(out.stdout).toBe("deleted");
    });
  });

  describe("error handling", () => {
    const out = captureOutput();

    test("throws on non-2xx response", async () => {
      mockFetchImpl = async () => new Response("Not Found", { status: 404, statusText: "Not Found" });
      await expect(cli.parseAsync(["test", "use-agently", "web", TEST_URL])).rejects.toThrow("HTTP 404 Not Found");
      void out; // suppress unused variable warning
    });
  });
});
