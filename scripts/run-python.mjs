// package.json 의 Python 스크립트를 운영체제에 맞는 인터프리터로 실행한다.
// 왜: `python3` 을 박아 두면 Windows(`py`·`python` 만 있음)에서 실패한다.
import { spawnSync } from "node:child_process";
import { PYTHON } from "./lib/tools.mjs";

const result = spawnSync(PYTHON, process.argv.slice(2), { stdio: "inherit" });
if (result.error) {
  console.error(`Python 실행 실패 (${PYTHON}): ${result.error.message} — PYTHON_PATH 로 지정할 수 있다.`);
  process.exit(1);
}
process.exit(result.status ?? 1);
