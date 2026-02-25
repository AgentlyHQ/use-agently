import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir, rename } from "node:fs/promises";

const CONFIG_DIR = join(homedir(), ".use-agently");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export interface WalletConfig {
  type: string;
  [key: string]: unknown;
}

export interface Config {
  wallet: WalletConfig;
}

export async function loadConfig(): Promise<Config | undefined> {
  const file = Bun.file(CONFIG_PATH);
  if (!(await file.exists())) {
    return undefined;
  }
  return (await file.json()) as Promise<Config>;
}

export async function saveConfig(config: Config): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await Bun.write(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
}

export async function backupConfig(): Promise<string> {
  const now = new Date();
  const timestamp = now.toISOString().replace(/T/, "_").replace(/:/g, "").replace(/\..+/, "").slice(0, 17);
  const backupPath = join(CONFIG_DIR, `config-${timestamp}.json`);
  await rename(CONFIG_PATH, backupPath);
  return backupPath;
}

export async function getConfigOrThrow(): Promise<Config> {
  const config = await loadConfig();
  if (!config?.wallet) {
    throw new Error("No wallet configured. Run `use-agently init` first.");
  }
  return config;
}
