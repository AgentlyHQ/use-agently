import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir, rename, readFile, writeFile } from "node:fs/promises";

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
  let contents: string;
  try {
    contents = await readFile(CONFIG_PATH, "utf8");
  } catch {
    return undefined;
  }
  try {
    return JSON.parse(contents) as Config;
  } catch {
    throw new Error(
      `Config file at ${CONFIG_PATH} contains invalid JSON. Please fix or delete it and run \`use-agently init\`.`,
    );
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf8");
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
