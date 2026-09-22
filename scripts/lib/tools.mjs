// 외부 도구를 어디서 찾을지 한 곳에서 정한다.
// 왜: 여러 스크립트가 `/opt/homebrew/bin/ffmpeg` 를 박아 두어, 그 경로가 없는
// 컴퓨터(Windows·Linux·Intel 맥)에서는 설치돼 있어도 못 찾았다.
// PATH 에 맡기고, 여러 벌이 깔린 경우에만 환경 변수로 고르게 한다.
import { spawnSync } from "node:child_process";

const pick = (variable, candidates) => {
  const chosen = process.env[variable]?.trim();
  if (chosen) return chosen;
  for (const command of candidates) {
    if (spawnSync(command, ["--version"], { stdio: "ignore", timeout: 5000 }).status === 0)
      return command;
  }
  // 못 찾아도 첫 후보를 준다 — 실패가 «실행 불가» 로 드러나야지, 조용히 다른 도구로 바뀌면 안 된다.
  return candidates[0];
};

export const FFMPEG = process.env.FFMPEG_PATH?.trim() || "ffmpeg";
export const FFPROBE = process.env.FFPROBE_PATH?.trim() || "ffprobe";

/** Windows 에는 `python3` 이 없다 — `py` 와 `python` 이 들어온다. */
export const PYTHON = pick(
  "PYTHON_PATH",
  process.platform === "win32" ? ["py", "python", "python3"] : ["python3", "python"],
);
