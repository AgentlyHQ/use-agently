import { Command } from "commander";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { loadConfig, saveConfig, backupConfig, type Config } from "../config.js";
import { output } from "../output.js";
import { loadWallet } from "../wallets/wallet.js";
import { generateEvmPrivateKeyConfig } from "../wallets/evm-private-key.js";

interface Check {
  name: string;
  ok: boolean;
  message?: string;
  fixed?: boolean;
}

export const doctorCommand = new Command("doctor")
  .description("Run environment checks and report any issues")
  .option("--rpc <url>", "Custom RPC URL to use for network check")
  .option("--fix", "Automatically fix detected configuration issues")
  .action(async (options: { rpc?: string; fix?: boolean }, command: Command) => {
    const checks: Check[] = [];

    // Check 1: config file exists and has a wallet
    let config: Config | undefined;
    let configLoadError: string | undefined;
    try {
      config = await loadConfig();
    } catch (err) {
      configLoadError = err instanceof Error ? err.message : String(err);
    }

    const hasWallet = !!config?.wallet;
    const configInvalid = configLoadError !== undefined;
    const walletCheckFailed = configInvalid || !hasWallet;

    let walletFixed = false;
    if (walletCheckFailed && options.fix) {
      try {
        if (configInvalid) {
          try {
            await backupConfig();
          } catch {
            // ignore — file may not exist or backup may fail
          }
        }
        const walletConfig = generateEvmPrivateKeyConfig();
        await saveConfig({ wallet: walletConfig });
        config = { wallet: walletConfig };
        walletFixed = true;
      } catch {
        // fix attempt failed; proceed with original state
      }
    }

    const walletOk = !!config?.wallet;
    checks.push({
      name: "Wallet configured",
      ok: walletOk,
      ...(configInvalid && !walletFixed
        ? { message: configLoadError }
        : !walletOk
          ? { message: "No wallet found. Run `use-agently init` to create one." }
          : {}),
      ...(walletFixed ? { fixed: true } : {}),
    });

    // Check 2: wallet is loadable (private key is valid)
    let walletLoadable = false;
    let walletMessage: string | undefined;
    if (config?.wallet) {
      try {
        const wallet = loadWallet(config.wallet);
        walletLoadable = !!wallet;
      } catch (err) {
        walletMessage = err instanceof Error ? err.message : String(err);
      }
    } else {
      walletMessage = "Skipped (no wallet configured).";
    }
    checks.push({ name: "Wallet loadable", ok: walletLoadable, message: walletMessage });

    // Check 3: network reachable (RPC endpoint)
    let networkOk = false;
    let networkMessage: string | undefined;
    try {
      const client = createPublicClient({ chain: base, transport: http(options.rpc) });
      await client.getChainId();
      networkOk = true;
    } catch (err) {
      networkMessage = err instanceof Error ? err.message : String(err);
    }
    checks.push({ name: "Network reachable (Base RPC)", ok: networkOk, message: networkMessage });

    const allOk = checks.every((c) => c.ok);

    output(command, {
      ok: allOk,
      checks,
    });

    if (!allOk) {
      process.exit(1);
    }
  });
