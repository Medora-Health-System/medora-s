/**
 * Disease-aware decision-support thresholds for MSPP sanitary signals (7d vs prior 7d).
 * In-code configuration only — no writes, no epidemic declaration semantics.
 */
import { MsppSignalLevel, type MsppSignalLevelValue } from "./mspp.constants";

/** Profile used when no disease-specific rule matches. Mirrors legacy generic rules. */
export const DEFAULT_SANITARY_SIGNAL_PROFILE_ID = "DEFAULT";

export type SanitarySignalThresholdProfile = {
  /** Stable id for API / UI (e.g. DEFAULT, CHOLERA_LIKE). */
  id: string;
  /** Minimum positive delta before any elevation above LOW. */
  minimumDelta: number;
  /** If current window count is below this, classification stays LOW. */
  minimumCurrentCount: number;
  /** Absolute increase vs prior window → HIGH (first matching tier wins). */
  highSignalDelta: number;
  /** Absolute increase vs prior window → MEDIUM if not HIGH. */
  mediumSignalDelta: number;
  /** Minimum prior-window count to apply ratio-based HIGH rule. */
  ratioBaselineMin: number;
  /** current/previous ratio threshold for HIGH (requires ratioBaselineMin). */
  ratioHigh: number;
  /** current/previous ratio threshold for MEDIUM. */
  ratioMedium: number;
  /** When previous window is 0, minimum current count for MEDIUM. */
  coldStartMediumMinCurrent: number;
};

/** Legacy national defaults (same numeric behaviour as pre–disease-aware classifier). */
export const DEFAULT_SANITARY_SIGNAL_PROFILE: SanitarySignalThresholdProfile = {
  id: DEFAULT_SANITARY_SIGNAL_PROFILE_ID,
  minimumDelta: 1,
  minimumCurrentCount: 0,
  highSignalDelta: 6,
  mediumSignalDelta: 3,
  ratioBaselineMin: 4,
  ratioHigh: 2,
  ratioMedium: 1.5,
  coldStartMediumMinCurrent: 4,
};

/** Acute watery / cholera-like (ICD-style A00): more sensitive thresholds. */
const CHOLERA_LIKE_PROFILE: SanitarySignalThresholdProfile = {
  id: "CHOLERA_LIKE",
  minimumDelta: 1,
  minimumCurrentCount: 1,
  highSignalDelta: 3,
  mediumSignalDelta: 2,
  ratioBaselineMin: 2,
  ratioHigh: 1.8,
  ratioMedium: 1.3,
  coldStartMediumMinCurrent: 2,
};

/** Vector-borne acute (e.g. dengue A90): moderately sensitive. */
const DENGUE_LIKE_PROFILE: SanitarySignalThresholdProfile = {
  id: "DENGUE_LIKE",
  minimumDelta: 1,
  minimumCurrentCount: 1,
  highSignalDelta: 5,
  mediumSignalDelta: 3,
  ratioBaselineMin: 3,
  ratioHigh: 1.9,
  ratioMedium: 1.45,
  coldStartMediumMinCurrent: 4,
};

/** Malaria (B50*): slightly stricter cold-start than default; ratio rules similar. */
const MALARIA_LIKE_PROFILE: SanitarySignalThresholdProfile = {
  id: "MALARIA_LIKE",
  minimumDelta: 1,
  minimumCurrentCount: 1,
  highSignalDelta: 5,
  mediumSignalDelta: 3,
  ratioBaselineMin: 4,
  ratioHigh: 2,
  ratioMedium: 1.5,
  coldStartMediumMinCurrent: 5,
};

/** Tuberculosis (A15*): slow-moving — higher bars for MEDIUM/HIGH. */
const TUBERCULOSIS_LIKE_PROFILE: SanitarySignalThresholdProfile = {
  id: "TUBERCULOSIS_LIKE",
  minimumDelta: 2,
  minimumCurrentCount: 2,
  highSignalDelta: 10,
  mediumSignalDelta: 5,
  ratioBaselineMin: 8,
  ratioHigh: 2,
  ratioMedium: 1.65,
  coldStartMediumMinCurrent: 8,
};

/** Exact `DiseaseCaseReport.diseaseCode` matches (stable identifier). */
const SANITARY_SIGNAL_PROFILE_BY_EXACT_CODE: Record<string, SanitarySignalThresholdProfile> = {
  A00: CHOLERA_LIKE_PROFILE,
  A90: DENGUE_LIKE_PROFILE,
};

/** Longest-prefix wins; order longest-first. */
const SANITARY_SIGNAL_PROFILE_BY_PREFIX: Array<{ prefix: string; profile: SanitarySignalThresholdProfile }> = [
  { prefix: "A15", profile: TUBERCULOSIS_LIKE_PROFILE },
  { prefix: "B50", profile: MALARIA_LIKE_PROFILE },
];

export type ResolvedSanitarySignalProfile = {
  profile: SanitarySignalThresholdProfile;
  /** Same as profile.id; repeated for explicit API field naming. */
  thresholdProfileUsed: string;
  /** Machine-readable: EXACT:<code> | PREFIX:<prefix> | DEFAULT */
  thresholdReason: string;
};

export function resolveSanitarySignalProfile(diseaseCode: string): ResolvedSanitarySignalProfile {
  const code = diseaseCode.trim();
  if (!code) {
    return {
      profile: DEFAULT_SANITARY_SIGNAL_PROFILE,
      thresholdProfileUsed: DEFAULT_SANITARY_SIGNAL_PROFILE.id,
      thresholdReason: "DEFAULT",
    };
  }
  const exact = SANITARY_SIGNAL_PROFILE_BY_EXACT_CODE[code];
  if (exact) {
    return {
      profile: exact,
      thresholdProfileUsed: exact.id,
      thresholdReason: `EXACT:${code}`,
    };
  }
  const sorted = [...SANITARY_SIGNAL_PROFILE_BY_PREFIX].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const { prefix, profile } of sorted) {
    if (code.startsWith(prefix)) {
      return {
        profile,
        thresholdProfileUsed: profile.id,
        thresholdReason: `PREFIX:${prefix}`,
      };
    }
  }
  return {
    profile: DEFAULT_SANITARY_SIGNAL_PROFILE,
    thresholdProfileUsed: DEFAULT_SANITARY_SIGNAL_PROFILE.id,
    thresholdReason: "DEFAULT",
  };
}

/**
 * Rule-based support level (not an outbreak declaration).
 * `diseaseCode` selects threshold profile; comparison windows are unchanged (caller).
 */
export function classifySanitarySignalLevelDiseaseAware(
  currentCount: number,
  previousCount: number,
  diseaseCode: string
): {
  signalLevel: MsppSignalLevelValue;
  thresholdProfileUsed: string;
  thresholdReason: string;
} {
  const resolved = resolveSanitarySignalProfile(diseaseCode);
  const level = classifySanitarySignalWithProfile(currentCount, previousCount, resolved.profile);
  return {
    signalLevel: level,
    thresholdProfileUsed: resolved.thresholdProfileUsed,
    thresholdReason: resolved.thresholdReason,
  };
}

function classifySanitarySignalWithProfile(
  currentCount: number,
  previousCount: number,
  p: SanitarySignalThresholdProfile
): MsppSignalLevelValue {
  const delta = currentCount - previousCount;
  if (delta <= 0) return MsppSignalLevel.LOW;
  if (currentCount < p.minimumCurrentCount) return MsppSignalLevel.LOW;
  if (delta < p.minimumDelta) return MsppSignalLevel.LOW;

  const ratio = previousCount > 0 ? currentCount / previousCount : Number.POSITIVE_INFINITY;

  if (delta >= p.highSignalDelta) return MsppSignalLevel.HIGH;
  if (previousCount >= p.ratioBaselineMin && ratio >= p.ratioHigh) return MsppSignalLevel.HIGH;

  if (delta >= p.mediumSignalDelta) return MsppSignalLevel.MEDIUM;
  if (ratio >= p.ratioMedium) return MsppSignalLevel.MEDIUM;
  if (previousCount === 0 && currentCount >= p.coldStartMediumMinCurrent) return MsppSignalLevel.MEDIUM;

  return MsppSignalLevel.LOW;
}
