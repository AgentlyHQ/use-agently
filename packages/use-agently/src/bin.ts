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
  } catch (err) {
    console.warn("Falling back to TUI output after failing to resolve --output option.", err);
    return "tui";
  }
}

try {
  await cli.parseAsync();
  await Promise.all([checkAutoUpdate(), flushTelemetry()]);
} catch (err) {
  handleCliError(err, resolveOutputFormat());
}
