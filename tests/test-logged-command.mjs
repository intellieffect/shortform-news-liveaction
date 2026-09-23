import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runLoggedCommand } from "../scripts/lib/logged-command.mjs";

test("records stdout/stderr with bounded progress and propagates failure", async () => {
  const dir = mkdtempSync(join(tmpdir(), "logged-command-"));
  try {
    const progress = [];
    const logPath = join(dir, "success.log");
    const result = await runLoggedCommand(process.execPath, ["-e", "console.log('out');console.error('err')"], { logPath, onProgress: p => progress.push(p) });
    assert.equal(result.code, 0);
    assert.match(readFileSync(logPath, "utf8"), /out\nerr/);
    assert.deepEqual(progress.map(p => p.state), ["started", "succeeded"]);
    await assert.rejects(runLoggedCommand(process.execPath, ["-e", "process.exit(7)"], { logPath: join(dir, "failure.log") }), /exited 7/);
    await assert.rejects(runLoggedCommand("/nonexistent-shortform-command", [], { logPath: join(dir, "spawn.log") }), /ENOENT/);
    await assert.rejects(runLoggedCommand(process.execPath, [], { logPath }), /EEXIST/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("a deadline kills the child and its descendant instead of orphaning them", async () => {
  const dir = mkdtempSync(join(tmpdir(), "logged-timeout-"));
  try {
    const logPath = join(dir, "timeout.log");
    const program = "const {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'inherit'});console.log(c.pid);setInterval(()=>{},1000);";
    const progress = [];
    await assert.rejects(runLoggedCommand(process.execPath, ["-e", program], { logPath, timeoutMs: 500, heartbeatMs: 50, onProgress: p => progress.push(p) }), /exceeded/);
    assert.ok(progress.some(p => p.state === "running"));
    assert.equal(progress.at(-1).state, "failed");
    const childPid = progress[0].pid;
    assert.throws(() => process.kill(childPid, 0), /ESRCH/);
    const descendantPid = Number(readFileSync(logPath, "utf8").trim());
    assert.ok(descendantPid > 0);
    // macOS reaps descendants asynchronously; wait for exit, never leave a task alive.
    for (let i = 0; i < 100; i++) {
      try { process.kill(descendantPid, 0); }
      catch (e) { if (e.code === "ESRCH") return; throw e; }
      await new Promise(r => setTimeout(r, 20));
    }
    assert.fail("descendant survived the command deadline");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});


test("a TERM-resistant descendant with closed pipes cannot outlive the deadline", async () => {
  const dir = mkdtempSync(join(tmpdir(), "logged-resistant-"));
  let pid;
  try {
    const logPath = join(dir, "timeout.log");
    const program = "const {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e',\"process.on('SIGTERM',()=>{});process.send('ready');setInterval(()=>{},1000)\"],{stdio:['ignore','ignore','ignore','ipc']});c.once('message',()=>{console.log(c.pid);c.disconnect()});setInterval(()=>{},1000)";
    await assert.rejects(runLoggedCommand(process.execPath, ["-e", program], { logPath, timeoutMs: 1500 }), /exceeded/);
    pid = Number(readFileSync(logPath, "utf8").trim());
    assert.ok(pid > 0);
    for (let i = 0; i < 100; i++) {
      try { process.kill(pid, 0); }
      catch (error) { if (error.code === "ESRCH") return; throw error; }
      await new Promise(r => setTimeout(r, 20));
    }
    assert.fail("TERM-resistant descendant survived");
  } finally {
    if (pid) { try { process.kill(pid, "SIGKILL"); } catch {} }
    rmSync(dir, { recursive: true, force: true });
  }
});
