import { Command } from "commander";
import { getConfigOrThrow } from "../config.js";
import { output } from "../output.js";
import { loadWallet } from "../wallets/wallet.js";
import { createPaymentFetch } from "../client.js";

async function makeRequest(
  method: string,
  url: string,
  options: { data?: string; header?: string[] },
  command: Command,
) {
  const config = await getConfigOrThrow();
  const wallet = loadWallet(config.wallet);
  const paymentFetch = createPaymentFetch(wallet);

  const headers: Record<string, string> = {};
  for (const h of options.header ?? []) {
    const idx = h.indexOf(":");
    if (idx === -1) throw new Error(`Invalid header (expected "Name: Value"): ${h}`);
    headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
  }

  const fetchOptions: RequestInit = { method, headers };
  if (options.data !== undefined) {
    fetchOptions.body = options.data;
    if (!headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  const response = await paymentFetch(url, fetchOptions);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  let data: unknown;
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  output(command, data);
}

export const webCommand = new Command("web")
  .description("Make an HTTP GET request with x402 payment support")
  .argument("<url>", "URL to request")
  .option("-H, --header <header...>", "HTTP header (can be repeated), e.g. -H 'Authorization: Bearer token'")
  .action(async (url: string, options: { header?: string[] }, command: Command) => {
    await makeRequest("GET", url, options, command);
  });

export const webGetCommand = new Command("web:get")
  .description("Make an HTTP GET request with x402 payment support")
  .argument("<url>", "URL to request")
  .option("-H, --header <header...>", "HTTP header (can be repeated), e.g. -H 'Authorization: Bearer token'")
  .action(async (url: string, options: { header?: string[] }, command: Command) => {
    await makeRequest("GET", url, options, command);
  });

export const webPutCommand = new Command("web:put")
  .description("Make an HTTP PUT request with x402 payment support")
  .argument("<url>", "URL to request")
  .option("-d, --data <body>", "Request body (JSON string)")
  .option("-H, --header <header...>", "HTTP header (can be repeated), e.g. -H 'Content-Type: application/json'")
  .action(async (url: string, options: { data?: string; header?: string[] }, command: Command) => {
    await makeRequest("PUT", url, options, command);
  });

export const webDeleteCommand = new Command("web:delete")
  .description("Make an HTTP DELETE request with x402 payment support")
  .argument("<url>", "URL to request")
  .option("-H, --header <header...>", "HTTP header (can be repeated), e.g. -H 'Authorization: Bearer token'")
  .action(async (url: string, options: { header?: string[] }, command: Command) => {
    await makeRequest("DELETE", url, options, command);
  });
