import profile from "../../../config/production-profile.json";
import legacyProfile from "../../../config/production-profiles/hani-shortform-1.0.0.json";

export type ProductionProfile = Omit<typeof profile, "caption"> & {
  caption: Omit<typeof profile.caption, "max_lines" | "box_height"> & { max_lines?: number; box_height?: number };
};
// 프로필을 쓰는 편은 컴파일 당시의 snapshot을 받는다. 이전 편은 동일한 자막 기본값을 유지한다.
export const DEFAULT_PRODUCTION_PROFILE: ProductionProfile = profile;
export const LEGACY_PRODUCTION_PROFILE: ProductionProfile = legacyProfile;
