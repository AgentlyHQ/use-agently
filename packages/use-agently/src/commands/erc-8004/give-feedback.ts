import { Command } from "commander";
import { encodeFunctionData, formatEther, formatUnits, parseEventLogs, type Chain, type Log } from "viem";
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
import { parseAgentId, parseFeedbackValue, parseValueDecimals, parseBytes32Hash } from "../../erc-8004/validate.js";
import {
  promptAgentId,
  promptFeedbackValue,
  promptValueDecimals,
  promptRegistryAddress,
} from "../../erc-8004/prompt.js";
import { label, abiSignature, broadcastAndConfirm } from "../../erc-8004/transaction.js";
import { addSharedOptions, type SharedOptions } from "./shared.js";

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

interface GiveFeedbackOptions extends SharedOptions {
  agentId?: string;
  value?: string;
  valueDecimals?: string;
  tag1?: string;
  tag2?: string;
  endpoint?: string;
  feedbackUri?: string;
  feedbackHash?: string;
}

export async function giveFeedback(options: GiveFeedbackOptions): Promise<void> {
  const chainId =
    options.chainId === undefined || Number.isNaN(options.chainId) ? await selectChain() : options.chainId;
  const chainConfig = resolveChainConfigById(chainId, options.rpcUrl);
  const chainName = Object.entries(CHAINS).find(([, c]) => c.chainId === chainId)?.[0] ?? `chain-${chainId}`;

  const agentIdParsed = parseAgentId(options.agentId ?? (await promptAgentId()));
  const valueParsed = parseFeedbackValue(options.value ?? (await promptFeedbackValue()));
  const decimalsParsed = parseValueDecimals(options.valueDecimals ?? (await promptValueDecimals()));

  const tag1 = options.tag1 ?? "";
  const tag2 = options.tag2 ?? "";
  const endpoint = options.endpoint ?? "";
  const feedbackUri = options.feedbackUri ?? "";
  const feedbackHashRaw = options.feedbackHash ?? ZERO_BYTES32;
  const feedbackHash =
    feedbackHashRaw !== ZERO_BYTES32 ? parseBytes32Hash(feedbackHashRaw, "feedback hash") : ZERO_BYTES32;

  const registryAddress =
    resolveRegistryAddress(chainId, options.registry, "reputation") ?? (await promptRegistryAddress());

  const data = encodeFunctionData({
    abi: ReputationRegistryAbi,
    functionName: "giveFeedback",
    args: [agentIdParsed, valueParsed, decimalsParsed, tag1, tag2, endpoint, feedbackUri, feedbackHash],
  });

  const printTxDetails = (header: string) => {
    console.log("");
    console.log(chalk.dim(header));
    console.log(`  ${label("To")}${registryAddress}`);
    console.log(`  ${label("Data")}${data.slice(0, 10)}${chalk.dim("\u2026" + (data.length - 2) / 2 + " bytes")}`);
    console.log(`  ${label("Chain")}${chainName}`);
    console.log(`  ${label("Function")}${abiSignature(ReputationRegistryAbi, "giveFeedback")}`);
    console.log(`  ${label("Agent ID")}${agentIdParsed}`);
    const displayValue =
      decimalsParsed > 0 ? `${valueParsed} (${formatUnits(valueParsed, decimalsParsed)})` : `${valueParsed}`;
    console.log(`  ${label("Value")}${displayValue}`);
    console.log(`  ${label("Decimals")}${decimalsParsed}`);
    console.log(`  ${label("Tag1")}${tag1}`);
    console.log(`  ${label("Tag2")}${tag2}`);
    console.log(`  ${label("Endpoint")}${endpoint}`);
    console.log(`  ${label("Feedback URI")}${feedbackUri}`);
    console.log(`  ${label("Feedback Hash")}${feedbackHash}`);
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

  printGiveFeedbackResult(receipt, timestamp, chainConfig.chain, hash);
}

function printGiveFeedbackResult(
  receipt: { blockNumber: bigint; gasUsed: bigint; effectiveGasPrice: bigint; logs: Log[] },
  timestamp: bigint,
  chain: Chain,
  hash: `0x${string}`,
): void {
  const events = parseEventLogs({ abi: ReputationRegistryAbi, logs: receipt.logs });
  const newFeedback = events.find((e) => e.eventName === "NewFeedback");

  const lines: string[] = [];

  if (newFeedback) {
    const {
      agentId,
      clientAddress,
      feedbackIndex,
      value,
      valueDecimals,
      tag1,
      tag2,
      endpoint,
      feedbackURI,
      feedbackHash,
    } = newFeedback.args as {
      agentId: bigint;
      clientAddress: `0x${string}`;
      feedbackIndex: bigint;
      value: bigint;
      valueDecimals: number;
      tag1: string;
      tag2: string;
      endpoint: string;
      feedbackURI: string;
      feedbackHash: `0x${string}`;
    };
    lines.push(`${label("Agent ID")}${chalk.bold(agentId.toString())}`);
    lines.push(`${label("Client")}${clientAddress}`);
    lines.push(`${label("Index")}${feedbackIndex.toString()}`);
    const displayValue = valueDecimals > 0 ? `${value} (${formatUnits(value, valueDecimals)})` : `${value}`;
    lines.push(`${label("Value")}${displayValue}`);
    lines.push(`${label("Decimals")}${valueDecimals}`);
    lines.push(`${label("Tag1")}${tag1}`);
    lines.push(`${label("Tag2")}${tag2}`);
    lines.push(`${label("Endpoint")}${endpoint}`);
    lines.push(`${label("Feedback URI")}${feedbackURI}`);
    lines.push(`${label("Feedback Hash")}${feedbackHash}`);
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
      title: "Feedback submitted successfully",
      titleAlignment: "left",
    }),
  );
}

export const giveFeedbackCommand = new Command("give-feedback")
  .description("Submit feedback for a registered agent on the ReputationRegistry")
  .option("--agent-id <id>", "Agent ID (token ID) to give feedback for")
  .option("--value <value>", "Feedback value (signed integer)")
  .option("--value-decimals <decimals>", "Value decimals (0-18)")
  .option("--tag1 <tag>", "Primary tag (category)")
  .option("--tag2 <tag>", "Secondary tag (subcategory)")
  .option("--endpoint <endpoint>", "Endpoint related to the feedback")
  .option("--feedback-uri <uri>", "URI with additional feedback details")
  .option("--feedback-hash <hash>", "Bytes32 hash of feedback content");
addSharedOptions(giveFeedbackCommand).action(giveFeedback);
