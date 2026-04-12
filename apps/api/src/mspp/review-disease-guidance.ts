/**
 * Disease-specific review decision-support profile resolution (read-only, in-code).
 * Separate from sanitary signal thresholds — same spirit (exact code + prefix), independent map.
 */
export const DEFAULT_REVIEW_GUIDANCE_PROFILE_ID = "DEFAULT";

/** Exact `DiseaseCaseReport.diseaseCode` → guidance profile id. */
const REVIEW_GUIDANCE_BY_EXACT_CODE: Record<string, string> = {
  A00: "CHOLERA_LIKE",
  A90: "DENGUE_LIKE",
};

/** Longest prefix wins. */
const REVIEW_GUIDANCE_BY_PREFIX: Array<{ prefix: string; profileId: string }> = [
  { prefix: "B05", profileId: "MEASLES_LIKE" },
  { prefix: "A15", profileId: "TUBERCULOSIS_LIKE" },
  { prefix: "B50", profileId: "MALARIA_LIKE" },
];

export type ResolvedReviewGuidance = {
  reviewGuidanceProfile: string;
  /** Machine-readable: EXACT:<code> | PREFIX:<prefix> | DEFAULT | MISSING */
  reviewGuidanceReason: string;
};

/**
 * Resolves advisory review profile from stable disease code only (not diseaseName).
 */
export function resolveReviewGuidance(diseaseCode: string | null | undefined): ResolvedReviewGuidance {
  const code = (diseaseCode ?? "").trim();
  if (!code) {
    return {
      reviewGuidanceProfile: DEFAULT_REVIEW_GUIDANCE_PROFILE_ID,
      reviewGuidanceReason: "MISSING",
    };
  }
  const exact = REVIEW_GUIDANCE_BY_EXACT_CODE[code];
  if (exact) {
    return {
      reviewGuidanceProfile: exact,
      reviewGuidanceReason: `EXACT:${code}`,
    };
  }
  const sorted = [...REVIEW_GUIDANCE_BY_PREFIX].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const { prefix, profileId } of sorted) {
    if (code.startsWith(prefix)) {
      return {
        reviewGuidanceProfile: profileId,
        reviewGuidanceReason: `PREFIX:${prefix}`,
      };
    }
  }
  return {
    reviewGuidanceProfile: DEFAULT_REVIEW_GUIDANCE_PROFILE_ID,
    reviewGuidanceReason: "DEFAULT",
  };
}
