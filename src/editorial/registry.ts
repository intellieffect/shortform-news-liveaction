import { EDITORIAL_PILOTS } from "../../pilots/index";
import type { EditorialPilotData } from "./pilot";

const byId = new Map<string, EditorialPilotData>(EDITORIAL_PILOTS.map((pilot) => [pilot.id, pilot]));

export const getEditorialPilot = (id: string): EditorialPilotData => {
  const pilot = byId.get(id);
  if (!pilot) throw new Error(`editorial pilot not found: ${id} — sync와 pilots:index를 확인한다`);
  return pilot;
};

export { EDITORIAL_PILOTS };
