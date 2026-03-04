import { describe, expect, test } from "bun:test";
import { renderText } from "./output";

describe("renderText", () => {
  describe("primitives", () => {
    test("string", () => {
      expect(renderText("hello")).toStrictEqual("hello");
    });

    test("number", () => {
      expect(renderText(42)).toStrictEqual("42");
    });

    test("boolean", () => {
      expect(renderText(true)).toStrictEqual("true");
    });

    test("null renders as null", () => {
      expect(renderText(null)).toStrictEqual("null");
    });
  });

  describe("flat objects", () => {
    test("whoami format", () => {
      const data = { type: "evm-private-key", address: "0x1234abcd" };
      expect(renderText(data)).toStrictEqual(["type: evm-private-key", 'address: "0x1234abcd"'].join("\n"));
    });

    test("balance format", () => {
      const data = { address: "0x1234abcd", balance: "100.50", currency: "USDC", network: "Base" };
      expect(renderText(data)).toStrictEqual(
        ['address: "0x1234abcd"', 'balance: "100.50"', "currency: USDC", "network: Base"].join("\n"),
      );
    });

    test("init format", () => {
      const data = { address: "0xABCDEF" };
      expect(renderText(data)).toStrictEqual('address: "0xABCDEF"');
    });

    test("skips undefined values", () => {
      const data = { name: "test", description: undefined, uri: "https://example.com" };
      expect(renderText(data)).toStrictEqual(["name: test", "uri: https://example.com"].join("\n"));
    });
  });

  describe("arrays of primitives", () => {
    test("renders as block sequence", () => {
      const data = { protocols: ["a2a", "mcp"] };
      expect(renderText(data)).toStrictEqual(["protocols:", "  - a2a", "  - mcp"].join("\n"));
    });

    test("single item array", () => {
      const data = { protocols: ["a2a"] };
      expect(renderText(data)).toStrictEqual(["protocols:", "  - a2a"].join("\n"));
    });

    test("empty array renders as []", () => {
      const data = { items: [] };
      expect(renderText(data)).toStrictEqual("items: []");
    });
  });

  describe("nested objects", () => {
    test("doctor format", () => {
      const data = {
        ok: true,
        checks: [
          { name: "Wallet configured", ok: true },
          { name: "Wallet loadable", ok: true },
          { name: "Network reachable (Base RPC)", ok: false, message: "Connection refused" },
        ],
      };
      expect(renderText(data)).toStrictEqual(
        [
          "ok: true",
          "checks:",
          "  - name: Wallet configured",
          "    ok: true",
          "  - name: Wallet loadable",
          "    ok: true",
          "  - name: Network reachable (Base RPC)",
          "    ok: false",
          "    message: Connection refused",
        ].join("\n"),
      );
    });

    test("doctor format omits undefined values in array items", () => {
      const data = {
        ok: true,
        checks: [{ name: "Wallet configured", ok: true, message: undefined }],
      };
      expect(renderText(data)).toStrictEqual(
        ["ok: true", "checks:", "  - name: Wallet configured", "    ok: true"].join("\n"),
      );
    });
  });

  describe("agents format", () => {
    test("renders agent list with protocols as block sequence", () => {
      const data = {
        agents: [
          {
            uri: "eip155:8453/erc-8004:0x1234/1",
            name: "Price Agent",
            description: "Gets crypto prices",
            protocols: ["a2a", "mcp"],
          },
          {
            uri: "eip155:8453/erc-8004:0x1234/2",
            name: "Job Agent",
            description: "Finds jobs",
            protocols: ["a2a"],
          },
        ],
      };
      expect(renderText(data)).toStrictEqual(
        [
          "agents:",
          "  - uri: eip155:8453/erc-8004:0x1234/1",
          "    name: Price Agent",
          "    description: Gets crypto prices",
          "    protocols:",
          "      - a2a",
          "      - mcp",
          "  - uri: eip155:8453/erc-8004:0x1234/2",
          "    name: Job Agent",
          "    description: Finds jobs",
          "    protocols:",
          "      - a2a",
        ].join("\n"),
      );
    });

    test("empty agents list", () => {
      const data = { agents: [] };
      expect(renderText(data)).toStrictEqual("agents: []");
    });
  });

  describe("complex nested structures", () => {
    test("object with nested object value", () => {
      const data = {
        name: "test",
        metadata: {
          version: "1.0",
          author: "alice",
        },
      };
      expect(renderText(data)).toStrictEqual(
        ["name: test", "metadata:", '  version: "1.0"', "  author: alice"].join("\n"),
      );
    });

    test("array of primitives at top level", () => {
      expect(renderText(["a2a", "mcp"])).toStrictEqual("- a2a\n- mcp");
    });

    test("boolean false renders correctly", () => {
      const data = { ok: false, message: "failed" };
      expect(renderText(data)).toStrictEqual("ok: false\nmessage: failed");
    });

    test("numeric values render correctly", () => {
      const data = { count: 0, total: 42 };
      expect(renderText(data)).toStrictEqual("count: 0\ntotal: 42");
    });
  });
});
