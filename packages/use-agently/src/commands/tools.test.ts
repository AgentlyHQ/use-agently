import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import { generatePrivateKey } from "viem/accounts";
import {
  captureOutput,
  mockConfigModule,
  startX402FacilitatorLocal,
  stopX402FacilitatorLocal,
  TEST_ADDRESS,
  testWalletConfig,
  type X402FacilitatorLocal,
} from "../testing";

setDefaultTimeout(30_000);

mockConfigModule();

const { cli } = await import("../cli");

let fixture: X402FacilitatorLocal;

beforeAll(async () => {
  fixture = await startX402FacilitatorLocal();
}, 120_000);

afterAll(async () => {
  if (fixture) await stopX402FacilitatorLocal(fixture);
}, 30_000);

describe("tools command (free)", () => {
  describe("list tools", () => {
    const out = captureOutput();

    test("lists available tools", async () => {
      await cli.parseAsync([
        "test",
        "use-agently",
        "-o",
        "json",
        "tools",
        "--uri",
        fixture.agent.getAgentHost() + "/mcp",
      ]);
      const tools = out.jsonLines as Array<Record<string, unknown>>;
      expect(Array.isArray(tools)).toStrictEqual(true);
      expect(tools.length).toBeGreaterThan(0);
      expect(tools[0]).toHaveProperty("name");
      expect(tools[0]).toHaveProperty("description");
    });

    test("json output lists tools as JSON array", async () => {
      await cli.parseAsync([
        "test",
        "use-agently",
        "-o",
        "json",
        "tools",
        "--uri",
        fixture.agent.getAgentHost() + "/mcp",
      ]);
      const tools = out.jsonLines as Array<Record<string, unknown>>;
      expect(Array.isArray(tools)).toStrictEqual(true);
      expect(tools.length).toBeGreaterThan(0);
    });
  });

  describe("call tool", () => {
    const out = captureOutput();

    test("calls echo tool and prints text content directly", async () => {
      const balanceBefore = await fixture.container.balance(TEST_ADDRESS);

      await cli.parseAsync([
        "test",
        "use-agently",
        "-o",
        "tui",
        "tools",
        "--uri",
        fixture.agent.getAgentHost() + "/mcp",
        "call",
        "--tool",
        "echo",
        "--args",
        '{"message":"hello from tools"}',
      ]);
      expect(out.stdout).toStrictEqual("hello from tools");

      const balanceAfter = await fixture.container.balance(TEST_ADDRESS);
      expect(balanceAfter.value).toStrictEqual(balanceBefore.value);
    });
  });
});

describe("tools command x402 payment (paid)", () => {
  describe("cli dry-run and --pay", () => {
    const out = captureOutput();

    test("dry-run tools call on paid tool shows cost and exits 1", async () => {
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
          "tools",
          "--uri",
          fixture.agent.getAgentHost() + "/mcp",
          "call",
          "--tool",
          "paid-echo-tool",
          "--args",
          '{"message":"dry run"}',
        ]);
      } catch {
        // expected: process.exit throws
      } finally {
        process.exit = origExit;
      }

      expect(exitCode).toBe(1);
      expect(out.stderr).toContain("--pay");
    });

    test("tools call with --pay on paid tool prints text and debits sender", async () => {
      mockConfigModule(() => ({ wallet: testWalletConfig(fixture.container.getRpcUrl()) }));

      const senderBefore = await fixture.container.balance(TEST_ADDRESS);

      await cli.parseAsync([
        "test",
        "use-agently",
        "-o",
        "tui",
        "tools",
        "--uri",
        fixture.agent.getAgentHost() + "/mcp",
        "call",
        "--tool",
        "paid-echo-tool",
        "--args",
        '{"message":"paid cli test"}',
        "--pay",
      ]);

      expect(out.stdout).toStrictEqual("paid cli test");

      const senderAfter = await fixture.container.balance(TEST_ADDRESS);
      expect(senderBefore.value - senderAfter.value).toStrictEqual(1000n);

      // Restore default mock
      mockConfigModule();
    }, 30_000);

    test("tools call with --pay and unfunded wallet shows insufficient funds error", async () => {
      const unfundedKey = generatePrivateKey();
      const unfundedConfig = {
        wallet: {
          type: "evm-private-key" as const,
          privateKey: unfundedKey,
          address: "0x0000000000000000000000000000000000000001" as const,
          rpcUrl: fixture.container.getRpcUrl(),
        },
      };
      mockConfigModule(() => unfundedConfig);

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
          "tools",
          "--uri",
          fixture.agent.getAgentHost() + "/mcp",
          "call",
          "--tool",
          "paid-echo-tool",
          "--args",
          '{"message":"should fail"}',
          "--pay",
        ]);
      } catch {
        // expected: process.exit throws
      } finally {
        process.exit = origExit;
      }

      expect(exitCode).toBe(1);
      expect(out.stderr).toContain("Insufficient Funds");
      expect(out.stderr).toContain("$0.001 USDC");

      mockConfigModule();
    }, 30_000);

    test("tools call with --pay and json output emits text content as JSON", async () => {
      mockConfigModule(() => ({ wallet: testWalletConfig(fixture.container.getRpcUrl()) }));

      await cli.parseAsync([
        "test",
        "use-agently",
        "-o",
        "json",
        "tools",
        "--uri",
        fixture.agent.getAgentHost() + "/mcp",
        "call",
        "--tool",
        "paid-echo-tool",
        "--args",
        '{"message":"json output test"}',
        "--pay",
      ]);

      expect(out.json).toStrictEqual("json output test");

      mockConfigModule();
    }, 30_000);
  });
});
