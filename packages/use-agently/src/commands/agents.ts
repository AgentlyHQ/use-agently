import { Command } from "commander";

const AGENTS_URL = `https://use-agently.com/marketplace.json`;

interface AgentEntry {
  uri: string;
  name: string | null;
  description: string | null;
  protocols: string[];
}

interface AgentsResponse {
  agents: AgentEntry[];
}

export const agentsCommand = new Command("agents").description("List available agents on Agently").action(async () => {
  const response = await fetch(AGENTS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch agents: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  if (!data.agents || data.agents.length === 0) {
    console.log("No agents available.");
    return;
  }

  for (const agent of data.agents) {
    console.log(`${agent.name ?? agent.uri}`);
    if (agent.description) {
      console.log(`  ${agent.description}`);
    }
    if (agent.protocols.length > 0) {
      console.log(`  Protocols: ${agent.protocols.join(", ")}`);
    }
    console.log(`  ${agent.uri}`);
    console.log();
  }
});
