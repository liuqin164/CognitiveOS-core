#!/usr/bin/env bun
import { runOpenClawImport } from './import-support.js';

runOpenClawImport(process.argv.slice(2)).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
