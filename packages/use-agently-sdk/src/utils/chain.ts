import type { Chain } from "viem";
import { base } from "viem/chains";

export interface ChainConfig {
  chainId: number;
  chain: Chain;
  usdc: `0x${string}`;
  usdcDecimals: number;
}

const chains: Record<string, ChainConfig> = {
  base: {
    chainId: base.id, // 8453
    chain: base,
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    usdcDecimals: 6,
  },
};

export function getChainConfig(name: string = "base"): ChainConfig {
  const config = chains[name];
  if (!config) {
    throw new Error(`Unsupported chain: "${name}". Supported chains: ${Object.keys(chains).join(", ")}`);
  }
  return config;
}
