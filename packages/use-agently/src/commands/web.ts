import { Command } from "commander";
import { getConfigOrThrow } from "../config.js";
import { loadWallet } from "../wallets/wallet.js";
import { createPaymentFetch } from "../client.js";
import { output } from "../output.js";

interface WebOptions {
  header?: string[];
  data?: string;
}

async function executeWebRequest(url: string, method: string, options: WebOptions, command: Command): Promise<void> {
  const config = await getConfigOrThrow();
  const wallet = loadWallet(config.wallet);
  const paymentFetch = createPaymentFetch(wallet);

  const headers = new Headers(
    (options.header ?? []).flatMap((h) => {
      const idx = h.indexOf(":");
      return idx > -1 ? ([[h.slice(0, idx).trim(), h.slice(idx + 1).trim()]] as [[string, string]]) : [];
    }),
  );
  if (options.data && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const init: RequestInit = { method, headers };
  if (options.data !== undefined) {
    init.body = options.data;
  }

  const response = await (paymentFetch as typeof fetch)(url, init);
  const text = await response.text();

  if (!response.ok) {
    process.stderr.write(`Error: HTTP ${response.status} ${response.statusText}\n`);
    process.exit(1);
  }

  try {
    const json = JSON.parse(text);
    output(command, json);
  } catch {
    console.log(text);
  }
}

const webOptions = (cmd: Command) =>
  cmd
    .option(
      "-H, --header <header>",
      "HTTP header to include (can be repeated)",
      (v, prev: string[]) => [...prev, v],
      [],
    )
    .option("-d, --data <body>", "Request body");

export const webGetCommand = webOptions(
  new Command("web:get")
    .description("Make an HTTP GET request (x402 payments handled automatically)")
    .argument("<url>", "URL to request")
    .addHelpText("after", "\nExamples:\n  use-agently web:get https://example.com/api"),
).action(async (url: string, options: WebOptions, command: Command) => {
  await executeWebRequest(url, "GET", options, command);
});

export const webPutCommand = webOptions(
  new Command("web:put")
    .description("Make an HTTP PUT request (x402 payments handled automatically)")
    .argument("<url>", "URL to request")
    .addHelpText("after", '\nExamples:\n  use-agently web:put https://example.com/api -d \'{"key":"value"}\''),
).action(async (url: string, options: WebOptions, command: Command) => {
  await executeWebRequest(url, "PUT", options, command);
});

export const webDeleteCommand = webOptions(
  new Command("web:delete")
    .description("Make an HTTP DELETE request (x402 payments handled automatically)")
    .argument("<url>", "URL to request")
    .addHelpText("after", "\nExamples:\n  use-agently web:delete https://example.com/resource/123"),
).action(async (url: string, options: WebOptions, command: Command) => {
  await executeWebRequest(url, "DELETE", options, command);
});
