import { randomUUID } from "node:crypto";
import { runLoggedCommand } from "../logged-command.mjs";
import { workspace } from "./contracts.mjs";
import { beginProductionAction, failProductionAction, finishProductionAction, productionStatus } from "./state.mjs";

export const runProductionAction = async (id, action, { output, frame = 30, timeoutMs = 15 * 60_000 } = {}) => {
  const w = workspace(id);
  const status = productionStatus(id);
  if (["timeline", "sync"].includes(action) && status.actions[action].status === "current") {
    return { action, cached: true, receipt_id: status.actions[action].receipt_id };
  }
  if (!Number.isInteger(frame) || frame < 0) throw new Error("frame은 0 이상의 정수여야 한다");
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new Error("timeout-ms는 양의 정수여야 한다");
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
  try {
    await runLoggedCommand(process.execPath, args, {
      cwd: w.repo, logPath, timeoutMs,
      onProgress: (p) => console.error(`[${action}] ${p.state} · pid ${p.pid} · ${Math.round(p.elapsed_ms / 1000)}s · 출력 ${p.bytes}B · 로그 ${attempt.log}`),
    });
    return { action, cached: false, log: attempt.log, receipt: finishProductionAction(id, attempt.id) };
  } catch (error) {
    failProductionAction(id, attempt.id, error.message);
    throw error;
  }
};
