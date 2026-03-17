#!/usr/bin/env node

import { cli } from "./cli";
import { checkAutoUpdate } from "./commands/update.js";
import { installTelemetry, flushTelemetry } from "./telemetry.js";
import { handleCliError } from "./errors.js";

installTelemetry(cli);

try {
  await cli.parseAsync();
  await Promise.all([checkAutoUpdate(), flushTelemetry()]);
} catch (err) {
  const format = (cli.optsWithGlobals?.().output ?? (process.stderr.isTTY ? "tui" : "json")) as "tui" | "json";
  handleCliError(err, format);
}
