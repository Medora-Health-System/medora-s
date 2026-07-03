/**
 * Pure vitals projection helpers for EncounterClinicalRecord.
 */

import { buildClinicalRecordAttribution, type ClinicalRecordAttribution } from "./clinicalRecordAttribution.js";
import { MEDORA_ER_TRIAGE_V1_STORAGE_KEY } from "../encounter-allergy-safety.js";

function asTrimmed(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function readNestedName(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  return asTrimmed(o.name) ?? asTrimmed(o.displayName);
}

function readNestedRole(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  return asTrimmed(o.role) ?? asTrimmed(o.roleTitle);
}

/** Prefer rows with documented-by name, then role, then timestamp. */
export function clinicalRecordAttributionRichnessScore(
  attr: ClinicalRecordAttribution | null | undefined
): number {
  if (!attr) return 0;
  let score = 0;
  if (attr.name?.trim()) score += 4;
  if (attr.role?.trim()) score += 2;
  if (attr.initials?.trim()) score += 1;
  if (attr.at?.trim()) score += 1;
  return score;
}

export function resolveClinicalRecordVitalAttribution(input: ClinicalRecordVitalRowInput): {
  name: string | null;
  role: string | null;
} {
  const name =
    readNestedName(input.recordedBy) ??
    asTrimmed(input.recordedByDisplayName) ??
    asTrimmed(input.recordedByDisplay) ??
    readNestedName(input.createdByDisplay) ??
    asTrimmed(input.createdByDisplayName) ??
    asTrimmed(input.documentedByDisplayName);
  const role =
    readNestedRole(input.recordedBy) ??
    asTrimmed(input.recordedByRole) ??
    asTrimmed(input.roleTitle) ??
    readNestedRole(input.createdByDisplay) ??
    asTrimmed(input.createdByRole) ??
    asTrimmed(input.documentedByRole);
  return { name, role };
}

export type ClinicalRecordVitalRowInput = {
  id?: string;
  recordedAt?: string;
  source?: string | null;
  summary?: string;
  vitalsJson?: Record<string, unknown> | null;
  documentedByDisplayName?: string | null;
  documentedByRole?: string | null;
  recordedByDisplayName?: string | null;
  recordedByDisplay?: string | null;
  recordedByRole?: string | null;
  roleTitle?: string | null;
  createdByDisplayName?: string | null;
  createdByRole?: string | null;
  createdByDisplay?: { name?: string | null; role?: string | null } | null;
  recordedBy?: { displayName?: string | null; name?: string | null; role?: string | null; roleTitle?: string | null } | null;
};

export type ClinicalRecordVitalRowProjection = {
  id: string;
  recordedAt: string;
  source: string | null;
  summary: string;
  bloodPressure: string | null;
  heartRate: string | null;
  respiratoryRate: string | null;
  spo2: string | null;
  temperatureCelsius: string | null;
  weight: string | null;
  height: string | null;
  pain: string | null;
  documentedBy: ClinicalRecordAttribution;
};

function numOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

/** Resolve pain from top-level vitals keys or legacy `medoraErTriageV1.painScale0to10`. */
export function resolveVitalsPainScore(vitals: Record<string, unknown>): string | null {
  for (const key of ["painScore", "pain", "painLevel"] as const) {
    const trimmed = asTrimmed(vitals[key]);
    if (trimmed) return trimmed;
  }
  const painNum = numOrNull(vitals.painScore ?? vitals.pain);
  if (painNum != null) return String(Math.min(10, Math.max(0, Math.round(painNum))));

  const erRaw = vitals[MEDORA_ER_TRIAGE_V1_STORAGE_KEY];
  if (erRaw != null && typeof erRaw === "object" && !Array.isArray(erRaw)) {
    const legacy = (erRaw as { painScale0to10?: unknown }).painScale0to10;
    if (typeof legacy === "number" && Number.isFinite(legacy)) {
      return String(Math.min(10, Math.max(0, Math.round(legacy))));
    }
    const legacyStr = asTrimmed(legacy);
    if (legacyStr) return legacyStr;
  }
  return null;
}

export function parseVitalsJsonColumns(vitals: Record<string, unknown>): {
  bloodPressure: string | null;
  heartRate: string | null;
  respiratoryRate: string | null;
  spo2: string | null;
  temperatureCelsius: string | null;
  weight: string | null;
  height: string | null;
  pain: string | null;
} {
  const sys = numOrNull(vitals.bpSys);
  const dia = numOrNull(vitals.bpDia);
  const bloodPressure = sys != null && dia != null ? `${sys}/${dia}` : null;
  const heartRate = asTrimmed(vitals.hr);
  const respiratoryRate = asTrimmed(vitals.rr);
  const spo2 = asTrimmed(vitals.spo2);
  const temp = numOrNull(vitals.tempC);
  const temperatureCelsius = temp != null ? String(temp) : null;
  const weight = asTrimmed(vitals.weightKg ?? vitals.weight);
  const height = asTrimmed(vitals.heightCm ?? vitals.height);
  const pain = resolveVitalsPainScore(vitals);
  return { bloodPressure, heartRate, respiratoryRate, spo2, temperatureCelsius, weight, height, pain };
}

export function buildVitalSummaryFromColumns(columns: {
  bloodPressure: string | null;
  heartRate: string | null;
  respiratoryRate: string | null;
  spo2: string | null;
  temperatureCelsius: string | null;
  weight: string | null;
  height: string | null;
  pain: string | null;
}): string {
  const parts: string[] = [];
  if (columns.bloodPressure) parts.push(`BP ${columns.bloodPressure}`);
  if (columns.heartRate) parts.push(`HR ${columns.heartRate}`);
  if (columns.respiratoryRate) parts.push(`RR ${columns.respiratoryRate}`);
  if (columns.spo2) parts.push(`SpO2 ${columns.spo2}%`);
  if (columns.temperatureCelsius) parts.push(`Temp ${columns.temperatureCelsius}°C`);
  if (columns.weight) parts.push(`Weight ${columns.weight}`);
  if (columns.height) parts.push(`Height ${columns.height}`);
  if (columns.pain) parts.push(`Pain ${columns.pain}`);
  return parts.join(" · ");
}

export function projectClinicalRecordVitalRow(
  input: ClinicalRecordVitalRowInput,
  index: number
): ClinicalRecordVitalRowProjection | null {
  const recordedAt = asTrimmed(input.recordedAt);
  if (!recordedAt) return null;

  const vitals =
    input.vitalsJson && typeof input.vitalsJson === "object" && !Array.isArray(input.vitalsJson)
      ? input.vitalsJson
      : {};
  const columns = parseVitalsJsonColumns(vitals);
  const summary = asTrimmed(input.summary) ?? buildVitalSummaryFromColumns(columns);
  if (!summary) return null;

  const attribution = resolveClinicalRecordVitalAttribution(input);

  return {
    id: asTrimmed(input.id) ?? `vital-${index}`,
    recordedAt,
    source: asTrimmed(input.source),
    summary,
    ...columns,
    documentedBy: buildClinicalRecordAttribution({
      name: attribution.name,
      role: attribution.role,
      at: recordedAt,
    }),
  };
}

function mergeClinicalRecordVitalRows(
  keep: ClinicalRecordVitalRowProjection,
  candidate: ClinicalRecordVitalRowProjection
): ClinicalRecordVitalRowProjection {
  const keepScore = clinicalRecordAttributionRichnessScore(keep.documentedBy);
  const candidateScore = clinicalRecordAttributionRichnessScore(candidate.documentedBy);
  if (candidateScore > keepScore) return candidate;
  if (candidateScore < keepScore) return keep;
  if (parseTime(candidate.recordedAt) > parseTime(keep.recordedAt)) return candidate;
  return keep;
}

function parseTime(iso: string | null | undefined): number {
  if (!iso?.trim()) return 0;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

export function dedupeClinicalRecordVitalRows(
  rows: ClinicalRecordVitalRowProjection[]
): ClinicalRecordVitalRowProjection[] {
  const byKey = new Map<string, ClinicalRecordVitalRowProjection>();
  for (const row of rows) {
    const key = `${row.recordedAt}:${row.summary}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }
    byKey.set(key, mergeClinicalRecordVitalRows(existing, row));
  }
  return [...byKey.values()].sort((a, b) => parseTime(a.recordedAt) - parseTime(b.recordedAt));
}
