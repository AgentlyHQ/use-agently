import { Command } from "commander";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { output } from "../output.js";
import { loadWallet, generateEvmPrivateKeyConfig } from "@use-agently/sdk";
import { loadConfig, saveConfig, backupConfig } from "../config.js";

interface Check {
  name: string;
  ok: boolean;
  message?: string;
  fixed?: boolean;
}

export const doctorCommand = new Command("doctor")
  .description("Run environment checks and report any issues")
  .option("--rpc <url>", "Custom RPC URL to use for network check")
  .option("--fix", "Automatically fix detected issues (backs up existing config and regenerates a new wallet)")
  .showHelpAfterError(true)
  .addHelpText("after", "\nConfig: ~/.use-agently/config.json (global), .use-agently/config.json (local)")
  .action(async (options: { rpc?: string; fix?: boolean }, command: Command) => {
    const checks: Check[] = [];

    // Check 1: config file exists and has a wallet
    let config: Awaited<ReturnType<typeof loadConfig>>;
    let configError: string | undefined;
    try {
      config = await loadConfig();
    } catch (err) {
      configError = err instanceof Error ? err.message : String(err);
    }

    const hasWallet = !configError && !!config?.wallet;

    if (!hasWallet && options.fix) {
      // Attempt to auto-fix: back up any corrupt file, generate and save a new wallet
      let fixSucceeded = false;
      let fixError: string | undefined;
      try {
        if (configError) {
          try {
            const backupPath = await backupConfig();
            console.error(`Corrupt config backed up to ${backupPath}`);
          } catch {
            // Backup failed (e.g. corrupt config was local scope); continue with fix
          }
        }
        const walletConfig = generateEvmPrivateKeyConfig();
        config = { wallet: walletConfig };
        await saveConfig(config);
        fixSucceeded = true;
      } catch (err) {
        fixError = err instanceof Error ? err.message : String(err);
      }
      checks.push({
        name: "Wallet configured",
        ok: fixSucceeded,
        ...(fixSucceeded
          ? { fixed: true }
          : { message: fixError ? `Fix failed: ${fixError}` : (configError ?? "Unknown error") }),
      });
    } else {
      checks.push({
        name: "Wallet configured",
        ok: hasWallet,
        ...(hasWallet
          ? {}
          : {
              message: configError
                ? `${configError} Run \`use-agently init\` to reset it.`
                : "No wallet found. Run `use-agently init` to create one.",
            }),
      });
    }

    // Check 2: wallet is loadable (private key is valid)
    let walletOk = false;
    let walletLoadMessage: string | undefined;
    let walletLoadFixed = false;

    if (config?.wallet) {
      try {
        const wallet = loadWallet(config.wallet);
        walletOk = !!wallet;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (options.fix) {
          try {
            try {
              const backupPath = await backupConfig();
              console.error(`Invalid wallet config backed up to ${backupPath}`);
            } catch {
              // Backup failed; continue with fix
            }
            const walletConfig = generateEvmPrivateKeyConfig();
            config = { wallet: walletConfig };
            await saveConfig(config);
            walletOk = true;
            walletLoadFixed = true;
          } catch (fixErr) {
            walletLoadMessage = `Fix failed: ${fixErr instanceof Error ? fixErr.message : String(fixErr)}`;
          }
        } else {
          walletLoadMessage = errMsg;
        }
      }
    } else {
      walletLoadMessage = "Skipped (no wallet configured).";
    }

    checks.push({
      name: "Wallet loadable",
      ok: walletOk,
      ...(walletLoadFixed ? { fixed: true } : {}),
      ...(walletLoadMessage ? { message: walletLoadMessage } : {}),
    });

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

    const networkCheck: Check = { name: "Network reachable (Base RPC)", ok: networkOk };
    if (networkMessage) networkCheck.message = networkMessage;
    checks.push(networkCheck);

    const allOk = checks.every((c) => c.ok);

    output(command, {
      ok: allOk,
      checks,
    });

    if (!allOk) {
      process.exit(1);
    }
  });
