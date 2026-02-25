import { Command } from "commander";
import { randomUUID } from "node:crypto";
import { getConfigOrThrow } from "../config.js";
import { loadWallet } from "../wallets/wallet.js";
import { createPaymentFetch, createA2AClient } from "../client.js";

export const a2aCommand = new Command("a2a")
  .description("Send a message to an agent via A2A protocol")
  .argument("<agent>", "Agent URL")
  .requiredOption("-m, --message <text>", "Message to send")
  .action(async (agentUrl: string, options: { message: string }) => {
    const config = await getConfigOrThrow();
    const wallet = loadWallet(config.wallet);
    const paymentFetch = createPaymentFetch(wallet);
    const client = await createA2AClient(agentUrl, paymentFetch as typeof fetch);

    const result = await client.sendMessage({
      message: {
        kind: "message",
        messageId: randomUUID(),
        role: "user",
        parts: [{ kind: "text", text: options.message }],
      },
    });

    if ("parts" in result) {
      for (const part of result.parts) {
        if (part.kind === "text") {
          console.log(part.text);
        }
      }
    } else if ("status" in result) {
      console.log(`Task ${result.id}: ${result.status.state}`);
      if (result.status.message) {
        for (const part of result.status.message.parts) {
          if (part.kind === "text") {
            console.log(part.text);
          }
        }
      }
    }
  });
