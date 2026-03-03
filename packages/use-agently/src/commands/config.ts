import { Command } from "commander";
import { loadConfig } from "../config.js";
import { output } from "../output.js";

const SENSITIVE_KEYS = new Set(["privateKey", "mnemonic", "seed", "secret"]);

function maskSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key)) {
      result[key] = "***";
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item !== null && typeof item === "object" && !Array.isArray(item)
          ? maskSensitiveFields(item as Record<string, unknown>)
          : item,
      );
    } else if (value !== null && typeof value === "object") {
      result[key] = maskSensitiveFields(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export const configCommand = new Command("config")
  .description("Show or edit current configuration")
  .option("--get <key>", "Get a specific config value by dot-separated key path (e.g. wallet.type)")
  .action(async (options: { get?: string }, command: Command) => {
    const config = await loadConfig();
    if (!config) {
      console.error("No config found. Run `use-agently init` first.");
      process.exit(1);
    }

    if (options.get) {
      const keys = options.get.split(".");
      let value: unknown = config;
      for (const key of keys) {
        if (value === null || typeof value !== "object") {
          console.error(`Key not found: ${options.get}`);
          process.exit(1);
        }
        value = (value as Record<string, unknown>)[key];
      }
      if (value === undefined) {
        console.error(`Key not found: ${options.get}`);
        process.exit(1);
      }
      output(command, value);
    } else {
      output(command, maskSensitiveFields(config as Record<string, unknown>));
    }
  });
