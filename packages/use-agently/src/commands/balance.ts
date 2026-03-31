import { Command } from "commander";
import { getOutputFormat, outputJson, outputTuiKeyValue } from "../output";
import { getBalance } from "@use-agently/sdk";
import { getConfigOrThrow, getActiveProvider } from "../config";
import { resolveWallet } from "../wallet";
import { detectProviders } from "../providers";

export const balanceCommand = new Command("balance")
  .description("Check wallet balance on-chain")
  .option("--rpc <url>", "Custom RPC URL")
  .option("--testnet", "Check Base Sepolia Testnet")
  .showHelpAfterError(true)
  .addHelpText("after", "\nExamples:\n  use-agently balance\n  use-agently balance --testnet")
  .action(async (options: { rpc?: string; testnet?: boolean }, command: Command) => {
    const config = await getConfigOrThrow();
    const wallet = await resolveWallet(config);
    const chain = options.testnet ? "base-sepolia" : "base";
    const result = await getBalance(wallet.address, { rpc: options.rpc, chain });
    const activeProvider = getActiveProvider(config);

    const detected = await detectProviders(activeProvider);
    const otherProviders = detected.filter((p) => p.installed && !p.active);

    const format = getOutputFormat(command);

    if (format === "json") {
      outputJson({
        ...result,
        provider: activeProvider,
        otherProviders: otherProviders.map((p) => ({
          type: p.type,
          name: p.name,
          address: p.address,
          switchCommand: `use-agently wallet set ${p.type}`,
        })),
      });
    } else {
      outputTuiKeyValue({ ...result, provider: activeProvider });

      if (otherProviders.length > 0) {
        console.log("");
        console.log("Other wallets detected:");
        for (const p of otherProviders) {
          const addr = p.address ? `  ${p.address}` : "";
          console.log(`  ${p.name}${addr}`);
        }
        console.log("\nSwitch provider: use-agently wallet set <provider>");
      }
    }
  });
