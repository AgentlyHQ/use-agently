#!/usr/bin/env node

import { cli } from "./cli";
import { checkAutoUpdate } from "./commands/update.js";
import { installTelemetry, flushTelemetry } from "./telemetry.js";
import { handleCliError } from "./errors.js";
import { getOutputFormat } from "./output.js";

installTelemetry(cli);

function resolveOutputFormat(): "tui" | "json" {
  try {
    return getOutputFormat(cli);
  } catch {
    // If option parsing fails, still show the underlying CLI error without double-logging here.
    return "tui";
  }
}

try {
  await cli.parseAsync();
  await Promise.all([checkAutoUpdate(), flushTelemetry()]);
} catch (err) {
  handleCliError(err, resolveOutputFormat());
}
