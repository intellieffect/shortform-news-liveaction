import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";

// A CLI timeout must stop this command's process group, not merely detach it.
// Full output stays on disk; callers receive small progress messages separately.
export const runLoggedCommand = (command, args, {
  cwd, logPath, timeoutMs = 15 * 60_000, heartbeatMs = 15_000,
  onProgress = () => {},
} = {}) => {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new Error("timeoutMs must be a positive integer");
  if (!Number.isInteger(heartbeatMs) || heartbeatMs <= 0) throw new Error("heartbeatMs must be a positive integer");
  mkdirSync(dirname(logPath), { recursive: true });
  return new Promise((resolve, reject) => {
    const log = createWriteStream(logPath, { flags: "wx" });
    let child, deadline, heartbeat, forceKill, failure, finished = false;
    const started = Date.now();
    let bytes = 0, lastOutput = started;
    const emit = (state) => onProgress({ state, pid: child?.pid ?? null, elapsed_ms: Date.now() - started, quiet_ms: Date.now() - lastOutput, bytes, log: logPath });
    const kill = (signal) => {
      if (!child?.pid) return;
      try { process.kill(process.platform === "win32" ? child.pid : -child.pid, signal); }
      catch (error) { if (error.code !== "ESRCH") failure ??= error; }
    };
    const stop = (reason) => {
      failure ??= new Error(reason);
      kill("SIGTERM");
      forceKill ??= setTimeout(() => kill("SIGKILL"), 1_000);
    };
    const interrupted = () => stop("Command interrupted; stopped its process group");
    const cleanup = () => {
      clearTimeout(deadline); clearInterval(heartbeat); clearTimeout(forceKill);
      process.removeListener("SIGINT", interrupted);
      process.removeListener("SIGTERM", interrupted);
    };
    const finish = (code, signal) => {
      if (finished) return;
      finished = true;
      // Descendants may close inherited pipes or ignore TERM. Do not cancel the
      // escalation just because their parent exited first.
      if (forceKill) kill("SIGKILL");
      cleanup();
      if (code !== 0 && !failure) failure = new Error(`Command exited ${code ?? signal}; log: ${logPath}`);
      const settle = () => {
        emit(failure ? "failed" : "succeeded");
        if (failure) reject(failure);
        else resolve({ code, pid: child?.pid, elapsed_ms: Date.now() - started, log: logPath });
      };
      if (log.destroyed) settle();
      else log.end(settle);
    };
    log.on("error", (error) => {
      failure ??= error;
      if (child) stop(error.message);
      else { finished = true; cleanup(); reject(error); }
    });
    log.once("open", () => {
      if (finished) return;
      child = spawn(command, args, { cwd, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] });
      const record = (chunk) => { bytes += chunk.length; lastOutput = Date.now(); log.write(chunk); };
      child.stdout.on("data", record); child.stderr.on("data", record);
      child.on("error", (error) => { failure ??= error; });
      child.on("close", finish);
      process.once("SIGINT", interrupted); process.once("SIGTERM", interrupted);
      deadline = setTimeout(() => stop(`Command exceeded ${timeoutMs}ms; stopped its process group; log: ${logPath}`), timeoutMs);
      heartbeat = setInterval(() => emit("running"), heartbeatMs);
      child.once("spawn", () => emit("started"));
    });
  });
};
