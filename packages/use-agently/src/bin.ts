#!/usr/bin/env node

import { cli } from "./cli";
import { checkAutoUpdate } from "./commands/update.js";
import { handleCliError } from "./errors.js";

try {
  await cli.parseAsync();
  await checkAutoUpdate();
} catch (err) {
  const output = cli.optsWithGlobals?.().output ?? (process.stdout.isTTY ? "tui" : "json");
  handleCliError(err, { output });
}
