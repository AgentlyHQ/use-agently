import { Command } from "commander";
import { loadConfig, saveConfig, backupConfig, type ConfigScope } from "../config.js";
import { generateEvmPrivateKeyConfig } from "../wallets/evm-private-key.js";

export const initCommand = new Command("init")
  .description("Generate a new local wallet and save it to config")
  .option("--regenerate", "Backup existing config and generate a new wallet")
  .option("--local", "Save config to the current directory (.use-agently/config.json) instead of the home directory")
  .action(async (options: { regenerate?: boolean; local?: boolean }) => {
    const scope: ConfigScope = options.local ? "local" : "global";
    const existing = await loadConfig(scope);
    if (existing?.wallet) {
      if (!options.regenerate) {
        console.error("Wallet already configured. Use --regenerate to create a new wallet.");
        process.exit(1);
      }
      const backupPath = await backupConfig(scope);
      console.log(`Existing config backed up to ${backupPath}`);
    }

    const walletConfig = generateEvmPrivateKeyConfig();
    await saveConfig({ ...existing, wallet: walletConfig }, scope);

    console.log("Wallet created successfully!");
    console.log(`Address: ${walletConfig.address}`);
    console.log("\nFund this address to start using agents on Agently.");
  });
