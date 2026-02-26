import { isAddress, defineChain, type Chain } from "viem";
import {
  abstract as abstractChain,
  arbitrum,
  avalanche,
  base,
  bsc,
  celo,
  gnosis,
  linea,
  mainnet,
  mantle,
  megaeth,
  monad,
  optimism,
  polygon,
  scroll,
  taiko,
  abstractTestnet,
  arbitrumSepolia,
  avalancheFuji,
  baseSepolia,
  bscTestnet,
  celoSepolia,
  lineaSepolia,
  mantleSepoliaTestnet,
  monadTestnet,
  optimismSepolia,
  polygonAmoy,
  scrollSepolia,
  sepolia,
  foundry,
} from "viem/chains";
import { CHAIN_ID, getIdentityRegistryAddress, getReputationRegistryAddress } from "@aixyz/erc-8004";
import { select, input } from "@inquirer/prompts";

export interface ChainConfig {
  chain: Chain;
  chainId: number;
}

// Viem chain objects keyed by chain ID
const VIEM_CHAIN_BY_ID: Record<number, Chain> = {
  [CHAIN_ID.ABSTRACT]: abstractChain,
  [CHAIN_ID.ARBITRUM]: arbitrum,
  [CHAIN_ID.AVALANCHE]: avalanche,
  [CHAIN_ID.BASE]: base,
  [CHAIN_ID.BSC]: bsc,
  [CHAIN_ID.CELO]: celo,
  [CHAIN_ID.GNOSIS]: gnosis,
  [CHAIN_ID.LINEA]: linea,
  [CHAIN_ID.MAINNET]: mainnet,
  [CHAIN_ID.MANTLE]: mantle,
  [CHAIN_ID.MEGAETH]: megaeth,
  [CHAIN_ID.MONAD]: monad,
  [CHAIN_ID.OPTIMISM]: optimism,
  [CHAIN_ID.POLYGON]: polygon,
  [CHAIN_ID.SCROLL]: scroll,
  [CHAIN_ID.TAIKO]: taiko,
  [CHAIN_ID.ABSTRACT_TESTNET]: abstractTestnet,
  [CHAIN_ID.ARBITRUM_SEPOLIA]: arbitrumSepolia,
  [CHAIN_ID.AVALANCHE_FUJI]: avalancheFuji,
  [CHAIN_ID.BASE_SEPOLIA]: baseSepolia,
  [CHAIN_ID.BSC_TESTNET]: bscTestnet,
  [CHAIN_ID.CELO_SEPOLIA]: celoSepolia,
  [CHAIN_ID.LINEA_SEPOLIA]: lineaSepolia,
  [CHAIN_ID.MANTLE_SEPOLIA]: mantleSepoliaTestnet,
  [CHAIN_ID.MONAD_TESTNET]: monadTestnet,
  [CHAIN_ID.OPTIMISM_SEPOLIA]: optimismSepolia,
  [CHAIN_ID.POLYGON_AMOY]: polygonAmoy,
  [CHAIN_ID.SCROLL_SEPOLIA]: scrollSepolia,
  [CHAIN_ID.SEPOLIA]: sepolia,
  [foundry.id]: foundry,
};

// Dynamic chain name → { chainId } mapping built from CHAIN_ID
// e.g. "BASE_SEPOLIA" → "base-sepolia"
function chainKeyToName(key: string): string {
  return key.toLowerCase().replace(/_/g, "-");
}

export const CHAINS: Record<string, { chainId: number }> = Object.fromEntries(
  Object.entries(CHAIN_ID).map(([key, id]) => [chainKeyToName(key), { chainId: id }]),
);
// Also include localhost (foundry) which isn't in CHAIN_ID
CHAINS["localhost"] = { chainId: foundry.id };

// Priority ordering for interactive chain selection
const CHAIN_SELECTION_ORDER: number[] = [
  // Popular mainnets
  CHAIN_ID.MAINNET,
  CHAIN_ID.BASE,
  CHAIN_ID.ARBITRUM,
  CHAIN_ID.OPTIMISM,
  CHAIN_ID.POLYGON,
  // Popular testnets
  CHAIN_ID.SEPOLIA,
  CHAIN_ID.BASE_SEPOLIA,
  CHAIN_ID.ARBITRUM_SEPOLIA,
  CHAIN_ID.OPTIMISM_SEPOLIA,
  // Remaining (sorted by chain ID for all others not in the priority list)
  ...(Object.values(CHAIN_ID) as number[])
    .filter(
      (id) =>
        !(
          [
            CHAIN_ID.MAINNET,
            CHAIN_ID.BASE,
            CHAIN_ID.ARBITRUM,
            CHAIN_ID.OPTIMISM,
            CHAIN_ID.POLYGON,
            CHAIN_ID.SEPOLIA,
            CHAIN_ID.BASE_SEPOLIA,
            CHAIN_ID.ARBITRUM_SEPOLIA,
            CHAIN_ID.OPTIMISM_SEPOLIA,
          ] as number[]
        ).includes(id),
    )
    .sort((a, b) => a - b),
  // Localhost last
  foundry.id,
];

export function resolveChainConfigById(chainId: number, rpcUrl?: string): ChainConfig {
  const chain = VIEM_CHAIN_BY_ID[chainId];
  if (chain) {
    return { chain, chainId };
  }
  // Unknown chain — requires --rpc-url for a BYO chain
  if (!rpcUrl) {
    throw new Error(`Unknown chain ID ${chainId}. Provide --rpc-url to use a custom chain.`);
  }
  return {
    chain: defineChain({
      id: chainId,
      name: `Chain ${chainId}`,
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } },
    }),
    chainId,
  };
}

export async function selectChain(): Promise<number> {
  const choices = CHAIN_SELECTION_ORDER.map((id) => {
    const name = Object.entries(CHAINS).find(([, c]) => c.chainId === id)?.[0] ?? `chain-${id}`;
    return { name: `${name} (${id})`, value: id };
  });
  choices.push({ name: "Other (enter chain ID)", value: -1 });

  const selected = await select({ message: "Select target chain:", choices });

  if (selected === -1) {
    const raw = await input({
      message: "Enter chain ID:",
      validate: (v) => (/^\d+$/.test(v.trim()) ? true : "Must be a numeric chain ID"),
    });
    return parseInt(raw.trim(), 10);
  }

  return selected;
}

export function resolveRegistryAddress(
  chainId: number,
  registry?: string,
  registryType: "identity" | "reputation" = "identity",
): `0x${string}` | null {
  if (registry) {
    if (!isAddress(registry)) {
      throw new Error(`Invalid registry address: ${registry}`);
    }
    return registry;
  }
  const getter = registryType === "reputation" ? getReputationRegistryAddress : getIdentityRegistryAddress;
  try {
    return getter(chainId) as `0x${string}`;
  } catch {
    // Unknown chain — no default registry
    return null;
  }
}

export function getExplorerUrl(chain: Chain, txHash: string): string | undefined {
  const explorer = chain.blockExplorers?.default;
  if (!explorer) return undefined;
  return `${explorer.url}/tx/${txHash}`;
}
