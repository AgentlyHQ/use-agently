import { tool } from "ai";
import { z } from "zod";

export default tool({
  description: "Echoes back the provided message.",
  inputSchema: z.object({
    message: z.string().describe("The message to echo back"),
  }),
  execute: async ({ message }) => {
    return { echo: message };
  },
});
