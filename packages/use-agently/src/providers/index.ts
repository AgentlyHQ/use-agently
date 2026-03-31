import type { Wallet } from "@use-agently/sdk";
import { defaultProvider } from "./default";
import { agentcashProvider } from "./agentcash";

export interface WalletProvider {
  type: string;
  name: string;
  detect(): Promise<{ installed: boolean; address?: string }>;
  loadWallet(): Promise<Wallet>;
}

export interface DetectedProvider {
  type: string;
  name: string;
  installed: boolean;
  address?: string;
  active: boolean;
}

const registry: WalletProvider[] = [defaultProvider, agentcashProvider];

export function getProvider(type: string): WalletProvider | undefined {
  return registry.find((p) => p.type === type);
}

export async function detectProviders(activeProvider?: string): Promise<DetectedProvider[]> {
  const results = await Promise.all(
    registry.map(async (provider) => {
      const { installed, address } = await provider.detect();
      return {
        type: provider.type,
        name: provider.name,
        installed,
        address,
        active: activeProvider === provider.type,
      };
    }),
  );
  return results;
}

export async function loadWalletFromProvider(type: string): Promise<Wallet> {
  const provider = getProvider(type);
  if (!provider) {
    const available = registry.map((p) => p.type).join(", ");
    throw new Error(`Unknown wallet provider "${type}". Available providers: ${available}`);
  }
  return provider.loadWallet();
}
