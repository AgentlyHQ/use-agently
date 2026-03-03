import { createServer } from "node:net";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

// Base mainnet USDC (also present in Anvil fork)
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Anvil's deterministic account 0 — publicly known, used as payTo address in tests
const PAYTO_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const address = server.address();
      server.close((err) => {
        if (err) reject(err);
        else if (!address || typeof address !== "object") reject(new Error("Failed to get free port"));
        else resolve(address.port);
      });
    });
    server.on("error", reject);
  });
}

export interface X402WalletConfig {
  type: "evm-private-key";
  privateKey: `0x${string}`;
  address: string;
}

/**
 * Local x402 test infrastructure using x402-fl (Anvil fork + local facilitator).
 *
 * Requires `anvil` (from Foundry) to be installed:
 *   https://getfoundry.sh/introduction/installation
 *
 * Start with:  `x402fl.start()`     (takes ~30–60 s for Anvil to fork Base mainnet)
 * Stop with:   `x402fl.stop()`
 *
 * @example
 * ```typescript
 * const x402fl = new X402Testing();
 * beforeAll(() => x402fl.start(), 120_000);
 * afterAll(() => x402fl.stop(), 30_000);
 * ```
 */
export class X402Testing {
  private x402flProc: ReturnType<typeof Bun.spawn> | undefined;
  private bunServer: ReturnType<typeof Bun.serve> | undefined;
  private _serverUrl: string | undefined;
  private _walletConfig: X402WalletConfig | undefined;

  /**
   * Start x402-fl (Anvil + facilitator), fund a fresh test wallet, and
   * launch a local Bun HTTP server that gates every request behind a $0.001
   * USDC x402 payment on Base mainnet (eip155:8453).
   *
   * Throws if `anvil` is not found in PATH.
   */
  async start(): Promise<void> {
    const anvilCheck = Bun.spawnSync(["which", "anvil"]);
    if (anvilCheck.exitCode !== 0) {
      throw new Error("anvil not found in PATH. Install Foundry: https://getfoundry.sh then run: foundryup");
    }

    const anvilPort = await getFreePort();
    const facilitatorPort = await getFreePort();
    const serverPort = await getFreePort();

    // Start x402-fl: Anvil fork + local facilitator server
    this.x402flProc = Bun.spawn(
      ["bunx", "x402-fl", "dev", "--anvil-port", String(anvilPort), "--port", String(facilitatorPort)],
      { cwd: import.meta.dir, stdout: "ignore", stderr: "pipe" },
    );

    const facilitatorUrl = `http://localhost:${facilitatorPort}`;

    // Wait for the facilitator health endpoint
    await this.waitFor(`${facilitatorUrl}/health`);

    // Generate a fresh payer wallet for this test run
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);

    // Fund the payer with 10 USDC on the local Anvil fork
    const fundResult = Bun.spawnSync(
      ["bunx", "x402-fl", "fund", account.address, "10", "--anvil-port", String(anvilPort)],
      { cwd: import.meta.dir, stdout: "ignore" },
    );
    if (fundResult.exitCode !== 0) {
      throw new Error(`Failed to fund test wallet: exit ${fundResult.exitCode}`);
    }

    // Build the static payment requirements for the test server
    const serverUrl = `http://localhost:${serverPort}`;
    const paymentRequirements = {
      x402Version: 1,
      accepts: [
        {
          scheme: "exact",
          network: "eip155:8453",
          maxAmountRequired: "1000", // 0.001 USDC (6 decimals)
          resource: `${serverUrl}/`,
          description: "x402-fl integration test endpoint",
          mimeType: "application/json",
          payTo: PAYTO_ADDRESS,
          asset: USDC_ADDRESS,
          outputSchema: null,
          maxTimeoutSeconds: 300,
          extra: { name: "USD Coin", version: "2" },
        },
      ],
    };

    // Launch the Bun HTTP server with manual x402 payment gating
    this._serverUrl = serverUrl;
    this.bunServer = Bun.serve({
      port: serverPort,
      fetch: async (req: Request): Promise<Response> => {
        const xPayment = req.headers.get("X-Payment");

        // No payment header → return 402 with payment requirements
        if (!xPayment) {
          return new Response(JSON.stringify(paymentRequirements), {
            status: 402,
            headers: { "Content-Type": "application/json" },
          });
        }

        let paymentPayload: unknown;
        try {
          paymentPayload = JSON.parse(Buffer.from(xPayment, "base64").toString("utf8"));
        } catch {
          return new Response(JSON.stringify({ error: "Invalid X-Payment header" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Verify payment with the local facilitator
        const verifyRes = await fetch(`${facilitatorUrl}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentPayload, paymentRequirements: paymentRequirements.accepts[0] }),
        });
        const verify = (await verifyRes.json()) as { isValid: boolean; invalidReason?: string };

        if (!verify.isValid) {
          return new Response(JSON.stringify(paymentRequirements), {
            status: 402,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Settle payment on-chain via the local facilitator
        const settleRes = await fetch(`${facilitatorUrl}/settle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentPayload, paymentRequirements: paymentRequirements.accepts[0] }),
        });
        const settle = (await settleRes.json()) as { success: boolean; errorReason?: string };

        if (!settle.success) {
          return new Response(JSON.stringify({ error: settle.errorReason ?? "Settlement failed" }), {
            status: 402,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ result: "success", path: new URL(req.url).pathname }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Payment-Response": Buffer.from(JSON.stringify(settle)).toString("base64"),
          },
        });
      },
    });

    this._walletConfig = { type: "evm-private-key", privateKey, address: account.address };
  }

  async stop(): Promise<void> {
    this.bunServer?.stop();
    if (this.x402flProc) {
      this.x402flProc.kill();
      await this.x402flProc.exited;
      this.x402flProc = undefined;
    }
  }

  /** URL of the x402-protected test HTTP server. Throws if not yet started. */
  getServerUrl(): string {
    if (!this._serverUrl) throw new Error("X402Testing has not been started. Call start() first.");
    return this._serverUrl;
  }

  /** Config for the funded test payer wallet. Throws if not yet started. */
  getWalletConfig(): X402WalletConfig {
    if (!this._walletConfig) throw new Error("X402Testing has not been started. Call start() first.");
    return this._walletConfig;
  }

  private async waitFor(url: string, timeoutMs = 90_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(url);
        if (res.ok) return;
      } catch {
        // still starting
      }
      await Bun.sleep(500);
    }
    const stderrText = this.x402flProc?.stderr ? await new Response(this.x402flProc.stderr).text().catch(() => "") : "";
    throw new Error(
      `Service at ${url} did not become healthy within ${timeoutMs}ms` +
        (stderrText ? `\nx402-fl stderr:\n${stderrText}` : ""),
    );
  }
}
