#!/usr/bin/env node

import { cli } from "./cli";
import { checkAutoUpdate } from "./commands/update.js";
import { installTelemetry, flushTelemetry } from "./telemetry.js";
import { handleCliError } from "./errors.js";

installTelemetry(cli);

function resolveOutputFormat(): "tui" | "json" {
  const opts = cli.optsWithGlobals?.();
  if (opts?.output === "tui" || opts?.output === "json") return opts.output;
  return process.stderr.isTTY ? "tui" : "json";
}

try {
  await cli.parseAsync();
  await Promise.all([checkAutoUpdate(), flushTelemetry()]);
} catch (err) {
  handleCliError(err, resolveOutputFormat());
}
