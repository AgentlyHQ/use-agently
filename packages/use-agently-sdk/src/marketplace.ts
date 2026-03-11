import { clientFetch } from "./client.js";

const MARKETPLACE_URL = "https://use-agently.com/marketplace.json";

export interface MarketplaceAgent {
  uri: string;
  name: string;
  description?: string;
  protocols: string[];
}

export class AgentNotFoundError extends Error {
  constructor(public readonly uri: string) {
    super(`No agent found for URI: ${uri}`);
    this.name = "AgentNotFoundError";
  }
}

export async function fetchAgents(fetchImpl: typeof fetch = clientFetch): Promise<MarketplaceAgent[]> {
  const response = await fetchImpl(MARKETPLACE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch agents: ${response.status} ${response.statusText}`);
  }
  const data: { agents?: MarketplaceAgent[] } = await response.json();
  return data.agents ?? [];
}

export async function searchAgents(
  options: { query?: string; protocols?: string[] },
  fetchImpl: typeof fetch = clientFetch,
): Promise<MarketplaceAgent[]> {
  let agents = await fetchAgents(fetchImpl);

  if (options.query) {
    const q = options.query.toLowerCase();
    agents = agents.filter(
      (a) =>
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.description && a.description.toLowerCase().includes(q)) ||
        (a.uri && a.uri.toLowerCase().includes(q)),
    );
  }

  if (options.protocols) {
    const protocols = options.protocols.map((p) => p.trim().toLowerCase());
    agents = agents.filter((a) => Array.isArray(a.protocols) && protocols.some((p) => a.protocols.includes(p)));
  }

  return agents;
}

export async function resolveErc8004Agent(
  uri: string,
  fetchImpl: typeof fetch = clientFetch,
): Promise<MarketplaceAgent> {
  const agents = await fetchAgents(fetchImpl);
  const agent = agents.find((a) => a.uri === uri);
  if (!agent) {
    throw new AgentNotFoundError(uri);
  }
  return agent;
}
