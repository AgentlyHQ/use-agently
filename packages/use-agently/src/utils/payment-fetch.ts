import {
  type SelectPaymentRequirements,
  type PaymentRequirements,
  wrapFetchWithPayment,
  x402Client,
} from "@x402/fetch";
import type { Wallet } from "../wallets/wallet.js";

export type PaymentInfo = {
  amount: string;
  asset: string;
  network: string;
  payTo: string;
  resource: { url: string; description: string };
};

export type CreatePaymentFetchOptions = {
  onPayment?: (info: PaymentInfo) => void;
  paymentRequirementsSelector?: SelectPaymentRequirements;
};

export function createPaymentFetch(
  wallet: Wallet,
  { onPayment, paymentRequirementsSelector }: CreatePaymentFetchOptions = {},
) {
  const client = x402Client.fromConfig({
    schemes: wallet.getX402Schemes(),
    paymentRequirementsSelector,
  });

  if (onPayment) {
    client.onBeforePaymentCreation((ctx) => {
      const req: PaymentRequirements = ctx.selectedRequirements;
      onPayment({
        amount: req.amount,
        asset: req.asset,
        network: req.network,
        payTo: req.payTo,
        resource: { url: ctx.paymentRequired.resource.url, description: ctx.paymentRequired.resource.description },
      });
      return Promise.resolve();
    });
  }

  return wrapFetchWithPayment(fetch, client);
}
