#!/usr/bin/env bun
import { runHermesImport } from './import-support.js';

runHermesImport(process.argv.slice(2)).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
