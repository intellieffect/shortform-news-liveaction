import { createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { workspace } from "./contracts.mjs";
import { beginProductionAction, failProductionAction, finishProductionAction, productionStatus } from "./state.mjs";

export const runProductionAction = async (id, action, { output, frame = 30 } = {}) => {
  const w = workspace(id);
  const status = productionStatus(id);
  if (["timeline", "sync"].includes(action) && status.actions[action].status === "current") {
    return { action, cached: true, receipt_id: status.actions[action].receipt_id };
  }
  if (!Number.isInteger(frame) || frame < 0) throw new Error("frame은 0 이상의 정수여야 한다");
  let args, outputs;
  if (action === "timeline") args = ["scripts/compile-editorial-timeline.mjs", w.rel(w.root)];
  else if (action === "sync") args = ["scripts/sync-pilot.mjs", w.rel(w.root)];
  else if (action === "proof" || action === "render") {
    const file = output ?? "out/pilots/" + id + "/qa/production-" + randomUUID() + (action === "proof" ? ".png" : ".mp4");
    args = ["scripts/pilot-run.mjs", action === "proof" ? "still" : "render", id, file, ...(action === "proof" ? ["--frame=" + frame] : [])];
    outputs = [file];
  } else throw new Error("직접 실행은 timeline/sync/proof/render만 지원한다. 외부 음성·검수 도구는 begin/finish로 연결한다");

  const attempt = beginProductionAction(id, action, { outputs, command: { executable: "node", args } });
  const logPath = w.path(attempt.log);
  mkdirSync(dirname(logPath), { recursive: true });
  const log = createWriteStream(logPath, { flags: "wx" });
  try {
    const exitCode = await new Promise((resolve, reject) => {
      log.on("error", reject);
      const child = spawn(process.execPath, args, { cwd: w.repo, stdio: ["ignore", "pipe", "pipe"] });
      child.stdout.pipe(log, { end: false });
      child.stderr.pipe(log, { end: false });
      child.on("error", reject);
      child.on("close", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
    });
    await new Promise((resolve) => log.end(resolve));
    if (exitCode !== 0) throw new Error("명령 종료 " + exitCode + "; 로그: " + attempt.log);
    return { action, cached: false, log: attempt.log, receipt: finishProductionAction(id, attempt.id) };
  } catch (error) {
    log.end();
    failProductionAction(id, attempt.id, error.message);
    throw error;
  }
};
