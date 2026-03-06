import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createMcpPaymentClient, DryRunPaymentRequired } from "../client";
import {
  captureOutput,
  mockConfigModule,
  startX402FacilitatorLocal,
  stopX402FacilitatorLocal,
  TEST_ADDRESS,
  TEST_PRIVATE_KEY,
  testWalletConfig,
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

afterAll(async () => {
  if (fixture) await stopX402FacilitatorLocal(fixture);
}, 30_000);

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
      const balanceBefore = await fixture.container.balance(TEST_ADDRESS);

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

      const balanceAfter = await fixture.container.balance(TEST_ADDRESS);
      expect(balanceAfter.value).toStrictEqual(balanceBefore.value);
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

  describe("cli dry-run and --pay", () => {
    const out = captureOutput();

    test("dry-run mcp call on paid tool shows cost and exits 1", async () => {
      let exitCode: number | undefined;
      const origExit = process.exit.bind(process);
      process.exit = ((code?: number) => {
        exitCode = code;
        throw new Error(`process.exit(${code})`);
      }) as typeof process.exit;

      try {
        await cli.parseAsync([
          "test",
          "use-agently",
          "mcp",
          "call",
          "paid-echo-tool",
          '{"message":"dry run"}',
          "--uri",
          fixture.agent.getAgentUrl(),
        ]);
      } catch {
        // expected: process.exit throws
      } finally {
        process.exit = origExit;
      }

      expect(exitCode).toBe(1);
      expect(out.stderr).toContain("--pay");
    });

    test("mcp call with --pay on paid tool succeeds and debits sender", async () => {
      mockConfigModule(() => ({ wallet: testWalletConfig(fixture.container.getRpcUrl()) }));

      const senderBefore = await fixture.container.balance(TEST_ADDRESS);

      await cli.parseAsync([
        "test",
        "use-agently",
        "mcp",
        "call",
        "paid-echo-tool",
        '{"message":"paid cli test"}',
        "--uri",
        fixture.agent.getAgentUrl(),
        "--pay",
      ]);

      const result = out.yaml as Record<string, unknown>;
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toStrictEqual("paid cli test");

      const senderAfter = await fixture.container.balance(TEST_ADDRESS);
      expect(senderBefore.value - senderAfter.value).toStrictEqual(1000n);

      // Restore default mock
      mockConfigModule();
    });
  });
});
