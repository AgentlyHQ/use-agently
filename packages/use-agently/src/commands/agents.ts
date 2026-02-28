/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call */
import { Command } from "commander";
import { loadConfig } from "../config.js";

const DEFAULT_BASE_URL = `https://use-agently.com`;

export const agentsCommand = new Command("agents").description("List available agents on Agently").action(async () => {
  const config = await loadConfig();
  const baseUrl = config?.baseUrl ?? DEFAULT_BASE_URL;
  const agentsUrl = `${baseUrl}/marketplace.json`;

  const response = await fetch(agentsUrl);
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
