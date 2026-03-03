#!/usr/bin/env node

import { cli } from "./cli";
import { checkAutoUpdate } from "./commands/update.js";

await cli.parseAsync();
await checkAutoUpdate();
