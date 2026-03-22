import boxen from "boxen";
import { formatUnits } from "viem";
import {
  DryRunPaymentRequired as SdkDryRunPaymentRequired,
  createDryRunFetch as sdkCreateDryRunFetch,
  createPaymentFetch as sdkCreatePaymentFetch,
  getChainConfigByNetwork,
  type PaymentRequirementsInfo,
  type unstable_Client,
  loadWallet,
} from "@use-agently/sdk";
import { getConfigOrThrow, getMaxSpendPerCall } from "./config";
import pkg from "../package.json" with { type: "json" };
import { createClient } from "@use-agently/sdk/client";

const CLI_USER_AGENT = `use-agently:${pkg.version} (use-agently.com)`;

export const defaultClient = createClient({ userAgent: CLI_USER_AGENT });

/** CLI-specific fetch client with CLI user-agent. */
export const clientFetch: typeof fetch = defaultClient.fetch;

/** CLI-specific DryRunPaymentRequired with --pay hint in the message. */
export class DryRunPaymentRequired extends SdkDryRunPaymentRequired {
  constructor(requirements: PaymentRequirementsInfo[]) {
    super(requirements);
    const req = requirements[0];
    const amount = req ? formatUsdcAmount(req) : null;
    this.message = amount
      ? `This request requires payment of ${amount}.\nRun the same command with --pay to authorize the transaction and proceed.`
      : `This request requires payment, but the amount could not be determined.\nInspect the endpoint manually before running with --pay.`;
  }
}

/** CLI wrapper around SDK's createDryRunFetch that throws CLI-specific DryRunPaymentRequired. */
export function createDryRunFetch(): typeof fetch {
  const sdkFetch = sdkCreateDryRunFetch(clientFetch);
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

export function createPaymentFetch(wallet: ReturnType<typeof loadWallet>) {
  return sdkCreatePaymentFetch(wallet, clientFetch);
}

/** Error thrown when a payment amount exceeds the configured spend limit. */
export class SpendLimitExceeded extends Error {
  readonly requestedAmount: number;
  readonly maxSpendPerCall: number;

  constructor(requestedAmount: number, maxSpendPerCall: number) {
    super(
      `Payment of $${requestedAmount} USDC exceeds your spend limit of $${maxSpendPerCall} USDC per call.\n` +
        `Adjust the limit with: use-agently wallet spend set-max <value> (max $1).`,
    );
    this.name = "SpendLimitExceeded";
    this.requestedAmount = requestedAmount;
    this.maxSpendPerCall = maxSpendPerCall;
  }
}

/**
 * Wrap a base fetch to enforce a spend limit on 402 Payment Required responses.
 * This sits between the base fetch and the x402 payment wrapper: when the server
 * returns a 402, we inspect the amount BEFORE x402 signs any payment.
 */
export function createSpendLimitedFetch(baseFetch: typeof fetch, maxSpendPerCall: number): typeof fetch {
  // @ts-expect-error — Bun's typeof fetch includes preconnect namespace (oven-sh/bun#23741)
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await baseFetch(input, init);
    if (response.status === 402) {
      const header = response.headers.get("PAYMENT-REQUIRED");
      let requirements: PaymentRequirementsInfo[] = [];
      if (header) {
        try {
          const decoded = JSON.parse(Buffer.from(header, "base64").toString("utf-8"));
          requirements = (decoded.accepts as PaymentRequirementsInfo[]) ?? [];
        } catch {
          // Can't parse header — let x402 handle it
        }
      } else {
        try {
          const body = await response.clone().json();
          if (body?.accepts) {
            requirements = body.accepts as PaymentRequirementsInfo[];
          }
        } catch {
          // Can't parse body — let x402 handle it
        }
      }
      const req = requirements[0];
      if (req) {
        try {
          const { usdcDecimals } = getChainConfigByNetwork(req.network);
          const amountInDollars = Number(formatUnits(BigInt(req.amount), usdcDecimals));
          if (amountInDollars > maxSpendPerCall) {
            throw new SpendLimitExceeded(amountInDollars, maxSpendPerCall);
          }
        } catch (e) {
          if (e instanceof SpendLimitExceeded) throw e;
          // Can't determine amount — allow the payment to proceed
        }
      }
    }
    return response;
  };
}

/** Resolve the fetch implementation based on the --pay flag, with spend limit enforcement. */
export async function resolveFetch(pay?: boolean): Promise<typeof fetch> {
  if (pay) {
    const config = await getConfigOrThrow();
    const wallet = loadWallet(config.wallet);
    const maxSpend = getMaxSpendPerCall(config);
    const limitedFetch = createSpendLimitedFetch(clientFetch, maxSpend);
    return sdkCreatePaymentFetch(wallet, limitedFetch) as typeof fetch;
  }
  return createDryRunFetch();
}

/**
 * Resolve a spend-limited SDK client for use with A2A/MCP protocols.
 * The returned client's fetch includes the spend limit check so that
 * x402 payment wrapping inside the SDK will be blocked if the amount exceeds the limit.
 */
export function createSpendLimitedClient(maxSpendPerCall: number): unstable_Client {
  return {
    fetch: createSpendLimitedFetch(defaultClient.fetch, maxSpendPerCall),
  };
}

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

/** Display a DryRunPaymentRequired error and exit. Uses boxen when stderr is a TTY, plain text otherwise. */
export function handleDryRunError(err: SdkDryRunPaymentRequired): never {
  const cliErr = err instanceof DryRunPaymentRequired ? err : new DryRunPaymentRequired(err.requirements);
  if (process.stderr.isTTY) {
    console.error(
      boxen(cliErr.message, {
        title: "Payment Required",
        titleAlignment: "center",
        borderColor: "yellow",
        padding: 1,
      }),
    );
  } else {
    console.error(`Payment Required: ${cliErr.message}`);
  }
  process.exit(1);
}

/** Display a SpendLimitExceeded error and exit. */
export function handleSpendLimitError(err: SpendLimitExceeded): never {
  if (process.stderr.isTTY) {
    console.error(
      boxen(err.message, {
        title: "Spend Limit Exceeded",
        titleAlignment: "center",
        borderColor: "red",
        padding: 1,
      }),
    );
  } else {
    console.error(`Spend Limit Exceeded: ${err.message}`);
  }
  process.exit(1);
}
