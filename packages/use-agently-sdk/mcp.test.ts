import { afterAll, beforeAll, describe, expect, test, spyOn } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { listMcpTools, callMcpTool } from "./mcp";
import { createMcpPaymentClient, DryRunPaymentRequired, USER_AGENT } from "./client";
import { EvmPrivateKeyWallet } from "./wallets/evm-private-key";
import { PayTransaction } from "./utils/transaction";
import {
  startX402FacilitatorLocal,
  stopX402FacilitatorLocal,
  TEST_ADDRESS,
  TEST_PRIVATE_KEY,
  type X402FacilitatorLocal,
} from "./testing";
import { accounts } from "x402-fl/testcontainers";
import pkg from "./package.json" with { type: "json" };

let fixture: X402FacilitatorLocal;

beforeAll(async () => {
  fixture = await startX402FacilitatorLocal();
}, 120_000);

afterAll(async () => {
  if (fixture) await stopX402FacilitatorLocal(fixture);
}, 30_000);

function mcpUrl(): string {
  return fixture.agent.getAgentUrl().replace(/\/?$/, "/mcp");
}

async function createMcpClient(): Promise<Client> {
  const client = new Client({ name: "@use-agently/sdk-test", version: pkg.version });
  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl()));
  await client.connect(transport);
  return client;
}

describe("mcp free (sdk)", () => {
  test("calls echo tool and returns text content", async () => {
    const client = await createMcpClient();
    try {
      const balanceBefore = await fixture.container.balance(TEST_ADDRESS);

      const result = await client.callTool({ name: "echo", arguments: { message: "hello from mcp" } });
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toStrictEqual("hello from mcp");

      const balanceAfter = await fixture.container.balance(TEST_ADDRESS);
      expect(balanceAfter.value).toStrictEqual(balanceBefore.value);
    } finally {
      await client.close();
    }
  });
});

describe("mcp x402 payment (sdk)", () => {
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

describe("listMcpTools (high-level)", () => {
  test("returns array including echo tool", async () => {
    const tools = await listMcpTools(mcpUrl());
    expect(Array.isArray(tools)).toBe(true);
    const echoTool = tools.find((t) => t.name === "echo");
    expect(echoTool).toBeDefined();
  });

  test("sends User-Agent header by default (via clientFetch)", async () => {
    const spy = spyOn(globalThis, "fetch");
    try {
      await listMcpTools(mcpUrl());
      const headers = new Headers(spy.mock.calls[0][1]?.headers);
      expect(headers.get("User-Agent")).toBe(USER_AGENT);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("callMcpTool (high-level)", () => {
  test("free tool call succeeds in dry-run mode", async () => {
    const result = await callMcpTool(mcpUrl(), "echo", { message: "hello high-level" });
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0].text).toStrictEqual("hello high-level");
  });

  test("paid tool call succeeds with PayTransaction", async () => {
    const wallet = new EvmPrivateKeyWallet(TEST_PRIVATE_KEY, fixture.container.getRpcUrl());
    const senderBefore = await fixture.container.balance(TEST_ADDRESS);
    const receiverBefore = await fixture.container.balance(accounts.facilitator.address);

    const result = await callMcpTool(
      mcpUrl(),
      "paid-echo-tool",
      { message: "hello paid high-level" },
      {
        transaction: PayTransaction(wallet),
      },
    );
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0].text).toStrictEqual("hello paid high-level");

    const senderAfter = await fixture.container.balance(TEST_ADDRESS);
    const receiverAfter = await fixture.container.balance(accounts.facilitator.address);
    expect(senderBefore.value - senderAfter.value).toStrictEqual(1000n);
    expect(receiverAfter.value - receiverBefore.value).toStrictEqual(1000n);
  });

  test("paid tool dry-run throws DryRunPaymentRequired with cost info", async () => {
    try {
      await callMcpTool(mcpUrl(), "paid-echo-tool", { message: "should fail" });
      throw new Error("Expected DryRunPaymentRequired to be thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(DryRunPaymentRequired);
      const err = e as DryRunPaymentRequired;
      expect(err.requirements.length).toBeGreaterThan(0);
      expect(err.requirements[0].amount).toStrictEqual("1000");
      expect(err.requirements[0].network).toStrictEqual("eip155:8453");
      expect(err.message).toContain("$0.001");
      expect(err.message).toContain("USDC");
    }
  });
});
