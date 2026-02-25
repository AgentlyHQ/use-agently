import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";

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
  return file.json();
}

export async function saveConfig(config: Config): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await Bun.write(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
}

export async function clearConfig(): Promise<void> {
  const file = Bun.file(CONFIG_PATH);
  if (await file.exists()) {
    await Bun.write(CONFIG_PATH, "{}\n");
  }
}

export async function getConfigOrThrow(): Promise<Config> {
  const config = await loadConfig();
  if (!config?.wallet) {
    throw new Error("No wallet configured. Run `use-agently init` first.");
  }
  return config;
}
