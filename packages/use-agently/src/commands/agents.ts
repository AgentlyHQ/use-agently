/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */
import { Command } from "commander";

const DEFAULT_BASE_URL = `https://use-agently.com`;

export const agentsCommand = new Command("agents")
  .description("List available agents on Agently")
  .option("--base-url <url>", "Base URL for the Agently API", DEFAULT_BASE_URL)
  .action(async (options: { baseUrl: string }) => {
    const response = await fetch(`${options.baseUrl}/marketplace.json`);
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
