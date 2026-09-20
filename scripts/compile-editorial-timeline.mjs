#!/usr/bin/env node
import { resolve } from "node:path";
import { validateEditorialBundle } from "./lib/editorial.mjs";

const rootArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (!rootArg) {
  console.error("usage: node scripts/compile-editorial-timeline.mjs <news/<id>|fixture-dir>");
  process.exit(2);
}
try {
  const result = validateEditorialBundle(resolve(rootArg), { write: true });
  for (const row of result.errors) console.error(`ERROR [${row.code}] ${row.where}: ${row.message}`);
  if (result.errors.length) process.exit(1);
  console.log(`timeline.json 생성 · concept ${result.timeline.concepts.length} · event ${result.timeline.events.length} · warn ${result.warnings.length}`);
} catch (error) {
  console.error(`ERROR [editorial-load] ${error.message}`);
  process.exit(2);
}
