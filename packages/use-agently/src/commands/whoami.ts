import { Command } from "commander";
import { getConfigOrThrow } from "../config.js";
import { loadWallet } from "../wallets/wallet.js";
import { store } from "../output.js";

export function printWhoami(d: { type: string; address: string }) {
  console.log(`Type:    ${d.type}`);
  console.log(`Address: ${d.address}`);
}

export const whoamiCommand = new Command("whoami").description("Show current wallet info").action(async () => {
  const config = await getConfigOrThrow();
  const wallet = loadWallet(config.wallet);
  return store({ type: wallet.type, address: wallet.address }, config.output);
});
