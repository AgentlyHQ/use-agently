import { Command } from "commander";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { output } from "../output.js";

function getCurrentVersion(): string {
  const baseDir = dirname(fileURLToPath(import.meta.url));
  // Try ../package.json (from built binary at build/) and ../../package.json (from source at src/commands/)
  for (const rel of ["../package.json", "../../package.json"]) {
    try {
      const pkgPath = join(baseDir, rel);
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string; version?: string };
      if (pkg.name === "use-agently" && pkg.version) return pkg.version;
    } catch {
      // try next candidate
    }
  }
  return "0.0.0";
}

export const updateCommand = new Command("update")
  .description("Update use-agently to the latest version")
  .action(async (_options: Record<string, never>, command: Command) => {
    const current = getCurrentVersion();

    let latest: string;
    try {
      const res = await fetch("https://registry.npmjs.org/use-agently/latest");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { version: string };
      if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(data.version)) {
        throw new Error(`Unexpected version format from registry: ${data.version}`);
      }
      latest = data.version;
    } catch (err) {
      console.error(`Failed to check for updates: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }

    if (current === latest) {
      output(command, { current, latest, message: "Already up to date." });
      return;
    }

    output(command, { current, latest, message: `Updating to ${latest}...` });

    try {
      execSync(`npm install -g use-agently@${latest}`, { stdio: "inherit" });
    } catch (err) {
      console.error(`Update failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });
