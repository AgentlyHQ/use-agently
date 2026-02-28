import { openai } from "@ai-sdk/openai";
import { stepCountIs, ToolLoopAgent } from "ai";
import type { Accepts } from "aixyz/accepts";
import echo from "./tools/echo";

export const accepts: Accepts = { scheme: "free" };

export default new ToolLoopAgent({
  model: openai("gpt-4o-mini"),
  instructions: "You are a helpful local test agent. Use the echo tool to respond to user messages.",
  tools: { echo },
  stopWhen: stepCountIs(5), // keep test responses concise; increase if multi-step tools are added
});
