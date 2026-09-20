import { PILOTS } from "../../pilots/index";
import type { PilotData } from "./pilot";

// 활성 편 목록(pilots/active.json → pilots/index.ts 생성) 조회. Root 는 PILOTS 를 돌며 편마다 컴포지션을 등록한다.
const byId = new Map<string, PilotData>(PILOTS.map((p) => [p.id, p]));

export const getPilot = (id: string): PilotData => {
  const p = byId.get(id);
  if (!p) throw new Error(`pilot not found: ${id} — pilots/active.json 에 있는지, npm run pilots:index 를 돌렸는지 확인`);
  return p;
};

export { PILOTS };
