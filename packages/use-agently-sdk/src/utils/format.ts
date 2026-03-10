import { formatUnits } from "viem";

export interface PaymentRequirementsInfo {
  amount: string;
  network: string;
  description: string;
  payTo: string;
  asset: string;
}

/** Format a payment amount for display. Assumes 6 decimals (USDC). */
export function formatUsdcAmount(req: PaymentRequirementsInfo): string {
  try {
    const raw = formatUnits(BigInt(req.amount), 6);
    const formatted = raw.includes(".") ? raw.replace(/\.?0+$/, "") : raw;
    const network = req.network ? ` on ${req.network}` : "";
    return `$${formatted} USDC${network}`;
  } catch {
    return `${req.amount} (raw units)`;
  }
}
