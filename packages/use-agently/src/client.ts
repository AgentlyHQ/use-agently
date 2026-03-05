import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { wrapMCPClientWithPaymentFromConfig } from "@x402/mcp";
import { ClientFactory, JsonRpcTransportFactory, RestTransportFactory } from "@a2a-js/sdk/client";
import boxen from "boxen";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Wallet } from "./wallets/wallet.js";

export interface PaymentRequirementsInfo {
  amount: string;
  network: string;
  description: string;
  payTo: string;
  asset: string;
}

export class DryRunPaymentRequired extends Error {
  readonly requirements: PaymentRequirementsInfo[];
  constructor(requirements: PaymentRequirementsInfo[]) {
    const req = requirements[0];
    const amount = req ? formatPaymentAmount(req) : null;
    const payLine = amount
      ? `This request requires payment of ${amount}.\nRun the same command with --pay to authorize the transaction and proceed.`
      : `This request requires payment, but the amount could not be determined.\nInspect the endpoint manually before running with --pay.`;
    super(payLine);
    this.name = "DryRunPaymentRequired";
    this.requirements = requirements;
  }
}

function formatPaymentAmount(req: PaymentRequirementsInfo): string {
  try {
    const raw = BigInt(req.amount);
    const usd = Number(raw) / 1_000_000;
    const formatted = usd % 1 === 0 ? `$${usd}` : `$${usd.toFixed(6).replace(/\.?0+$/, "")}`;
    const network = req.network ? ` on ${req.network}` : "";
    return `${formatted} USDC${network}`;
  } catch {
    return `${req.amount} (raw units)`;
  }
}

export function createDryRunFetch(): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await fetch(input, init);
    if (response.status === 402) {
      let requirements: PaymentRequirementsInfo[] = [];
      const header = response.headers.get("PAYMENT-REQUIRED");
      if (header) {
        try {
          const decoded = JSON.parse(Buffer.from(header, "base64").toString("utf-8"));
          requirements = (decoded.accepts as PaymentRequirementsInfo[]) ?? [];
        } catch (e) {
          if (!(e instanceof SyntaxError)) throw e;
        }
      } else {
        // Attempt to parse x402v1 body format
        try {
          const body = await response.clone().json();
          if (body?.accepts) {
            requirements = body.accepts as PaymentRequirementsInfo[];
          }
        } catch (e) {
          if (!(e instanceof SyntaxError)) throw e;
        }
      }
      throw new DryRunPaymentRequired(requirements);
    }
    return response;
  };
}

export function createPaymentFetch(wallet: Wallet) {
  return wrapFetchWithPaymentFromConfig(fetch, {
    schemes: wallet.getX402Schemes(),
  });
}

/** Resolve the fetch implementation based on the --pay flag. */
export async function resolveFetch(pay?: boolean): Promise<typeof fetch> {
  if (pay) {
    const { getConfigOrThrow } = await import("./config.js");
    const { loadWallet } = await import("./wallets/wallet.js");
    const config = await getConfigOrThrow();
    const wallet = loadWallet(config.wallet);
    return createPaymentFetch(wallet) as typeof fetch;
  }
  return createDryRunFetch();
}

/** Display a DryRunPaymentRequired error in a boxed format and exit. */
export function handleDryRunError(err: DryRunPaymentRequired): never {
  console.error(
    boxen(err.message, {
      title: "Payment Required",
      titleAlignment: "center",
      borderColor: "yellow",
      padding: 1,
    }),
  );
  process.exit(1);
}

export function createMcpPaymentClient(mcpClient: Client, wallet: Wallet) {
  return wrapMCPClientWithPaymentFromConfig(mcpClient, {
    schemes: wallet.getX402Schemes(),
  });
}

export async function createA2AClient(agentUrl: string, fetchImpl: typeof fetch) {
  const factory = new ClientFactory({
    transports: [new JsonRpcTransportFactory({ fetchImpl }), new RestTransportFactory({ fetchImpl })],
  });
  return factory.createFromUrl(agentUrl);
}
