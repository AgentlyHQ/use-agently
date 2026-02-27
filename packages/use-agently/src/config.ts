import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir, rename, readFile, writeFile } from "node:fs/promises";

export type ConfigScope = "global" | "local";

export interface WalletConfig {
  type: string;
  [key: string]: unknown;
}

export interface Config {
  wallet: WalletConfig;
}

function getConfigDir(scope: ConfigScope): string {
  return scope === "local" ? join(process.cwd(), ".use-agently") : join(homedir(), ".use-agently");
}

function getConfigPath(scope: ConfigScope): string {
  return join(getConfigDir(scope), "config.json");
}

async function loadConfigFromPath(configPath: string): Promise<Config | undefined> {
  let contents: string;
  try {
    contents = await readFile(configPath, "utf8");
  } catch {
    return undefined;
  }
  try {
    return JSON.parse(contents) as Config;
  } catch {
    throw new Error(
      `Config file at ${configPath} contains invalid JSON. Please fix or delete it and run \`use-agently init\`.`,
    );
  }
}

export async function loadConfig(scope?: ConfigScope): Promise<Config | undefined> {
  if (scope !== undefined) {
    return loadConfigFromPath(getConfigPath(scope));
  }
  // Without an explicit scope, local (project) config takes priority over global
  return (await loadConfigFromPath(getConfigPath("local"))) ?? (await loadConfigFromPath(getConfigPath("global")));
}

export async function saveConfig(config: Config, scope: ConfigScope = "global"): Promise<void> {
  const configDir = getConfigDir(scope);
  const configPath = getConfigPath(scope);
  await mkdir(configDir, { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");
}

export async function backupConfig(scope: ConfigScope = "global"): Promise<string> {
  const configDir = getConfigDir(scope);
  const configPath = getConfigPath(scope);
  const now = new Date();
  const timestamp = now.toISOString().replace(/T/, "_").replace(/:/g, "").replace(/\..+/, "").slice(0, 17);
  const backupPath = join(configDir, `config-${timestamp}.json`);
  await rename(configPath, backupPath);
  return backupPath;
}

export async function getConfigOrThrow(): Promise<Config> {
  const config = await loadConfig();
  if (!config?.wallet) {
    throw new Error("No wallet configured. Run `use-agently init` first.");
  }
  return config;
}
