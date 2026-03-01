import { createServer } from "node:net";

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

export class AixyzTesting {
  private proc: ReturnType<typeof Bun.spawn> | undefined;
  private agentUrl: string | undefined;

  getAgentUrl(): string {
    if (!this.agentUrl) throw new Error("Server has not been started. Call start() first.");
    return this.agentUrl;
  }

  async start(port?: number): Promise<void> {
    const resolvedPort = port ?? (await getFreePort());
    this.agentUrl = `http://localhost:${resolvedPort}`;
    this.proc = Bun.spawn(["bun", "run", "dev", "--", "--port", String(resolvedPort)], {
      cwd: import.meta.dir,
      stdout: "ignore",
      stderr: "ignore",
      env: { ...process.env, PORT: String(resolvedPort) },
    });
    await this.waitForServer(this.agentUrl);
  }

  async stop(): Promise<void> {
    if (this.proc) {
      this.proc.kill();
      await this.proc.exited;
      this.proc = undefined;
      this.agentUrl = undefined;
    }
  }

  private async waitForServer(url: string, timeout = 20000): Promise<void> {
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
