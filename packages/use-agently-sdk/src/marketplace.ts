import { clientFetch } from "./client.js";

const MARKETPLACE_URL = "https://use-agently.com/marketplace.json";

export async function fetchAgents(fetchImpl: typeof fetch = clientFetch): Promise<any[]> {
  const response = await fetchImpl(MARKETPLACE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch agents: ${response.status} ${response.statusText}`);
  }
  const data: any = await response.json();
  return data.agents ?? [];
}

export async function searchAgents(
  options: { query?: string; protocols?: string[] },
  fetchImpl: typeof fetch = clientFetch,
): Promise<any[]> {
  let agents = await fetchAgents(fetchImpl);

  if (options.query) {
    const q = options.query.toLowerCase();
    agents = agents.filter(
      (a: any) =>
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.description && a.description.toLowerCase().includes(q)) ||
        (a.uri && a.uri.toLowerCase().includes(q)),
    );
  }

  if (options.protocols) {
    const protocols = options.protocols.map((p) => p.trim().toLowerCase());
    agents = agents.filter((a: any) => Array.isArray(a.protocols) && protocols.some((p) => a.protocols.includes(p)));
  }

  return agents;
}

export async function resolveErc8004Agent(uri: string, fetchImpl: typeof fetch = clientFetch): Promise<any> {
  const agents = await fetchAgents(fetchImpl);
  const agent = agents.find((a: any) => a.uri === uri);
  if (!agent) {
    throw new Error(`No agent found for URI: ${uri}\nUse fetchAgents() to list available agent URIs.`);
  }
  return agent;
}
