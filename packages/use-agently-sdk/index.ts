// Config
export { WalletConfigSchema, ConfigSchema, type WalletConfig, type Config } from "./config.js";

// Wallets
export { type Wallet, loadWallet } from "./wallets/wallet.js";
export {
  type EvmPrivateKeyConfig,
  EvmPrivateKeyWallet,
  generateEvmPrivateKeyConfig,
} from "./wallets/evm-private-key.js";

// Utils
export { type ChainConfig, getChainConfig, getChainConfigByNetwork } from "./utils/chain.js";

// Client
export {
  type PaymentRequirementsInfo,
  USER_AGENT,
  createClientFetch,
  clientFetch,
  DryRunPaymentRequired,
  createDryRunFetch,
  createPaymentFetch,
  resolveFetchForTransaction,
  createMcpPaymentClient,
  createA2AClient,
} from "./client.js";

// Marketplace
export {
  type MarketplaceAgent,
  AgentNotFoundError,
  fetchAgents,
  searchAgents,
  resolveErc8004Agent,
} from "./marketplace.js";

// Transaction
export { type TransactionMode, DryRunTransaction, PayTransaction } from "./utils/transaction.js";

// A2A helpers
export {
  type A2AMessageOptions,
  type A2AMessageResult,
  extractAgentText,
  extractStreamEventText,
  sendA2AMessage,
  sendA2AMessageStream,
  getA2ACard,
} from "./a2a.js";

// MCP helpers
export { type McpCallOptions, resolveMcpUrl, listMcpTools, callMcpTool } from "./mcp.js";

// Balance
export { type BalanceResult, getBalance } from "./balance.js";
