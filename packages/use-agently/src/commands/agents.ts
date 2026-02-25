import { Command } from "commander";

const STATIC_SESSION = "MHgzODNmYWYxOThjOTI0NjUwZWRiODQzYTRiYWU3NDJhOGZlZDU4YzBkMzE5YTg3YjE1MTA2NzI5OTE4MDI5MjBk";
const AGENTS_URL = `https://agently.to/sessions/${STATIC_SESSION}/agents`;

export const agentsCommand = new Command("agents").description("List available agents on Agently").action(async () => {
  const response = await fetch(AGENTS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch agents: ${response.status} ${response.statusText}`);
  }

  const agents = await response.json();

  if (!Array.isArray(agents) || agents.length === 0) {
    console.log("No agents available.");
    return;
  }

  for (const agent of agents) {
    console.log(`${agent.name ?? agent.id ?? "unknown"}`);
    if (agent.description) {
      console.log(`  ${agent.description}`);
    }
    if (agent.url) {
      console.log(`  ${agent.url}`);
    }
    console.log();
  }
});
