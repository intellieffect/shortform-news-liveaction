import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { productionPreflight, productionSpecification } from "../scripts/lib/production/preflight.mjs";
import { readProductionProfile } from "../scripts/lib/production-profile.mjs";
import { editorialContract } from "../scripts/lib/editorial.mjs";

test("reports missing voice and sync assets early without creating receipts or files", () => {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "production-preflight-")));
  const production = join(repo, "news/test/02_production");
  const put = (name, body) => writeFileSync(join(production, name), typeof body === "string" ? body : JSON.stringify(body));
  try {
    mkdirSync(production, { recursive: true }); mkdirSync(join(repo, "config"));
    const profile = readProductionProfile(); profile.canvas.width = 1200;
    writeFileSync(join(repo, "config/production-profile.json"), JSON.stringify(profile));
    put("story.json", { mode: "editorial-concept" }); put("narration.txt", "실제 원고\n"); put("visual-system.json", { media: { assets: [] } });
    const before = readdirSync(production);
    const failed = productionPreflight("test", "narration", { repo });
    assert.equal(failed.ready, false);
    assert.ok(failed.errors.some(e => e.path.endsWith("voice.json")));
    assert.deepEqual(readdirSync(production), before);
    put("voice.json", { provider: "test", voice: "selected" });
    const ready = productionPreflight("test", "narration", { repo });
    assert.equal(ready.ready, true, JSON.stringify(ready.errors));
    assert.equal(readFileSync(join(production, "narration.txt"), "utf8"), "실제 원고\n");
    put("audio.json", { bgm: { file: "audio/missing.mp3" } });
    const sync = productionPreflight("test", "sync", { repo });
    assert.equal(sync.ready, false);
    assert.ok(sync.errors.some(e => e.path?.endsWith("missing.mp3")));
    assert.ok(sync.errors.some(e => e.path?.endsWith("assets.json")));
    const spec = productionSpecification("test", { repo });
    assert.equal(spec.profile.canvas.width, 1200);
    assert.deepEqual(spec.vocabulary, editorialContract());
    assert.equal(spec.timing, null);
    assert.throws(() => productionPreflight("test", "invalid", { repo }), /단계/);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});
