import { createServer } from "node:net";
import { startFacilitator } from "./facilitator";

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const address = server.address();
      server.close((err) => {
        if (err) return reject(err);
        if (!address || typeof address !== "object") return reject(new Error("Failed to obtain a free port"));
        resolve(address.port);
      });
    });
    server.on("error", reject);
  });
}

/**
 * Test helper for the localhost-x402 package.
 *
 * Manages the full x402 local test stack:
 *   1. Anvil — local EVM node (chain ID 84532) via Bun.spawn
 *   2. Mock x402 facilitator HTTP server (always accepts payments)
 *   3. AixyzServer with paid-echo A2A agent and MCP tool
 *
 * Usage (mirrors AixyzTesting from localhost-aixyz):
 *   const server = new X402Testing();
 *   beforeAll(() => server.start(), 60000);
 *   afterAll(() => server.stop(), 10000);
 */
export class X402Testing {
  private anvilProc: ReturnType<typeof Bun.spawn> | undefined;
  private facilitatorStop: (() => void) | undefined;
  private agentProc: ReturnType<typeof Bun.spawn> | undefined;
  private agentUrl: string | undefined;

  getAgentUrl(): string {
    if (!this.agentUrl) throw new Error("Server has not been started. Call start() first.");
    return this.agentUrl;
  }

  async start(port?: number): Promise<void> {
    const anvilPort = await getFreePort();
    const facilitatorPort = await getFreePort();
    const agentPort = port ?? (await getFreePort());

    this.agentUrl = `http://localhost:${agentPort}`;

    // 1. Start anvil with chain ID 84532 (Base Sepolia) — no fork required.
    //    The chain ID is used in EIP-712 domain for EIP-3009 signatures.
    this.anvilProc = Bun.spawn(
      ["/home/runner/.foundry/bin/anvil", "--port", String(anvilPort), "--chain-id", "84532", "--silent"],
      { stdout: "ignore", stderr: "ignore" },
    );

    // 2. Start mock x402 facilitator.
    const fac = await startFacilitator(facilitatorPort);
    this.facilitatorStop = fac.stop;

    // 3. Start the AixyzServer (aixyz dev) with the local facilitator.
    this.agentProc = Bun.spawn(["bun", "run", "dev", "--", "--port", String(agentPort)], {
      cwd: import.meta.dir,
      stdout: "ignore",
      stderr: "ignore",
      env: {
        ...process.env,
        PORT: String(agentPort),
        FACILITATOR_PORT: String(facilitatorPort),
      },
    });

    await this.waitForServer(this.agentUrl);
  }

  async stop(): Promise<void> {
    if (this.agentProc) {
      this.agentProc.kill();
      await this.agentProc.exited;
      this.agentProc = undefined;
    }
    if (this.facilitatorStop) {
      this.facilitatorStop();
      this.facilitatorStop = undefined;
    }
    if (this.anvilProc) {
      this.anvilProc.kill();
      await this.anvilProc.exited;
      this.anvilProc = undefined;
    }
    this.agentUrl = undefined;
  }

  private async waitForServer(url: string, timeout = 30000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const res = await fetch(`${url}/.well-known/agent-card.json`);
        if (res.ok) return;
      } catch {}
      await Bun.sleep(200);
    }
    throw new Error(`Server at ${url} did not start within ${timeout}ms`);
  }
}
