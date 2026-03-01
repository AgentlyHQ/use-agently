const PORT = 3000;
export const AGENT_URL = `http://localhost:${PORT}`;

let proc: ReturnType<typeof Bun.spawn>;

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

export async function startServer(): Promise<void> {
  proc = Bun.spawn(["bun", "run", "dev"], {
    cwd: import.meta.dir,
    stdout: "ignore",
    stderr: "ignore",
  });
  await waitForServer(AGENT_URL);
}

export async function stopServer(): Promise<void> {
  if (proc) {
    proc.kill();
    await proc.exited;
  }
}
