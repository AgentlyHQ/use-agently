import { Command } from "commander";
import { loadConfig, saveConfig } from "../config.js";
import { generateEvmPrivateKeyConfig } from "../wallets/evm-private-key.js";

export const initCommand = new Command("init")
  .description("Generate a new local wallet and save it to config")
  .action(async () => {
    const existing = await loadConfig();
    if (existing?.wallet) {
      console.error("Wallet already configured. To reinitialize, run `use-agently reset` first.");
      process.exit(1);
    }

    const walletConfig = generateEvmPrivateKeyConfig();
    await saveConfig({ wallet: walletConfig });

    console.log("Wallet created successfully!");
    console.log(`Address: ${walletConfig.address}`);
    console.log("\nFund this address to start using agents on Agently.");
  });
