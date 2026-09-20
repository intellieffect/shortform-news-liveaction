import { existsSync, readFileSync } from "node:fs";
import { hash, json } from "./contracts.mjs";

// 사용자 마감과 자동 검수 완료는 별개다. 확정한 파일·원문이 보존됐는지만 대조한다.
export const productionDelivery = (w) => {
  const record = "news/" + w.id + "/02_production/closeout.json";
  if (!existsSync(w.path(record))) return { status: "unrecorded", record };
  try {
    const value = json(w.path(record));
    if (value.schema_version !== "1.0" || value.pilot !== w.id || value.basis !== "user-confirmed"
      || value.status !== "closed" || !value.raw_request || !value.artifacts?.length) throw new Error("마감 기록 형식 불일치");
    const files = [value.raw_request, ...value.artifacts];
    const mismatches = files.filter((file) => !file.path || !file.sha256
      || !existsSync(w.path(file.path)) || hash(readFileSync(w.path(file.path))) !== file.sha256).map((file) => file.path);
    return { ...value, status: mismatches.length ? "changed" : "closed", record, mismatches,
      note: "사용자 시청 확인·마무리 지시에 따른 마감이다. 자동 검수의 completion과 구별하며 마감한 파일을 임의로 재제작하지 않는다." };
  } catch (error) {
    return { status: "invalid", record, reason: error.message };
  }
};
