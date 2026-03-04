import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { createA2AClient, createPaymentFetch, createDryRunFetch, DryRunPaymentRequired } from "../client";
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
import { extractAgentText } from "./a2a";
import { EvmPrivateKeyWallet } from "../wallets/evm-private-key";

mockConfigModule();

const { cli } = await import("../cli");

let fixture: X402FacilitatorLocal;

beforeAll(async () => {
  fixture = await startX402FacilitatorLocal();
}, 120_000);

afterAll(async () => {
  if (fixture) await stopX402FacilitatorLocal(fixture);
}, 30_000);

describe("a2a command (free)", () => {
  test("createA2AClient connects to a free agent", async () => {
    const client = await createA2AClient(fixture.agent.getAgentUrl(), fetch);
    expect(client).toBeDefined();
  });

  test("sendMessage returns echoed text via extractAgentText", async () => {
    const client = await createA2AClient(fixture.agent.getAgentUrl() + "/free-echo/", fetch);
    const balanceBefore = await fixture.container.balance(TEST_ADDRESS);

    const result = await client.sendMessage({
      message: {
        kind: "message",
        messageId: randomUUID(),
        role: "user",
        parts: [{ kind: "text", text: "hello world" }],
      },
    });
    expect(extractAgentText(result)).toStrictEqual("hello world");

    const balanceAfter = await fixture.container.balance(TEST_ADDRESS);
    expect(balanceAfter.value).toStrictEqual(balanceBefore.value);
  });

  test("extractAgentText handles different messages", async () => {
    const client = await createA2AClient(fixture.agent.getAgentUrl() + "/free-echo/", fetch);
    const message = "use-agently integration test";
    const result = await client.sendMessage({
      message: {
        kind: "message",
        messageId: randomUUID(),
        role: "user",
        parts: [{ kind: "text", text: message }],
      },
    });
    expect(extractAgentText(result)).toStrictEqual(message);
  });

  describe("cli", () => {
    const out = captureOutput();

    test("text output", async () => {
      await cli.parseAsync([
        "test",
        "use-agently",
        "a2a",
        "send",
        "--uri",
        fixture.agent.getAgentUrl() + "/free-echo/",
        "-m",
        "hello world",
      ]);
      expect(out.stdout).toStrictEqual("hello world");
    });

    test("streams text output 10 times", async () => {
      await cli.parseAsync([
        "test",
        "use-agently",
        "a2a",
        "send",
        "--uri",
        fixture.agent.getAgentUrl() + "/free-echo-10/",
        "-m",
        "hi",
      ]);
      // free-echo-10 streams the message back 10 times with 200ms delays between each chunk
      const expected = "hi\nhi\nhi\nhi\nhi\nhi\nhi\nhi\nhi\nhi";
      expect(out.stdout).toStrictEqual(expected);
    }, 15000);
  });
});

describe("a2a card command (free)", () => {
  describe("cli", () => {
    const out = captureOutput();

    test("text output returns agent card fields", async () => {
      await cli.parseAsync(["test", "use-agently", "a2a", "card", "--uri", fixture.agent.getAgentUrl()]);
      const card = out.yaml as Record<string, unknown>;
      expect(card).toHaveProperty("name");
      expect(card).toHaveProperty("description");
      expect(card).toHaveProperty("url");
    });

    test("json output returns agent card as JSON", async () => {
      await cli.parseAsync(["test", "use-agently", "-o", "json", "a2a", "card", "--uri", fixture.agent.getAgentUrl()]);
      const card = out.json as Record<string, unknown>;
      expect(card).toHaveProperty("name");
      expect(card).toHaveProperty("description");
      expect(card).toHaveProperty("url");
    });
  });
});

describe("a2a x402 payment (paid)", () => {
  test("paid send succeeds with funded wallet and debits sender exactly $0.001", async () => {
    const wallet = new EvmPrivateKeyWallet(TEST_PRIVATE_KEY, fixture.container.getRpcUrl());
    const paymentFetch = createPaymentFetch(wallet);
    const client = await createA2AClient(fixture.agent.getAgentUrl() + "/paid-echo/", paymentFetch as typeof fetch);

    const senderBefore = await fixture.container.balance(TEST_ADDRESS);
    const receiverBefore = await fixture.container.balance(accounts.facilitator.address);

    const result = await client.sendMessage({
      message: {
        kind: "message",
        messageId: randomUUID(),
        role: "user",
        parts: [{ kind: "text", text: "hello x402" }],
      },
    });

    expect(extractAgentText(result)).toStrictEqual("hello x402");

    const senderAfter = await fixture.container.balance(TEST_ADDRESS);
    const receiverAfter = await fixture.container.balance(accounts.facilitator.address);

    // $0.001 USDC = 1000 raw units (6 decimals)
    expect(senderBefore.value - senderAfter.value).toStrictEqual(1000n);
    expect(receiverAfter.value - receiverBefore.value).toStrictEqual(1000n);
  });

  test("dry-run on paid endpoint throws DryRunPaymentRequired with cost info", async () => {
    const dryRunFetch = createDryRunFetch();
    const client = await createA2AClient(fixture.agent.getAgentUrl() + "/paid-echo/", dryRunFetch);

    try {
      await client.sendMessage({
        message: {
          kind: "message",
          messageId: randomUUID(),
          role: "user",
          parts: [{ kind: "text", text: "dry run" }],
        },
      });
      throw new Error("Expected DryRunPaymentRequired to be thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(DryRunPaymentRequired);
      const err = e as DryRunPaymentRequired;
      // Assert the requirement shape exactly (1000 raw units = $0.001 USDC with 6 decimals)
      expect(err.requirements.length).toBeGreaterThan(0);
      expect(err.requirements[0].amount).toBe("1000");
      expect(err.requirements[0].network).toBe("eip155:8453");
      // Formatted message surfaces the cost and --pay hint
      expect(err.message).toContain("$0.001");
      expect(err.message).toContain("USDC");
      expect(err.message).toContain("--pay");
    }
  });

  test("unpaid send returns 402", async () => {
    const client = await createA2AClient(fixture.agent.getAgentUrl() + "/paid-echo/", fetch);

    try {
      await client.sendMessage({
        message: {
          kind: "message",
          messageId: randomUUID(),
          role: "user",
          parts: [{ kind: "text", text: "should fail" }],
        },
      });
      throw new Error("Expected promise to reject, but it resolved");
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).message).toContain("402");
    }
  });

  test("unfunded wallet fails payment", async () => {
    const { generatePrivateKey } = await import("viem/accounts");
    const emptyKey = generatePrivateKey();
    const wallet = new EvmPrivateKeyWallet(emptyKey, fixture.container.getRpcUrl());
    const paymentFetch = createPaymentFetch(wallet);
    const client = await createA2AClient(fixture.agent.getAgentUrl() + "/paid-echo/", paymentFetch as typeof fetch);

    try {
      await client.sendMessage({
        message: {
          kind: "message",
          messageId: randomUUID(),
          role: "user",
          parts: [{ kind: "text", text: "should fail" }],
        },
      });
      throw new Error("Expected promise to reject, but it resolved");
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).message).toContain("402");
    }
  });

  describe("cli", () => {
    const out = captureOutput();

    test("a2a send without --pay on paid agent shows dry-run cost message and exits 1", async () => {
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
          "a2a",
          "send",
          "--uri",
          fixture.agent.getAgentUrl() + "/paid-echo/",
          "-m",
          "hello",
        ]);
      } catch {
        // expected: process.exit throws
      } finally {
        process.exit = origExit;
      }

      expect(exitCode).toBe(1);
      expect(out.stderr).toContain("--pay");
    });
  });
});
