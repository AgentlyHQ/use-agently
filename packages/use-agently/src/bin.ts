#!/usr/bin/env node

import { cli } from "./cli";
import { checkAutoUpdate } from "./commands/update.js";
import { installTelemetry, flushTelemetry } from "./telemetry.js";

installTelemetry(cli);

await cli.parseAsync();
await Promise.all([checkAutoUpdate(), flushTelemetry()]);
