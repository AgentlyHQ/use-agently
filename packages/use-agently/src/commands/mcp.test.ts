import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createMcpPaymentClient } from "../client";
import {
  captureOutput,
  mockConfigModule,
  startX402FacilitatorLocal,
  stopX402FacilitatorLocal,
  TEST_ADDRESS,
  TEST_PRIVATE_KEY,
  type X402FacilitatorLocal,
} from "../testing";
import { accounts } from "x402-fl/testcontainers";
import { EvmPrivateKeyWallet } from "../wallets/evm-private-key";
import pkg from "../../package.json" with { type: "json" };

mockConfigModule();

const { cli } = await import("../cli");

let fixture: X402FacilitatorLocal;

beforeAll(async () => {
  fixture = await startX402FacilitatorLocal();
}, 120_000);

afterAll(() => stopX402FacilitatorLocal(fixture), 30_000);

describe("mcp command (free)", () => {
  describe("list tools", () => {
    const out = captureOutput();

    test("lists available tools", async () => {
      await cli.parseAsync(["test", "use-agently", "mcp", "tools", "--uri", fixture.agent.getAgentUrl()]);
      const tools = out.yaml as Array<Record<string, unknown>>;
      expect(Array.isArray(tools)).toStrictEqual(true);
      expect(tools.length).toBeGreaterThan(0);
      expect(tools[0]).toHaveProperty("name");
      expect(tools[0]).toHaveProperty("description");
    });

    test("json output lists tools as JSON array", async () => {
      await cli.parseAsync(["test", "use-agently", "-o", "json", "mcp", "tools", "--uri", fixture.agent.getAgentUrl()]);
      const tools = out.json as Array<Record<string, unknown>>;
      expect(Array.isArray(tools)).toStrictEqual(true);
      expect(tools.length).toBeGreaterThan(0);
    });
  });

  describe("call tool", () => {
    const out = captureOutput();

    test("calls echo tool and returns text content", async () => {
      await cli.parseAsync([
        "test",
        "use-agently",
        "mcp",
        "call",
        "echo",
        '{"message":"hello from mcp"}',
        "--uri",
        fixture.agent.getAgentUrl(),
      ]);
      const result = out.yaml as Record<string, unknown>;
      expect(result).toHaveProperty("content");
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toStrictEqual("hello from mcp");
    });
  });
});

describe("mcp x402 payment (paid)", () => {
  function mcpUrl(): string {
    return fixture.agent.getAgentUrl().replace(/\/?$/, "/mcp");
  }

  async function createMcpClient(): Promise<Client> {
    const client = new Client({ name: "use-agently-test", version: pkg.version });
    const transport = new StreamableHTTPClientTransport(new URL(mcpUrl()));
    await client.connect(transport);
    return client;
  }

  test("paid tool call succeeds with funded wallet and debits sender exactly $0.001", async () => {
    const wallet = new EvmPrivateKeyWallet(TEST_PRIVATE_KEY, fixture.container.getRpcUrl());
    const client = await createMcpClient();
    try {
      const senderBefore = await fixture.container.balance(TEST_ADDRESS);
      const receiverBefore = await fixture.container.balance(accounts.facilitator.address);

      const x402Client = createMcpPaymentClient(client, wallet);
      const result = await x402Client.callTool("paid-echo-tool", { message: "hello mcp x402" });
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toStrictEqual("hello mcp x402");

      const senderAfter = await fixture.container.balance(TEST_ADDRESS);
      const receiverAfter = await fixture.container.balance(accounts.facilitator.address);

      // $0.001 USDC = 1000 raw units (6 decimals)
      expect(senderBefore.value - senderAfter.value).toStrictEqual(1000n);
      expect(receiverAfter.value - receiverBefore.value).toStrictEqual(1000n);
    } finally {
      await client.close();
    }
  });

  test("unpaid tool call returns error", async () => {
    const client = await createMcpClient();
    try {
      const result = await client.callTool({ name: "paid-echo-tool", arguments: { message: "should fail" } });
      expect(result.isError).toStrictEqual(true);
    } finally {
      await client.close();
    }
  });
});
