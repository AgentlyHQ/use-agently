#!/usr/bin/env node

import { cli } from "./cli";
import { checkAutoUpdate } from "./commands/update.js";
import { handleCliError, resolveOutputFormat } from "./errors.js";

try {
  await cli.parseAsync();
  await checkAutoUpdate();
} catch (err) {
  const output = resolveOutputFormat(cli.optsWithGlobals().output);
  handleCliError(err, { output });
}
