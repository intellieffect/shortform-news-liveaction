#!/usr/bin/env node
import { resolve } from "node:path";
import { validateEditorialBundle } from "./lib/editorial.mjs";

const args = process.argv.slice(2), wantJson = args.includes("--json"), rootArg = args.find((arg) => !arg.startsWith("--"));
if (!rootArg) {
  console.error("usage: node scripts/check-editorial-plan.mjs <news/<id>|fixture-dir> [--json]");
  process.exit(2);
}
try {
  const result = validateEditorialBundle(resolve(rootArg));
  if (wantJson) console.log(JSON.stringify(result, null, 2));
  else {
    for (const row of result.errors) console.log(`ERROR [${row.code}] ${row.where}: ${row.message}`);
    for (const row of result.warnings) console.log(`warn  [${row.code}] ${row.where}: ${row.message}`);
    console.log(`editorial: ERROR ${result.errors.length} · warn ${result.warnings.length} · concept ${result.timeline.concepts.length} · event ${result.timeline.events.length}`);
  }
  process.exit(result.errors.length ? 1 : 0);
} catch (error) {
  console.error(`ERROR [editorial-load] ${error.message}`);
  process.exit(2);
}
