const DEFAULT_PORT = 3000;

let proc: ReturnType<typeof Bun.spawn>;
let agentUrl: string;

export function getAgentUrl(): string {
  if (!agentUrl) throw new Error("Server has not been started. Call startServer() first.");
  return agentUrl;
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

export async function startServer(port = DEFAULT_PORT): Promise<void> {
  agentUrl = `http://localhost:${port}`;
  proc = Bun.spawn(["bun", "run", "dev", "--", "--port", String(port)], {
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
