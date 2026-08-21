/**
 * MEDUI.LAB.REF.1 — Enterprise laboratory reference-interval / critical-value authority (pure logic).
 *
 * Durable registry lives in Prisma. This module is the deterministic resolver + snapshot helpers.
 * Never invent ranges. Ambiguity → unresolved. Critical ≠ H/L from reference intervals.
 */

import {
  computeLabResultFlagFromReference,
  parseLabNumericValue,
  type LabResultReferenceFlag,
} from "./labResultReferenceFlag.js";

export type LabSexApplicabilityCode = "ANY" | "MALE" | "FEMALE" | "OTHER";
export type LabPregnancyApplicabilityCode = "ANY" | "NOT_PREGNANT" | "PREGNANT" | "UNKNOWN";
export type LabPatientSexInput = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN" | "M" | "F" | "X" | "U" | null | undefined;
export type LabPregnancyInput = "NOT_PREGNANT" | "PREGNANT" | "UNKNOWN" | null | undefined;

export type LabReferenceIntervalAuthorityKind = "FACILITY" | "CANONICAL" | "UNRESOLVED";

export type LabIntervalCandidate = {
  id: string;
  specimen: string | null;
  unit: string | null;
  ageMinYears: number | null;
  ageMaxYears: number | null;
  sexApplicability: LabSexApplicabilityCode;
  pregnancyApplicability: LabPregnancyApplicabilityCode;
  methodOrAnalyzer: string | null;
  low: number | null;
  high: number | null;
  textualInterval: string | null;
  loincCode: string | null;
  sourceName: string | null;
  sourceIdentifier: string | null;
  sourceUrl: string | null;
  sourceVersion: string | null;
  effectiveFrom: Date | string;
  effectiveTo: Date | string | null;
  status: "ACTIVE" | "SUPERSEDED" | "DRAFT" | "RETIRED" | string;
};

export type LabCriticalPolicyCandidate = {
  id: string;
  facilityId: string | null;
  specimen: string | null;
  unit: string | null;
  ageMinYears: number | null;
  ageMaxYears: number | null;
  sexApplicability: LabSexApplicabilityCode;
  methodOrAnalyzer: string | null;
  criticalLow: number | null;
  criticalHigh: number | null;
  textualCritical: string | null;
  sourceName: string | null;
  sourceIdentifier: string | null;
  effectiveFrom: Date | string;
  effectiveTo: Date | string | null;
  status: "ACTIVE" | "SUPERSEDED" | "DRAFT" | "RETIRED" | string;
};

export type ResolveLabReferenceIntervalInput = {
  facilityId: string;
  canonicalAnalyteId: string;
  patientDemographics: {
    sex?: LabPatientSexInput;
    ageYears?: number | null;
    pregnancy?: LabPregnancyInput;
  };
  specimen?: string | null;
  unit?: string | null;
  methodOrAnalyzer?: string | null;
  collectedAt: Date | string;
  /** Facility-scoped validated overrides for this analyte (caller filters by facilityId + analyte). */
  facilityIntervals: LabIntervalCandidate[];
  /** Medora canonical baseline intervals for this analyte. */
  canonicalIntervals: LabIntervalCandidate[];
};

export type ResolvedLabReferenceInterval = {
  authority: LabReferenceIntervalAuthorityKind;
  intervalId: string | null;
  low: number | null;
  high: number | null;
  textualInterval: string | null;
  unit: string | null;
  loincCode: string | null;
  specimen: string | null;
  methodOrAnalyzer: string | null;
  sourceName: string | null;
  sourceIdentifier: string | null;
  sourceUrl: string | null;
  sourceVersion: string | null;
};

export type ResolveLabCriticalValueInput = {
  facilityId: string;
  canonicalAnalyteId: string;
  patientDemographics: {
    sex?: LabPatientSexInput;
    ageYears?: number | null;
  };
  specimen?: string | null;
  unit?: string | null;
  methodOrAnalyzer?: string | null;
  collectedAt: Date | string;
  patientValue: string | number | null | undefined;
  policies: LabCriticalPolicyCandidate[];
};

export type ResolvedLabCriticalValue = {
  status: "CRITICAL_LOW" | "CRITICAL_HIGH" | "CRITICAL" | null;
  policyId: string | null;
  facilityScoped: boolean;
  criticalLow: number | null;
  criticalHigh: number | null;
  textualCritical: string | null;
  sourceName: string | null;
};

/** Snapshot fields stored on Result.resultData.observations[] at verification/finalization. */
export type LabObservationReferenceSnapshot = {
  canonicalAnalyteId?: string | null;
  canonicalAnalyteCode?: string | null;
  loincCode?: string | null;
  intervalAuthority?: LabReferenceIntervalAuthorityKind | null;
  intervalId?: string | null;
  referenceLow?: number | null;
  referenceHigh?: number | null;
  referenceText?: string | null;
  unit?: string | null;
  flagHL?: LabResultReferenceFlag;
  criticalStatus?: ResolvedLabCriticalValue["status"];
  criticalPolicyId?: string | null;
  intervalSourceName?: string | null;
  intervalSourceIdentifier?: string | null;
  intervalSourceUrl?: string | null;
  intervalSourceVersion?: string | null;
  snapshottedAt?: string;
  /** Once true, registry changes must not rewrite these fields. */
  locked?: boolean;
};

export function normalizeLabAliasCode(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function normalizeLabUnit(raw: string | null | undefined): string | null {
  let t = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/µ/g, "u")
    .replace(/μ/g, "u")
    .replace(/×/g, "x")
    .replace(/¹⁰/g, "10");
  if (!t) return null;

  /**
   * MEDUI.LAB.REF.2A — notation-only normalization within the SAME published unit.
   * Do NOT silently equate clinically distinct reporting units:
   * - mg/dL ≠ mmol/L
   * - ×10³/µL ≠ ×10⁹/L (no silent conversion this phase)
   * - FEU ≠ DDU
   * - U/L ≠ other activity units
   * - mmol/L ≠ mEq/L (no silent conversion this phase)
   */
  // Mayo "x 10(9)/L" / "10^9/L" / "10e9/L" are the same published counting unit string family.
  if (/^(?:x?10\^?9\/l|x?10\(9\)\/l|10e9\/l)$/.test(t) || t === "10^9/l") {
    return "10^9/l";
  }
  if (/^(?:x?10\^?12\/l|x?10\(12\)\/l|10e12\/l)$/.test(t) || t === "10^12/l") {
    return "10^12/l";
  }
  return t;
}

export function normalizeLabSpecimen(raw: string | null | undefined): string | null {
  const t = String(raw ?? "").trim().toUpperCase();
  if (!t) return null;
  return t.replace(/\s+/g, "_");
}

export function normalizeLabMethod(raw: string | null | undefined): string | null {
  const t = String(raw ?? "").trim().toUpperCase();
  if (!t) return null;
  return t.replace(/\s+/g, "_");
}

function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

function normalizePatientSex(sex: LabPatientSexInput): "MALE" | "FEMALE" | "OTHER" | "UNKNOWN" {
  const s = String(sex ?? "").trim().toUpperCase();
  if (s === "M" || s === "MALE") return "MALE";
  if (s === "F" || s === "FEMALE") return "FEMALE";
  if (s === "X" || s === "OTHER") return "OTHER";
  return "UNKNOWN";
}

function sexMatches(
  applicability: LabSexApplicabilityCode,
  patientSex: ReturnType<typeof normalizePatientSex>
): boolean {
  if (applicability === "ANY") return true;
  if (patientSex === "UNKNOWN") {
    // Unknown patient sex only matches ANY rows — never guess MALE/FEMALE.
    return false;
  }
  return applicability === patientSex;
}

function pregnancyMatches(
  applicability: LabPregnancyApplicabilityCode,
  pregnancy: LabPregnancyInput
): boolean {
  if (applicability === "ANY") return true;
  const p = String(pregnancy ?? "UNKNOWN").toUpperCase();
  if (applicability === "UNKNOWN") return p === "UNKNOWN";
  return applicability === p;
}

function ageMatches(
  ageYears: number | null | undefined,
  min: number | null,
  max: number | null
): boolean {
  if (min == null && max == null) return true;
  if (ageYears == null || !Number.isFinite(ageYears)) {
    // Age-restricted rows cannot match without age — do not guess adult.
    return false;
  }
  if (min != null && ageYears < min) return false;
  if (max != null && ageYears >= max) return false;
  return true;
}

function effectiveMatches(
  collectedAt: Date,
  from: Date | string,
  to: Date | string | null
): boolean {
  const t = collectedAt.getTime();
  const f = toDate(from).getTime();
  if (Number.isNaN(t) || Number.isNaN(f)) return false;
  if (t < f) return false;
  if (to != null) {
    const e = toDate(to).getTime();
    if (Number.isNaN(e) || t >= e) return false;
  }
  return true;
}

function dimensionMatches(
  row: {
    specimen: string | null;
    unit: string | null;
    methodOrAnalyzer: string | null;
    ageMinYears: number | null;
    ageMaxYears: number | null;
    sexApplicability: LabSexApplicabilityCode;
    pregnancyApplicability?: LabPregnancyApplicabilityCode;
    effectiveFrom: Date | string;
    effectiveTo: Date | string | null;
    status: string;
  },
  ctx: {
    specimen?: string | null;
    unit?: string | null;
    methodOrAnalyzer?: string | null;
    ageYears?: number | null;
    sex?: LabPatientSexInput;
    pregnancy?: LabPregnancyInput;
    collectedAt: Date;
  }
): boolean {
  if (row.status !== "ACTIVE") return false;
  if (!effectiveMatches(ctx.collectedAt, row.effectiveFrom, row.effectiveTo)) return false;
  if (!ageMatches(ctx.ageYears, row.ageMinYears, row.ageMaxYears)) return false;
  if (!sexMatches(row.sexApplicability, normalizePatientSex(ctx.sex))) return false;
  if (row.pregnancyApplicability != null) {
    if (!pregnancyMatches(row.pregnancyApplicability, ctx.pregnancy)) return false;
  }

  const reqSpecimen = normalizeLabSpecimen(ctx.specimen);
  const rowSpecimen = normalizeLabSpecimen(row.specimen);
  // Specimen mismatch safety: both sides present and different → no match.
  if (reqSpecimen && rowSpecimen && reqSpecimen !== rowSpecimen) return false;

  const reqUnit = normalizeLabUnit(ctx.unit);
  const rowUnit = normalizeLabUnit(row.unit);
  // Unit mismatch safety: never apply a mmol/L interval to a mg/dL value (etc.).
  if (reqUnit && rowUnit && reqUnit !== rowUnit) return false;

  const reqMethod = normalizeLabMethod(ctx.methodOrAnalyzer);
  const rowMethod = normalizeLabMethod(row.methodOrAnalyzer);
  if (reqMethod && rowMethod && reqMethod !== rowMethod) return false;
  // Method-specific rows require an explicit matching method — do not guess.
  if (rowMethod && !reqMethod) return false;

  return true;
}

function pickExclusiveMatch<T extends { id: string }>(matches: T[]): T | null {
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0]!;
  // Ambiguity → unresolved (never best-guess).
  return null;
}

function toResolved(
  authority: LabReferenceIntervalAuthorityKind,
  row: LabIntervalCandidate | null
): ResolvedLabReferenceInterval {
  if (!row) {
    return {
      authority: "UNRESOLVED",
      intervalId: null,
      low: null,
      high: null,
      textualInterval: null,
      unit: null,
      loincCode: null,
      specimen: null,
      methodOrAnalyzer: null,
      sourceName: null,
      sourceIdentifier: null,
      sourceUrl: null,
      sourceVersion: null,
    };
  }
  return {
    authority,
    intervalId: row.id,
    low: row.low,
    high: row.high,
    textualInterval: row.textualInterval,
    unit: row.unit,
    loincCode: row.loincCode,
    specimen: row.specimen,
    methodOrAnalyzer: row.methodOrAnalyzer,
    sourceName: row.sourceName,
    sourceIdentifier: row.sourceIdentifier,
    sourceUrl: row.sourceUrl,
    sourceVersion: row.sourceVersion,
  };
}

/**
 * Deterministic enterprise resolver:
 * Facility validated interval > Medora canonical baseline > UNRESOLVED.
 * Ambiguity at either tier → UNRESOLVED (does not fall through to a guessed lower tier match
 * when the higher tier had ambiguous candidates).
 */
export function resolveLabReferenceInterval(
  input: ResolveLabReferenceIntervalInput
): ResolvedLabReferenceInterval {
  const collectedAt = toDate(input.collectedAt);
  const ctx = {
    specimen: input.specimen,
    unit: input.unit,
    methodOrAnalyzer: input.methodOrAnalyzer,
    ageYears: input.patientDemographics.ageYears,
    sex: input.patientDemographics.sex,
    pregnancy: input.patientDemographics.pregnancy,
    collectedAt,
  };

  const facilityMatches = input.facilityIntervals.filter((r) => dimensionMatches(r, ctx));
  if (facilityMatches.length > 1) {
    return toResolved("UNRESOLVED", null);
  }
  if (facilityMatches.length === 1) {
    return toResolved("FACILITY", facilityMatches[0]!);
  }

  const canonicalMatches = input.canonicalIntervals.filter((r) => dimensionMatches(r, ctx));
  const chosen = pickExclusiveMatch(canonicalMatches);
  if (!chosen) return toResolved("UNRESOLVED", null);
  return toResolved("CANONICAL", chosen);
}

/**
 * Critical policy resolution is independent of reference-interval H/L.
 * Facility policies beat enterprise (facilityId null) policies; ambiguity → no critical.
 */
export function resolveLabCriticalValue(
  input: ResolveLabCriticalValueInput
): ResolvedLabCriticalValue {
  const collectedAt = toDate(input.collectedAt);
  const ctx = {
    specimen: input.specimen,
    unit: input.unit,
    methodOrAnalyzer: input.methodOrAnalyzer,
    ageYears: input.patientDemographics.ageYears,
    sex: input.patientDemographics.sex,
    collectedAt,
  };

  const active = input.policies.filter((p) =>
    dimensionMatches(
      {
        ...p,
        pregnancyApplicability: "ANY",
      },
      ctx
    )
  );

  const facilityScoped = active.filter((p) => p.facilityId === input.facilityId);
  const enterprise = active.filter((p) => p.facilityId == null);

  let chosen: LabCriticalPolicyCandidate | null = null;
  let facilityScopedFlag = false;

  if (facilityScoped.length > 1) {
    return emptyCritical();
  }
  if (facilityScoped.length === 1) {
    chosen = facilityScoped[0]!;
    facilityScopedFlag = true;
  } else {
    chosen = pickExclusiveMatch(enterprise);
  }

  if (!chosen) return emptyCritical();

  const value =
    typeof input.patientValue === "number"
      ? input.patientValue
      : parseLabNumericValue(input.patientValue == null ? null : String(input.patientValue));

  if (value == null) {
    return {
      status: null,
      policyId: chosen.id,
      facilityScoped: facilityScopedFlag,
      criticalLow: chosen.criticalLow,
      criticalHigh: chosen.criticalHigh,
      textualCritical: chosen.textualCritical,
      sourceName: chosen.sourceName,
    };
  }

  let status: ResolvedLabCriticalValue["status"] = null;
  const lowHit = chosen.criticalLow != null && value <= chosen.criticalLow;
  const highHit = chosen.criticalHigh != null && value >= chosen.criticalHigh;
  if (lowHit && highHit) status = "CRITICAL";
  else if (lowHit) status = "CRITICAL_LOW";
  else if (highHit) status = "CRITICAL_HIGH";

  return {
    status,
    policyId: chosen.id,
    facilityScoped: facilityScopedFlag,
    criticalLow: chosen.criticalLow,
    criticalHigh: chosen.criticalHigh,
    textualCritical: chosen.textualCritical,
    sourceName: chosen.sourceName,
  };
}

function emptyCritical(): ResolvedLabCriticalValue {
  return {
    status: null,
    policyId: null,
    facilityScoped: false,
    criticalLow: null,
    criticalHigh: null,
    textualCritical: null,
    sourceName: null,
  };
}

/** Format reference for five-column display / stored referenceText. */
export function formatResolvedReferenceText(resolved: ResolvedLabReferenceInterval): string | null {
  if (resolved.authority === "UNRESOLVED") return null;
  if (resolved.textualInterval && resolved.textualInterval.trim()) {
    return resolved.textualInterval.trim();
  }
  if (resolved.low != null && resolved.high != null) {
    return `${resolved.low}–${resolved.high}`;
  }
  if (resolved.low != null) return `≥${resolved.low}`;
  if (resolved.high != null) return `≤${resolved.high}`;
  return null;
}

/**
 * H/L from resolved numeric interval only. Never derived from critical policy.
 */
export function computeHLFromResolvedInterval(
  patientValue: string | number | null | undefined,
  resolved: ResolvedLabReferenceInterval
): LabResultReferenceFlag {
  if (resolved.authority === "UNRESOLVED") return null;
  const text = formatResolvedReferenceText(resolved);
  const valueStr = patientValue == null ? "" : String(patientValue);
  if (text) return computeLabResultFlagFromReference(valueStr, text);
  return null;
}

export type SnapshotLabObservationInput = {
  observation: {
    code?: string;
    name: string;
    value: string;
    unit?: string | null;
    referenceLow?: number | null;
    referenceHigh?: number | null;
    referenceText?: string | null;
    flag?: string | null;
    referenceSnapshot?: LabObservationReferenceSnapshot | null;
  };
  canonicalAnalyteId: string | null;
  canonicalAnalyteCode: string | null;
  resolved: ResolvedLabReferenceInterval;
  critical: ResolvedLabCriticalValue;
  /** When true, do not overwrite an existing locked snapshot. */
  preserveLocked?: boolean;
  now?: Date;
};

/**
 * Build observation fields for Result.resultData at verification/finalization.
 * Does not invent ranges when unresolved; preserves technician text if already present and unresolved.
 */
export function applyLabReferenceSnapshotToObservation(
  input: SnapshotLabObservationInput
): Record<string, unknown> {
  const obs = input.observation;
  const existing = obs.referenceSnapshot ?? null;
  if (input.preserveLocked && existing?.locked) {
    return { ...obs, referenceSnapshot: existing };
  }

  const refText =
    formatResolvedReferenceText(input.resolved) ??
    (typeof obs.referenceText === "string" && obs.referenceText.trim() ? obs.referenceText : null);

  const flagHL =
    input.resolved.authority === "UNRESOLVED"
      ? null
      : computeHLFromResolvedInterval(obs.value, input.resolved);

  const snapshot: LabObservationReferenceSnapshot = {
    canonicalAnalyteId: input.canonicalAnalyteId,
    canonicalAnalyteCode: input.canonicalAnalyteCode,
    loincCode: input.resolved.loincCode,
    intervalAuthority: input.resolved.authority,
    intervalId: input.resolved.intervalId,
    referenceLow: input.resolved.low,
    referenceHigh: input.resolved.high,
    referenceText: refText,
    unit: input.resolved.unit ?? obs.unit ?? null,
    flagHL,
    criticalStatus: input.critical.status,
    criticalPolicyId: input.critical.policyId,
    intervalSourceName: input.resolved.sourceName,
    intervalSourceIdentifier: input.resolved.sourceIdentifier,
    intervalSourceUrl: input.resolved.sourceUrl,
    intervalSourceVersion: input.resolved.sourceVersion,
    snapshottedAt: (input.now ?? new Date()).toISOString(),
    locked: true,
  };

  const nextFlag =
    input.critical.status === "CRITICAL_LOW"
      ? "CRITICAL_LOW"
      : input.critical.status === "CRITICAL_HIGH"
        ? "CRITICAL_HIGH"
        : input.critical.status === "CRITICAL"
          ? "CRITICAL"
          : flagHL === "L"
            ? "LOW"
            : flagHL === "H"
              ? "HIGH"
              : flagHL == null && input.resolved.authority !== "UNRESOLVED"
                ? "NORMAL"
                : obs.flag ?? null;

  return {
    ...obs,
    code: obs.code,
    name: obs.name,
    value: obs.value,
    unit: snapshot.unit ?? obs.unit ?? null,
    referenceLow: snapshot.referenceLow ?? obs.referenceLow ?? null,
    referenceHigh: snapshot.referenceHigh ?? obs.referenceHigh ?? null,
    referenceText: refText ?? obs.referenceText ?? null,
    flag: nextFlag,
    referenceSnapshot: snapshot,
  };
}
