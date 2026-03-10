import type { Wallet } from "../wallets/wallet.js";

export const DryRunTransaction = { mode: "dry-run" } as const;
export type DryRunTransaction = typeof DryRunTransaction;

export function PayTransaction(wallet: Wallet) {
  return { mode: "pay", wallet } as const;
}
export type PayTransaction = ReturnType<typeof PayTransaction>;

export type TransactionMode = DryRunTransaction | PayTransaction;
