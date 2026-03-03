import { Command } from "commander";
import { execSync } from "node:child_process";
import { output } from "../output.js";
import { loadState, saveState } from "../state.js";
import pkg from "../../package.json" with { type: "json" };

const PACKAGE_NAME = "use-agently";
const NPM_REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`;

export const CURRENT_VERSION: string = pkg.version;

export async function getLatestVersion(): Promise<string> {
  const res = await fetch(NPM_REGISTRY_URL);
  if (!res.ok) throw new Error(`Failed to check npm registry: ${res.status}`);
  const data = (await res.json()) as { version: string };
  return data.version;
}

export function isNewerVersion(current: string, latest: string): boolean {
  const parse = (v: string) => v.replace(/^v/, "").split(".").map(Number);
  const c = parse(current);
  const l = parse(latest);
  for (let i = 0; i < 3; i++) {
    if ((l[i] ?? 0) !== (c[i] ?? 0)) return (l[i] ?? 0) > (c[i] ?? 0);
  }
  return false;
}

export async function runUpdate(version: string): Promise<void> {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Invalid version format received from registry: ${version}`);
  }
  execSync(`npm install -g ${PACKAGE_NAME}@${version}`, { stdio: "pipe" });
}

export async function checkAndUpdate(): Promise<{ current: string; latest: string; updated: boolean }> {
  const current = CURRENT_VERSION;
  const latest = await getLatestVersion();
  const needsUpdate = isNewerVersion(current, latest);

  if (needsUpdate) {
    await runUpdate(latest);
  }

  const state = await loadState();
  await saveState({ ...state, lastUpdateCheck: new Date().toISOString() });

  return { current, latest, updated: needsUpdate };
}

export async function checkAutoUpdate(): Promise<void> {
  try {
    const state = await loadState();
    const lastCheck = state.lastUpdateCheck ? new Date(state.lastUpdateCheck).getTime() : 0;
    const hoursSinceLastCheck = (Date.now() - lastCheck) / (1000 * 60 * 60);

    if (hoursSinceLastCheck < 24) return;

    await checkAndUpdate();
  } catch {
    // Auto-update errors are silently swallowed
  }
}

export const updateCommand = new Command("update")
  .description("Update use-agently to the latest version")
  .action(async (_options: Record<string, never>, command: Command) => {
    try {
      const result = await checkAndUpdate();
      output(command, result);
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
