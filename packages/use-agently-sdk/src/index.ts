// Config
export {
  type ConfigScope,
  WalletConfigSchema,
  ConfigSchema,
  type WalletConfig,
  type Config,
  loadConfig,
  saveConfig,
  backupConfig,
  getConfigOrThrow,
} from "./config.js";

// Wallets
export { type Wallet, loadWallet } from "./wallets/wallet.js";
export {
  type EvmPrivateKeyConfig,
  EvmPrivateKeyWallet,
  generateEvmPrivateKeyConfig,
} from "./wallets/evm-private-key.js";

// Utils
export { type PaymentRequirementsInfo, formatUsdcAmount } from "./utils/format.js";

// Client
export {
  USER_AGENT,
  clientFetch,
  DryRunPaymentRequired,
  createDryRunFetch,
  createPaymentFetch,
  createMcpPaymentClient,
  createA2AClient,
} from "./client.js";

// Marketplace
export { fetchAgents, searchAgents, resolveErc8004Agent } from "./marketplace.js";

// A2A helpers
export { resolveAgentUrl, extractAgentText, extractStreamEventText } from "./a2a.js";

// MCP helpers
export { resolveMcpUrl, createMcpClient } from "./mcp.js";
