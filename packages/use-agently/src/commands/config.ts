import { Command } from "commander";
import { loadConfig, saveConfig, type ConfigScope } from "../config.js";

export const configCommand = new Command("config").description("Get or set configuration values").addCommand(
  new Command("base-url")
    .description("Get or set the base URL for the Agently platform")
    .argument("[url]", "Base URL to set (e.g. http://localhost:3000)")
    .option("--local", "Use project-scoped config (.use-agently/config.json)")
    .action(async (url: string | undefined, options: { local?: boolean }) => {
      const scope: ConfigScope = options.local ? "local" : "global";
      const config = await loadConfig(scope);

      if (url === undefined) {
        // Get current value
        const current = config?.baseUrl;
        if (current) {
          console.log(current);
        } else {
          console.log("(not set — using default: https://use-agently.com)");
        }
      } else {
        // Set new value
        await saveConfig({ ...config, baseUrl: url }, scope);
        console.log(`Base URL set to: ${url}`);
      }
    }),
);
