import { Command } from "commander";
import { encodeFunctionData, formatEther, parseEventLogs, type Chain, type Log } from "viem";
import { ReputationRegistryAbi } from "@aixyz/erc-8004";
import chalk from "chalk";
import boxen from "boxen";
import { getConfigOrThrow } from "../../config.js";
import { loadWallet } from "../../wallets/wallet.js";
import {
  resolveChainConfigById,
  selectChain,
  resolveRegistryAddress,
  getExplorerUrl,
  CHAINS,
} from "../../erc-8004/chain.js";
import { parseAgentId, parseFeedbackIndex } from "../../erc-8004/validate.js";
import { promptAgentId, promptFeedbackIndex, promptRegistryAddress } from "../../erc-8004/prompt.js";
import { label, abiSignature, broadcastAndConfirm } from "../../erc-8004/transaction.js";
import { addSharedOptions, type SharedOptions } from "./shared.js";

interface RevokeFeedbackOptions extends SharedOptions {
  agentId?: string;
  feedbackIndex?: string;
}

export async function revokeFeedback(options: RevokeFeedbackOptions): Promise<void> {
  const chainId =
    options.chainId === undefined || Number.isNaN(options.chainId) ? await selectChain() : options.chainId;
  const chainConfig = resolveChainConfigById(chainId, options.rpcUrl);
  const chainName = Object.entries(CHAINS).find(([, c]) => c.chainId === chainId)?.[0] ?? `chain-${chainId}`;

  const agentIdParsed = parseAgentId(options.agentId ?? (await promptAgentId()));
  const feedbackIndexParsed = parseFeedbackIndex(options.feedbackIndex ?? (await promptFeedbackIndex()));

  const registryAddress =
    resolveRegistryAddress(chainId, options.registry, "reputation") ?? (await promptRegistryAddress());

  const data = encodeFunctionData({
    abi: ReputationRegistryAbi,
    functionName: "revokeFeedback",
    args: [agentIdParsed, feedbackIndexParsed],
  });

  const printTxDetails = (header: string) => {
    console.log("");
    console.log(chalk.dim(header));
    console.log(`  ${label("To")}${registryAddress}`);
    console.log(`  ${label("Data")}${data.slice(0, 10)}${chalk.dim("\u2026" + (data.length - 2) / 2 + " bytes")}`);
    console.log(`  ${label("Chain")}${chainName}`);
    console.log(`  ${label("Function")}${abiSignature(ReputationRegistryAbi, "revokeFeedback")}`);
    console.log(`  ${label("Agent ID")}${agentIdParsed}`);
    console.log(`  ${label("Index")}${feedbackIndexParsed}`);
    console.log("");
  };

  if (!options.broadcast) {
    printTxDetails("Transaction details (dry-run)");
    console.log("Dry-run complete. To sign and broadcast, re-run with --broadcast.");
    return;
  }

  const config = await getConfigOrThrow();
  const wallet = loadWallet(config.wallet);
  const account = wallet.getAccount();

  printTxDetails("Signing transaction...");

  const { hash, receipt, timestamp } = await broadcastAndConfirm({
    account,
    chain: chainConfig.chain,
    to: registryAddress,
    data,
    rpcUrl: options.rpcUrl,
  });

  printRevokeFeedbackResult(receipt, timestamp, chainConfig.chain, hash);
}

function printRevokeFeedbackResult(
  receipt: { blockNumber: bigint; gasUsed: bigint; effectiveGasPrice: bigint; logs: Log[] },
  timestamp: bigint,
  chain: Chain,
  hash: `0x${string}`,
): void {
  const events = parseEventLogs({ abi: ReputationRegistryAbi, logs: receipt.logs });
  const revoked = events.find((e) => e.eventName === "FeedbackRevoked");

  const lines: string[] = [];

  if (revoked) {
    const { agentId, clientAddress, feedbackIndex } = revoked.args as {
      agentId: bigint;
      clientAddress: `0x${string}`;
      feedbackIndex: bigint;
    };
    lines.push(`${label("Agent ID")}${chalk.bold(agentId.toString())}`);
    lines.push(`${label("Client")}${clientAddress}`);
    lines.push(`${label("Index")}${feedbackIndex.toString()}`);
    lines.push(`${label("Block")}${receipt.blockNumber}`);
  } else {
    lines.push(`${label("Block")}${receipt.blockNumber}`);
  }

  lines.push(`${label("Timestamp")}${new Date(Number(timestamp) * 1000).toUTCString()}`);
  lines.push(
    `${label("Gas Paid")}${formatEther(receipt.gasUsed * receipt.effectiveGasPrice)} ${chain.nativeCurrency?.symbol ?? "ETH"}`,
  );
  lines.push(`${label("Tx Hash")}${hash}`);

  const explorerUrl = getExplorerUrl(chain, hash);
  if (explorerUrl) {
    lines.push(`${label("Explorer")}${chalk.cyan(explorerUrl)}`);
  }

  console.log("");
  console.log(
    boxen(lines.join("\n"), {
      padding: { left: 1, right: 1, top: 0, bottom: 0 },
      borderStyle: "round",
      borderColor: "green",
      title: "Feedback revoked successfully",
      titleAlignment: "left",
    }),
  );
}

export const revokeFeedbackCommand = new Command("revoke-feedback")
  .description("Revoke previously submitted feedback on the ReputationRegistry")
  .option("--agent-id <id>", "Agent ID (token ID) of the feedback to revoke")
  .option("--feedback-index <index>", "Feedback index to revoke");
addSharedOptions(revokeFeedbackCommand).action(revokeFeedback);
