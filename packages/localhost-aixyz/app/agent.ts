import { openai } from "@ai-sdk/openai";
import { stepCountIs, ToolLoopAgent } from "ai";
import type { Accepts } from "aixyz/accepts";

export const accepts: Accepts = { scheme: "free" };

export default new ToolLoopAgent({
  model: openai("gpt-4o-mini"),
  instructions: "Echo back exactly what the user says.",
  stopWhen: stepCountIs(1),
});
