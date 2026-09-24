#!/usr/bin/env node
import { adoptNarration, beginProductionAction, completeProduction, failProductionAction, finishProductionAction, invalidateProductionAction, productionStatus, productionReviewInput, resolveProductionIssue, reviewTemplate } from "./lib/production/state.mjs";
import { readFileSync } from "node:fs";
import { startProduction } from "./lib/production/start.mjs";
import { assertExecution, productionEnvironment } from "./lib/production/environment.mjs";
import { runProductionAction } from "./lib/production/actions.mjs";
import { productionPreflight, productionSpecification } from "./lib/production/preflight.mjs";
import { deliverEpisode } from "./lib/production/finalize.mjs";

const [command, id, ...args] = process.argv.slice(2);
const flags = command === "doctor" || (command === "start" && id?.startsWith("--")) ? [id, ...args].filter(Boolean) : args;
const value = (flag) => { const i = flags.indexOf(flag); return i < 0 ? undefined : flags[i + 1]; };
const values = (flag) => args.flatMap((arg, i) => arg === flag && args[i + 1] ? [args[i + 1]] : []);
const usage = [
  "produce start [id] --url <기사 URL> --duration <최소초:최대초> --request-file <요청 원문 파일>",
  "produce doctor [--installed] [--capabilities <현재 세션 도구 JSON>]",
  "produce status|resume <id> [--json]",
  "produce spec <id>  # 현재 프로필·스키마·발화 앵커를 한 번에 조회",
  "produce preflight <id> narration|alignment|timeline|sync  # 읽기 전용 검사",
  "produce adopt-narration <id>",
  "produce run <id> timeline|sync|proof|render [--output <저장소 상대 경로>] [--frame <정수>] [--timeout-ms <양의 정수>]",
  "produce begin <id> scene_proof|narration|proof|render|review_visual|review_audio|review_facts [--output <새 파일>]...",
  "produce finish <id> <token>",
  "produce fail <id> <token> --reason <실패 이유>",
  "produce invalidate <id> <action> --reason <의미 변경 이유>",
  "produce review-input <id> --source scene|preview|render --phase experience|intent",
  "produce review-template <id> review_visual|review_audio|review_facts",
  "produce resolve <id> <issue-key> --reason <수정 설명> --from <시작 프레임> --end <끝 프레임>",
  "produce complete <id>  # 자동 검수 완료 → 새 버전 확정·자동 커밋",
  "produce deliver <id> [--basis user] [--from vK] [--note <메모>]  # 사용자 확정 또는 이전 판 복원을 새 버전으로 확정·자동 커밋",
].join("\n");

try {
  let result;
  if (command !== "doctor") assertExecution();
  if (command === "doctor") {
    result = productionEnvironment({ installed: flags.includes("--installed"), capabilities: value("--capabilities") });
    if (result.execution.errors.length) process.exitCode = 1;
  } else if (command === "start") {
    if (!value("--request-file")) throw new Error("--request-file로 사용자 원문을 전달한다");
    result = startProduction({ id: id?.startsWith("--") ? undefined : id, url: value("--url"), duration: value("--duration")?.split(":").map(Number), request: readFileSync(value("--request-file"), "utf8") });
  } else if (command === "status" || command === "resume") {
    result = productionStatus(id, { includeContext: command === "resume" });
    if (!args.includes("--json")) {
      console.log(id + " · 상태 기록 " + (result.managed ? result.state_file : "미시작"));
      for (const [action, state] of Object.entries(result.actions)) {
        console.log(action.padEnd(15) + " " + state.status + (state.reasons.length ? " · " + state.reasons.map((r) => r.path ?? r.reason ?? r.action ?? r.kind).join(", ") : ""));
        if (state.pending) console.log("  미종료 토큰 " + state.pending.token + " · " + state.pending.log);
      }
      console.log("기술적으로 실행 가능한 작업: " + (result.next.join(", ") || "미종료 작업·입력 확인"));
      console.log("사용자 마감: " + result.delivery.status + " · " + result.delivery.record);
      console.log("자동 검수 완료: " + result.completion.status);
      for (const b of result.completion.blockers) console.log("  " + (b.action ?? b.code) + " · " + b.detail);
      for (const issue of result.completion.issues) console.log("  이슈 " + issue.key + " · " + issue.status + " · " + issue.observation);
      if (result.context) console.log(JSON.stringify(result.context, null, 2));
      process.exit(0);
    }
  } else if (command === "spec") result = productionSpecification(id);
  else if (command === "preflight") {
    result = productionPreflight(id, args[0]);
    if (!result.ready) process.exitCode = 1;
  } else if (command === "adopt-narration") result = adoptNarration(id);
  else if (command === "begin") result = beginProductionAction(id, args[0], { outputs: values("--output"), command: value("--tool") ? { tool: value("--tool"), kind: "external-selection" } : null });
  else if (command === "finish") result = finishProductionAction(id, args[0]);
  else if (command === "fail") {
    if (!value("--reason")) throw new Error("--reason이 필요하다");
    result = failProductionAction(id, args[0], value("--reason"));
  } else if (command === "invalidate") result = invalidateProductionAction(id, args[0], value("--reason"));
  else if (command === "review-input") result = productionReviewInput(id, { source: value("--source"), phase: value("--phase") });
  else if (command === "review-template") result = reviewTemplate(id, args[0]);
  else if (command === "resolve") result = resolveProductionIssue(id, args[0], value("--reason"), [Number(value("--from")), Number(value("--end"))]);
  else if (command === "complete") {
    const completion = completeProduction(id);
    result = { completion, delivery: deliverEpisode(id, { basis: "completion" }) };
  } else if (command === "deliver") {
    const basis = value("--basis") ?? "user";
    if (!["user", "completion"].includes(basis)) throw new Error("--basis는 user 또는 completion");
    result = deliverEpisode(id, { basis, from: value("--from"), note: value("--note") ?? null });
  }
  else if (command === "run") result = await runProductionAction(id, args[0], { output: value("--output"), frame: value("--frame") === undefined ? 30 : Number(value("--frame")), ...(value("--timeout-ms") === undefined ? {} : { timeoutMs: Number(value("--timeout-ms")) }) });
  else throw new Error(usage);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
