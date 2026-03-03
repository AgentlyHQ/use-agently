#!/usr/bin/env node

import { cli } from "./cli";
import { checkAutoUpdate } from "./commands/update.js";
import { PaymentRequiredError } from "./client.js";

try {
  await cli.parseAsync();
} catch (err) {
  if (err instanceof PaymentRequiredError) {
    console.error(err.message);
    console.error("Tip: run the same command with --pay to approve the transaction.");
    process.exit(1);
  }
  throw err;
}

await checkAutoUpdate();
