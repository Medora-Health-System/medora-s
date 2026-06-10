import {
  getMedicationFrequencyDefinition,
  MEDICATION_FREQUENCY_CODES,
  type MedicationFrequencyCode,
  type MedicationFrequencyExpansionStrategy,
  parseMedicationFrequencyCode,
} from "./medicationFrequencyCatalog.js";

/**
 * M1.8B.6A — ED workflow preservation hardening (shared guards only).
 * Declarative gates for future M1.8B.7+ scheduling — no persistence, MAR, or expansion logic.
 */

/** Group A — must ALWAYS use OrderItem → MedicationAdministration (no schedule layer). */
export const MEDICATION_FREQUENCY_DIRECT_MAR_CODES = ["NOW", "STAT", "ONCE"] as const;

export type MedicationFrequencyDirectMarCode = (typeof MEDICATION_FREQUENCY_DIRECT_MAR_CODES)[number];

/** Group C — continuous infusion; isolated from MedicationDoseInstance architecture. */
export const MEDICATION_FREQUENCY_INFUSION_ISOLATED_CODES = ["CONTINUOUS"] as const;

export type MedicationFrequencyInfusionIsolatedCode =
  (typeof MEDICATION_FREQUENCY_INFUSION_ISOLATED_CODES)[number];

/**
 * Group B — may use OrderItem → MedicationOrderSchedule → MedicationDoseInstance in future phases
 * only when scheduling feature flags are ON.
 */
export const MEDICATION_FREQUENCY_FUTURE_SCHEDULING_CODES = [
  "DAILY",
  "BID",
  "TID",
  "QID",
  "Q2H",
  "Q3H",
  "Q4H",
  "Q6H",
  "Q8H",
  "Q12H",
  "Q24H",
  "WEEKLY",
  "MONTHLY",
  "AC",
  "PC",
  "HS",
  "ACHS",
  "PRN",
  "TAPER",
] as const satisfies readonly MedicationFrequencyCode[];

export type MedicationFrequencyFutureSchedulingCode =
  (typeof MEDICATION_FREQUENCY_FUTURE_SCHEDULING_CODES)[number];

/** Mandatory feature flags — all default OFF; ED uses legacy/direct paths when off. */
export const MEDICATION_SCHEDULING_FEATURE_FLAG_KEYS = [
  "MEDICATION_SCHEDULING_V1",
  "MEDICATION_DOSE_INSTANCES",
  "MEDICATION_DOSE_GATED_MAR",
  /** M1.8B.7J — recurring IVPB dose scheduling (contract default OFF; wiring in 7J.2+). */
  "MEDICATION_IVPB_DOSE_SCHEDULING",
  "MEDICATION_RESPONSE_ENGINE",
  "HOSPITAL_EMAR",
] as const;

export type MedicationSchedulingFeatureFlagKey =
  (typeof MEDICATION_SCHEDULING_FEATURE_FLAG_KEYS)[number];

export type MedicationSchedulingFeatureFlags = Readonly<
  Record<MedicationSchedulingFeatureFlagKey, boolean>
>;

/** Default OFF — current ED/production behavior preserved. */
export const MEDICATION_SCHEDULING_FEATURE_FLAGS_DEFAULT_OFF: MedicationSchedulingFeatureFlags =
  Object.freeze({
    MEDICATION_SCHEDULING_V1: false,
    MEDICATION_DOSE_INSTANCES: false,
    MEDICATION_DOSE_GATED_MAR: false,
    MEDICATION_IVPB_DOSE_SCHEDULING: false,
    MEDICATION_RESPONSE_ENGINE: false,
    HOSPITAL_EMAR: false,
  });

export type MedicationScheduleArchitecturePath =
  | "LEGACY_DIRECT_MAR"
  | "DIRECT_MAR"
  | "INFUSION_LIFECYCLE"
  | "FUTURE_SCHEDULE";

export type MedicationScheduleExpansionGateResult = {
  /** When false, M1.8B.7 ScheduleExpansionService must not run. */
  scheduleExpansionAllowed: boolean;
  architecturePath: MedicationScheduleArchitecturePath;
  frequencyCode: MedicationFrequencyCode | null;
  /** Human-readable gate reason for audit logs and tests. */
  gateReason: string;
};

const DIRECT_MAR_SET = new Set<string>(MEDICATION_FREQUENCY_DIRECT_MAR_CODES);
const INFUSION_ISOLATED_SET = new Set<string>(MEDICATION_FREQUENCY_INFUSION_ISOLATED_CODES);
const FUTURE_SCHEDULING_SET = new Set<string>(MEDICATION_FREQUENCY_FUTURE_SCHEDULING_CODES);

/** Hard rule: NOW / STAT / ONCE never generate schedules (M1.8B.6A). */
export function isDirectMarFrequency(
  code: MedicationFrequencyCode | string | null | undefined
): code is MedicationFrequencyDirectMarCode {
  const parsed = parseMedicationFrequencyCode(code == null ? null : String(code));
  return parsed != null && DIRECT_MAR_SET.has(parsed);
}

export function isInfusionIsolatedFrequency(
  code: MedicationFrequencyCode | string | null | undefined
): code is MedicationFrequencyInfusionIsolatedCode {
  const parsed = parseMedicationFrequencyCode(code == null ? null : String(code));
  return parsed != null && INFUSION_ISOLATED_SET.has(parsed);
}

export function isFutureSchedulingFrequency(
  code: MedicationFrequencyCode | string | null | undefined
): code is MedicationFrequencyFutureSchedulingCode {
  const parsed = parseMedicationFrequencyCode(code == null ? null : String(code));
  return parsed != null && FUTURE_SCHEDULING_SET.has(parsed);
}

/** True when M1.8B.7 must never invoke schedule expansion for this frequency. */
export function medicationFrequencyMustBypassScheduleExpansion(
  code: MedicationFrequencyCode | string | null | undefined
): boolean {
  if (code == null || String(code).trim() === "") return true;
  if (isDirectMarFrequency(code)) return true;
  if (isInfusionIsolatedFrequency(code)) return true;
  return false;
}

export function medicationSchedulingFeatureFlagsEnabled(
  flags: Partial<MedicationSchedulingFeatureFlags> | null | undefined
): boolean {
  const merged: MedicationSchedulingFeatureFlags = {
    ...MEDICATION_SCHEDULING_FEATURE_FLAGS_DEFAULT_OFF,
    ...flags,
  };
  return (
    merged.MEDICATION_SCHEDULING_V1 === true &&
    merged.MEDICATION_DOSE_INSTANCES === true
  );
}

/**
 * Single gate for M1.8B.7 ScheduleExpansionService entry.
 * Legacy orders (no frequencyCode) always resolve to LEGACY_DIRECT_MAR.
 */
export function resolveMedicationScheduleExpansionGate(input: {
  frequencyCode?: MedicationFrequencyCode | string | null;
  featureFlags?: Partial<MedicationSchedulingFeatureFlags> | null;
}): MedicationScheduleExpansionGateResult {
  const parsed = parseMedicationFrequencyCode(
    input.frequencyCode == null ? null : String(input.frequencyCode)
  );

  if (!parsed) {
    return {
      scheduleExpansionAllowed: false,
      architecturePath: "LEGACY_DIRECT_MAR",
      frequencyCode: null,
      gateReason: "LEGACY_ORDER_NO_FREQUENCY_CODE",
    };
  }

  if (isDirectMarFrequency(parsed)) {
    return {
      scheduleExpansionAllowed: false,
      architecturePath: "DIRECT_MAR",
      frequencyCode: parsed,
      gateReason: "DIRECT_MAR_FREQUENCY_NEVER_SCHEDULES",
    };
  }

  if (isInfusionIsolatedFrequency(parsed)) {
    return {
      scheduleExpansionAllowed: false,
      architecturePath: "INFUSION_LIFECYCLE",
      frequencyCode: parsed,
      gateReason: "CONTINUOUS_USES_INFUSION_START_STOP_NOT_DOSE_INSTANCES",
    };
  }

  if (!medicationSchedulingFeatureFlagsEnabled(input.featureFlags)) {
    return {
      scheduleExpansionAllowed: false,
      architecturePath: "LEGACY_DIRECT_MAR",
      frequencyCode: parsed,
      gateReason: "SCHEDULING_FEATURE_FLAGS_OFF",
    };
  }

  if (isFutureSchedulingFrequency(parsed)) {
    return {
      scheduleExpansionAllowed: true,
      architecturePath: "FUTURE_SCHEDULE",
      frequencyCode: parsed,
      gateReason: "FUTURE_SCHEDULING_FLAGS_ON",
    };
  }

  return {
    scheduleExpansionAllowed: false,
    architecturePath: "LEGACY_DIRECT_MAR",
    frequencyCode: parsed,
    gateReason: "UNCLASSIFIED_FREQUENCY_FALLBACK_DIRECT_MAR",
  };
}

/** Validates catalog partition covers all codes exactly once across groups A/B/C. */
export function assertMedicationFrequencyEdHardeningPartition(): void {
  const covered = new Set<string>([
    ...MEDICATION_FREQUENCY_DIRECT_MAR_CODES,
    ...MEDICATION_FREQUENCY_FUTURE_SCHEDULING_CODES,
    ...MEDICATION_FREQUENCY_INFUSION_ISOLATED_CODES,
  ]);
  if (covered.size !== MEDICATION_FREQUENCY_CODES.length) {
    throw new Error(
      `ED hardening partition size mismatch: expected ${MEDICATION_FREQUENCY_CODES.length}, got ${covered.size}`
    );
  }
  for (const code of MEDICATION_FREQUENCY_CODES) {
    if (!covered.has(code)) {
      throw new Error(`ED hardening partition missing frequency code: ${code}`);
    }
  }
}

assertMedicationFrequencyEdHardeningPartition();

/** Expansion strategies that must never run while scheduling flags are OFF. */
export const HOSPITAL_EXPANSION_STRATEGIES_REQUIRING_FLAGS: readonly MedicationFrequencyExpansionStrategy[] =
  [
    "FIXED_DAILY_CLOCK",
    "INTERVAL_FROM_ANCHOR",
    "MEAL_ANCHORED",
    "MEAL_COMPOSITE",
    "CALENDAR_WEEKLY",
    "CALENDAR_MONTHLY",
    "TAPER_STEP",
  ] as const;

export function expansionStrategyRequiresSchedulingFlags(
  strategy: MedicationFrequencyExpansionStrategy | null | undefined
): boolean {
  if (!strategy) return false;
  return (HOSPITAL_EXPANSION_STRATEGIES_REQUIRING_FLAGS as readonly string[]).includes(strategy);
}

/** Order-line completion after single terminal MAR must remain for direct-MAR frequencies. */
export function orderLineCompletesOnTerminalMarForFrequency(
  code: MedicationFrequencyCode | string | null | undefined
): boolean {
  if (code == null || String(code).trim() === "") return true;
  if (isDirectMarFrequency(code)) return true;
  if (isInfusionIsolatedFrequency(code)) return false;
  return false;
}
