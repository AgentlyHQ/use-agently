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
import { parseAgentId, parseFeedbackIndex, parseClientAddress, parseBytes32Hash } from "../../erc-8004/validate.js";
import {
  promptAgentId,
  promptFeedbackIndex,
  promptClientAddress,
  promptResponseUri,
  promptRegistryAddress,
} from "../../erc-8004/prompt.js";
import { label, abiSignature, broadcastAndConfirm } from "../../erc-8004/transaction.js";
import { addSharedOptions, type SharedOptions } from "./shared.js";

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

interface AppendResponseOptions extends SharedOptions {
  agentId?: string;
  clientAddress?: string;
  feedbackIndex?: string;
  responseUri?: string;
  responseHash?: string;
}

export async function appendResponse(options: AppendResponseOptions): Promise<void> {
  const chainId =
    options.chainId === undefined || Number.isNaN(options.chainId) ? await selectChain() : options.chainId;
  const chainConfig = resolveChainConfigById(chainId, options.rpcUrl);
  const chainName = Object.entries(CHAINS).find(([, c]) => c.chainId === chainId)?.[0] ?? `chain-${chainId}`;

  const agentIdParsed = parseAgentId(options.agentId ?? (await promptAgentId()));
  const clientAddressParsed = parseClientAddress(options.clientAddress ?? (await promptClientAddress()));
  const feedbackIndexParsed = parseFeedbackIndex(options.feedbackIndex ?? (await promptFeedbackIndex()));

  const responseUri = options.responseUri ?? (await promptResponseUri());
  if (responseUri.trim() === "") {
    throw new Error("Response URI must not be empty.");
  }
  const responseHashRaw = options.responseHash ?? ZERO_BYTES32;
  const responseHash =
    responseHashRaw !== ZERO_BYTES32 ? parseBytes32Hash(responseHashRaw, "response hash") : ZERO_BYTES32;

  const registryAddress =
    resolveRegistryAddress(chainId, options.registry, "reputation") ?? (await promptRegistryAddress());

  const data = encodeFunctionData({
    abi: ReputationRegistryAbi,
    functionName: "appendResponse",
    args: [agentIdParsed, clientAddressParsed, feedbackIndexParsed, responseUri, responseHash],
  });

  const printTxDetails = (header: string) => {
    console.log("");
    console.log(chalk.dim(header));
    console.log(`  ${label("To")}${registryAddress}`);
    console.log(`  ${label("Data")}${data.slice(0, 10)}${chalk.dim("\u2026" + (data.length - 2) / 2 + " bytes")}`);
    console.log(`  ${label("Chain")}${chainName}`);
    console.log(`  ${label("Function")}${abiSignature(ReputationRegistryAbi, "appendResponse")}`);
    console.log(`  ${label("Agent ID")}${agentIdParsed}`);
    console.log(`  ${label("Client")}${clientAddressParsed}`);
    console.log(`  ${label("Index")}${feedbackIndexParsed}`);
    if (responseUri) console.log(`  ${label("Response URI")}${responseUri}`);
    if (responseHash !== ZERO_BYTES32) console.log(`  ${label("Response Hash")}${responseHash}`);
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

  printAppendResponseResult(receipt, timestamp, chainConfig.chain, hash);
}

function printAppendResponseResult(
  receipt: { blockNumber: bigint; gasUsed: bigint; effectiveGasPrice: bigint; logs: Log[] },
  timestamp: bigint,
  chain: Chain,
  hash: `0x${string}`,
): void {
  const events = parseEventLogs({ abi: ReputationRegistryAbi, logs: receipt.logs });
  const responseAppended = events.find((e) => e.eventName === "ResponseAppended");

  const lines: string[] = [];

  if (responseAppended) {
    const { agentId, clientAddress, feedbackIndex, responder, responseURI, responseHash } = responseAppended.args as {
      agentId: bigint;
      clientAddress: `0x${string}`;
      feedbackIndex: bigint;
      responder: `0x${string}`;
      responseURI: string;
      responseHash: `0x${string}`;
    };
    lines.push(`${label("Agent ID")}${chalk.bold(agentId.toString())}`);
    lines.push(`${label("Client")}${clientAddress}`);
    lines.push(`${label("Index")}${feedbackIndex.toString()}`);
    lines.push(`${label("Responder")}${responder}`);
    lines.push(`${label("Response URI")}${responseURI}`);
    lines.push(`${label("Response Hash")}${responseHash}`);
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
      title: "Response appended successfully",
      titleAlignment: "left",
    }),
  );
}

export const appendResponseCommand = new Command("append-response")
  .description("Append a response to existing feedback on the ReputationRegistry")
  .option("--agent-id <id>", "Agent ID (token ID) of the feedback")
  .option("--client-address <address>", "Ethereum address of the feedback author")
  .option("--feedback-index <index>", "Feedback index to respond to")
  .option("--response-uri <uri>", "URI with response details")
  .option("--response-hash <hash>", "Bytes32 hash of response content");
addSharedOptions(appendResponseCommand).action(appendResponse);
