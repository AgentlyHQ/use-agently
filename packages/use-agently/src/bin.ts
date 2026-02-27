#!/usr/bin/env node

import { cli } from "./cli";

cli.parseAsync().catch((error: unknown) => {
  if (error instanceof Error && error.name === "ExitPromptError") {
    process.exit(0);
  }
  throw error;
});
