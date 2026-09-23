import test from "node:test";
import assert from "node:assert/strict";
import { screenTextPolicyIssues, isProvenanceText } from "../scripts/lib/screen-text-policy.mjs";

const narration = { sentences: [
  { id: "s01", text: "생명에는 최소 세 가지가 필요합니다. 단단한 땅, 액체 물이 남을 온도, 그리고 대기." },
  { id: "s02", text: "트라피스트 원 행성들에선 대기 흔적을 찾지 못했죠." },
], captions: [{ text: "LHS 1140b." }] };
const concepts = (elements) => ({ concepts: [{ id: "c", elements }] });
const codes = (r) => r.errors.map((e) => e.code);

test("출처·재구성 표기는 role과 문구 모두로 막는다", () => {
  const r = screenTextPolicyIssues({ concepts: concepts([
    { id: "a", kind: "text", role: "provenance", text: "사진: NASA" },
    { id: "b", kind: "text", role: "condition", text: "상상도 · AI 재구성" },
    { id: "c", kind: "text", role: "condition", text: "컴퓨터 모델 예측 · 관측 아님" },
  ]), narration });
  assert.deepEqual(codes(r).filter((c) => c === "screen-text-provenance").length, 3);
});

test("나레이션을 다시 적는 문구는 오류, 대상에 붙는 키워드는 통과", () => {
  const r = screenTextPolicyIssues({ concepts: concepts([
    { id: "list", kind: "text", role: "necessary-label", text: "단단한 땅\n액체 물이 남을 온도\n대기" },
    { id: "trap", kind: "text", role: "necessary-label", text: "대기 흔적 찾지 못함" },
    { id: "name", kind: "text", role: "necessary-label", text: "LHS 1140b" },
    { id: "he", kind: "text", role: "necessary-label", text: "H · He" },
    { id: "gold", kind: "text", role: "necessary-label", text: "골디락스 영역" },
    { id: "age", kind: "text", role: "necessary-label", text: "30억 년+" },
  ]), narration });
  assert.deepEqual(r.errors.map((e) => e.where), ["concepts.c.list", "concepts.c.trap"]);
});

test("JSX 직접 문구 판정", () => {
  assert.ok(isProvenanceText("사진: Denys / Wikimedia Commons · CC BY 3.0"));
  assert.ok(!isProvenanceText("TRAPPIST-1"));
});
