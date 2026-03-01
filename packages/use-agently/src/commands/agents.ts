import { Command } from "commander";
import { loadConfig } from "../config.js";
import { store } from "../output.js";

const AGENTS_URL = `https://use-agently.com/marketplace.json`;

export function printAgents(list: any[]) {
  if (list.length === 0) {
    console.log("No agents available.");
    return;
  }
  for (const agent of list) {
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
}

export const agentsCommand = new Command("agents").description("List available agents on Agently").action(async () => {
  const config = await loadConfig();

  const response = await fetch(AGENTS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch agents: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();
  const agents: any[] = data.agents ?? [];

  return store(agents, config?.output);
});
