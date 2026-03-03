import type { AixyzConfig } from "aixyz/config";

// Anvil default account 0 — pre-funded with test ETH on local chain
const ANVIL_ACCOUNT_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

const config: AixyzConfig = {
  name: "localhost-x402",
  description: "Local x402 payment testing agent for use-agently CLI integration tests.",
  version: "0.0.0",
  url: process.env.PORT ? `http://localhost:${process.env.PORT}/` : undefined,
  x402: {
    payTo: process.env.X402_PAY_TO ?? ANVIL_ACCOUNT_0,
    // Use Base Sepolia network — USDC address is known and the ExactEvmScheme server
    // can parse "$0.01" without a custom money parser.
    network: "eip155:84532",
  },
  skills: [
    {
      id: "paid-echo",
      name: "Paid Echo",
      description: "Echoes back your message (requires payment).",
      tags: ["test", "echo", "paid"],
      examples: ["Echo back: hello world"],
    },
  ],
};

export default config;
