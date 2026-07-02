/**
 * Pure vitals projection helpers for EncounterClinicalRecord.
 */

import { buildClinicalRecordAttribution, type ClinicalRecordAttribution } from "./clinicalRecordAttribution.js";
import { MEDORA_ER_TRIAGE_V1_STORAGE_KEY } from "../encounter-allergy-safety.js";

export type ClinicalRecordVitalRowInput = {
  id?: string;
  recordedAt?: string;
  source?: string | null;
  summary?: string;
  vitalsJson?: Record<string, unknown> | null;
  documentedByDisplayName?: string | null;
  documentedByRole?: string | null;
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
  pain: string | null;
  documentedBy: ClinicalRecordAttribution;
};

function asTrimmed(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

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
  const pain = resolveVitalsPainScore(vitals);
  return { bloodPressure, heartRate, respiratoryRate, spo2, temperatureCelsius, pain };
}

export function buildVitalSummaryFromColumns(columns: {
  bloodPressure: string | null;
  heartRate: string | null;
  respiratoryRate: string | null;
  spo2: string | null;
  temperatureCelsius: string | null;
  pain: string | null;
}): string {
  const parts: string[] = [];
  if (columns.bloodPressure) parts.push(`BP ${columns.bloodPressure}`);
  if (columns.heartRate) parts.push(`HR ${columns.heartRate}`);
  if (columns.respiratoryRate) parts.push(`RR ${columns.respiratoryRate}`);
  if (columns.spo2) parts.push(`SpO2 ${columns.spo2}%`);
  if (columns.temperatureCelsius) parts.push(`Temp ${columns.temperatureCelsius}°C`);
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

  return {
    id: asTrimmed(input.id) ?? `vital-${index}`,
    recordedAt,
    source: asTrimmed(input.source),
    summary,
    ...columns,
    documentedBy: buildClinicalRecordAttribution({
      name: input.documentedByDisplayName,
      role: input.documentedByRole,
      at: recordedAt,
    }),
  };
}

export function dedupeClinicalRecordVitalRows(
  rows: ClinicalRecordVitalRowProjection[]
): ClinicalRecordVitalRowProjection[] {
  const seen = new Set<string>();
  const out: ClinicalRecordVitalRowProjection[] = [];
  for (const row of rows) {
    const key = `${row.recordedAt}:${row.summary}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out.sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
}
