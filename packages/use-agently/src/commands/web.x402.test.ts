import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { X402Testing } from "../x402.testing";
import { captureOutput, mockConfigModule } from "../testing";

// Skip the entire suite when Foundry (anvil) is not available
const anvilAvailable = Bun.spawnSync(["which", "anvil"]).exitCode === 0;

let dynamicConfig: unknown = undefined;
mockConfigModule(() => dynamicConfig);

const { cli } = await import("../cli");

const x402fl = new X402Testing();

describe.skipIf(!anvilAvailable)("web commands — x402 integration (requires Foundry)", () => {
  const out = captureOutput();

  beforeAll(async () => {
    await x402fl.start();
    dynamicConfig = { wallet: x402fl.getWalletConfig() };
  }, 120_000);

  afterAll(() => x402fl.stop(), 30_000);

  test("web:get completes an x402 payment flow", async () => {
    const url = `${x402fl.getServerUrl()}/`;
    await cli.parseAsync(["test", "use-agently", "-o", "json", "web:get", url]);
    expect(out.json).toMatchObject({ result: "success" });
  });

  test("web (default GET) completes an x402 payment flow", async () => {
    const url = `${x402fl.getServerUrl()}/`;
    await cli.parseAsync(["test", "use-agently", "-o", "json", "web", url]);
    expect(out.json).toMatchObject({ result: "success" });
  });
});
