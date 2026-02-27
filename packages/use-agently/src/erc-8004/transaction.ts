import {
  createPublicClient,
  createWalletClient,
  http,
  type Account,
  type Chain,
  type Hex,
  type TransactionReceipt,
} from "viem";
import chalk from "chalk";

export function label(text: string): string {
  return chalk.dim(text.padEnd(14));
}

export function abiSignature(abi: readonly Record<string, unknown>[], functionName: string): string {
  const fn = abi.find((item) => item.type === "function" && item.name === functionName) as
    | { name: string; inputs: readonly { type: string }[] }
    | undefined;
  if (!fn) return functionName;
  return `${fn.name}(${fn.inputs.map((i) => i.type).join(",")})`;
}

export interface BroadcastParams {
  account: Account;
  chain: Chain;
  to: `0x${string}`;
  data: Hex;
  rpcUrl?: string;
}

export interface BroadcastResult {
  hash: `0x${string}`;
  receipt: TransactionReceipt;
  timestamp: bigint;
}

export async function broadcastAndConfirm(params: BroadcastParams): Promise<BroadcastResult> {
  const { account, chain, to, data, rpcUrl } = params;

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const hash = await walletClient.sendTransaction({ to, data });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });

  return { hash, receipt, timestamp: block.timestamp };
}
