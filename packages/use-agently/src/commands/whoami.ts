import { Command } from "commander";
import { getConfigOrThrow } from "../config.js";
import { loadWallet } from "../wallets/wallet.js";

export const whoamiCommand = new Command("whoami").description("Show current wallet info").action(async () => {
  const config = await getConfigOrThrow();
  const wallet = loadWallet(config.wallet);

  console.log(`Type:    ${wallet.type}`);
  console.log(`Address: ${wallet.address}`);
});
