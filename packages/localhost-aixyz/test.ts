import { createServer } from "node:net";

let proc: ReturnType<typeof Bun.spawn>;
let agentUrl: string;

export function getAgentUrl(): string {
  if (!agentUrl) throw new Error("Server has not been started. Call startServer() first.");
  return agentUrl;
}

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

async function waitForServer(url: string, timeout = 20000): Promise<void> {
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

export async function startServer(port?: number): Promise<void> {
  const resolvedPort = port ?? (await getFreePort());
  agentUrl = `http://localhost:${resolvedPort}`;
  proc = Bun.spawn(["bun", "run", "dev", "--", "--port", String(resolvedPort)], {
    cwd: import.meta.dir,
    stdout: "ignore",
    stderr: "ignore",
  });
  await waitForServer(agentUrl);
}

export async function stopServer(): Promise<void> {
  if (proc) {
    proc.kill();
    await proc.exited;
  }
}
