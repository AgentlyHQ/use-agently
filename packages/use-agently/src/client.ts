import boxen from "boxen";
import { formatUnits } from "viem";
import {
  DryRunPaymentRequired as SdkDryRunPaymentRequired,
  createDryRunFetch as sdkCreateDryRunFetch,
  createPaymentFetch,
  getChainConfigByNetwork,
} from "@use-agently/sdk";
import type { PaymentRequirementsInfo } from "@use-agently/sdk";
import { loadWallet } from "@use-agently/sdk";
import { getConfigOrThrow } from "./config.js";

// Re-export SDK items used by CLI commands
export {
  clientFetch,
  createPaymentFetch,
  createA2AClient,
  createMcpPaymentClient,
  type PaymentRequirementsInfo,
} from "@use-agently/sdk";

function formatUsdcAmount(req: PaymentRequirementsInfo): string {
  try {
    const { usdcDecimals } = getChainConfigByNetwork(req.network);
    const raw = formatUnits(BigInt(req.amount), usdcDecimals);
    const formatted = raw.includes(".") ? raw.replace(/\.?0+$/, "") : raw;
    const network = req.network ? ` on ${req.network}` : "";
    return `$${formatted} USDC${network}`;
  } catch {
    return `${req.amount} (raw units)`;
  }
}

/** CLI-specific DryRunPaymentRequired with --pay hint in the message. */
export class DryRunPaymentRequired extends SdkDryRunPaymentRequired {
  constructor(requirements: PaymentRequirementsInfo[]) {
    super(requirements);
    // Override message with CLI-friendly text
    const req = requirements[0];
    const amount = req ? formatUsdcAmount(req) : null;
    this.message = amount
      ? `This request requires payment of ${amount}.\nRun the same command with --pay to authorize the transaction and proceed.`
      : `This request requires payment, but the amount could not be determined.\nInspect the endpoint manually before running with --pay.`;
  }
}

/** CLI wrapper around SDK's createDryRunFetch that throws CLI-specific DryRunPaymentRequired. */
export function createDryRunFetch(): typeof fetch {
  const sdkFetch = sdkCreateDryRunFetch();
  // @ts-expect-error — Bun's typeof fetch includes preconnect namespace (oven-sh/bun#23741)
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      return await sdkFetch(input, init);
    } catch (err) {
      if (err instanceof SdkDryRunPaymentRequired) {
        throw new DryRunPaymentRequired(err.requirements);
      }
      throw err;
    }
  };
}

/** Resolve the fetch implementation based on the --pay flag. */
export async function resolveFetch(pay?: boolean): Promise<typeof fetch> {
  if (pay) {
    const config = await getConfigOrThrow();
    const wallet = loadWallet(config.wallet);
    return createPaymentFetch(wallet) as typeof fetch;
  }
  return createDryRunFetch();
}

/** Display a DryRunPaymentRequired error in a boxed format and exit. */
export function handleDryRunError(err: SdkDryRunPaymentRequired): never {
  const req = err.requirements[0];
  const amount = req ? formatUsdcAmount(req) : null;
  const message = amount
    ? `This request requires payment of ${amount}.\nRun the same command with --pay to authorize the transaction and proceed.`
    : `This request requires payment, but the amount could not be determined.\nInspect the endpoint manually before running with --pay.`;
  console.error(
    boxen(message, {
      title: "Payment Required",
      titleAlignment: "center",
      borderColor: "yellow",
      padding: 1,
    }),
  );
  process.exit(1);
}
