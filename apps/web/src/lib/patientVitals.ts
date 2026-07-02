import type { SupportedLanguage } from "@/i18n/config";
import { celsiusToFahrenheit, cmToFeetInches, kgToPounds } from "@medora/shared";

/** Dispatched after encounter triage vitals save (detail: { patientId, supersededSnapshot? }). */
export const MEDORA_PATIENT_VITALS_UPDATED = "medora:patient-vitals-updated";

export type PatientTriageVitalsSnapshot = {
  encounterId: string;
  encounterType: string;
  triageId: string;
  updatedAt: string;
  triageCompleteAt: string | null;
  vitalsJson: Record<string, unknown>;
};

export type PatientTriageVitalsResponse = {
  latest: PatientTriageVitalsSnapshot | null;
  history: PatientTriageVitalsSnapshot[];
};

/** Repli hors ligne / si GET /patients/:id/triage échoue : reconstruit une timeline depuis le chart-summary (triage par consultation + dernier relevé patient). */
export function vitalsTimelineFallbackFromChartSummary(args: {
  patientId: string;
  recentEncounters: Array<{
    id: string;
    type: string;
    createdAt: string;
    triage: {
      vitalsJson: Record<string, unknown> | null;
      triageCompleteAt: string | null;
    } | null;
  }>;
  latestVitalsJson?: unknown;
  latestVitalsAt?: string | null;
}): PatientTriageVitalsResponse {
  const { patientId, recentEncounters, latestVitalsJson, latestVitalsAt } = args;
  const snaps: PatientTriageVitalsSnapshot[] = [];
  const sortedEnc = [...recentEncounters].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  for (const e of sortedEnc) {
    const t = e.triage;
    if (!t || !hasVitalsJson(t.vitalsJson)) continue;
    const measured = t.triageCompleteAt || e.createdAt;
    snaps.push({
      encounterId: e.id,
      encounterType: e.type,
      triageId: `chart:${e.id}`,
      updatedAt: measured,
      triageCompleteAt: t.triageCompleteAt,
      vitalsJson: (t.vitalsJson ?? {}) as Record<string, unknown>,
    });
  }
  if (hasVitalsJson(latestVitalsJson)) {
    const enc = sortedEnc[0];
    const at = latestVitalsAt || enc?.createdAt || new Date().toISOString();
    snaps.push({
      encounterId: enc?.id ?? patientId,
      encounterType: enc?.type ?? "PATIENT",
      triageId: "patient:latestVitalsJson",
      updatedAt: at,
      triageCompleteAt: null,
      vitalsJson: latestVitalsJson as Record<string, unknown>,
    });
  }
  const seen = new Set<string>();
  const dedup: PatientTriageVitalsSnapshot[] = [];
  for (const s of snaps.sort((a, b) => vitalsSnapshotMeasuredAtMs(b) - vitalsSnapshotMeasuredAtMs(a))) {
    const k = snapshotKey(s);
    if (seen.has(k)) continue;
    seen.add(k);
    dedup.push(s);
  }
  return { latest: dedup[0] ?? null, history: dedup.slice(1) };
}

export function hasVitalsJson(vitalsJson: unknown): boolean {
  if (vitalsJson == null || typeof vitalsJson !== "object" || Array.isArray(vitalsJson)) return false;
  return Object.keys(vitalsJson as object).length > 0;
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

/** Dual °F / °C from stored canonical °C (product: EN US-first, FR metric-first). */
export function formatTemperatureDualLine(tempC: number, language: SupportedLanguage): string {
  const f = celsiusToFahrenheit(tempC);
  const fStr = `${f.toFixed(1)}°F`;
  const cStr = `${tempC.toFixed(1)}°C`;
  return language === "en" ? `${fStr} / ${cStr}` : `${cStr} / ${fStr}`;
}

export function formatWeightDualLine(weightKg: number, language: SupportedLanguage): string {
  const lb = kgToPounds(weightKg);
  const lbStr = `${lb.toFixed(1)} lb`;
  const kgStr = `${weightKg.toFixed(1)} kg`;
  return language === "en" ? `${lbStr} / ${kgStr}` : `${kgStr} / ${lbStr}`;
}

export function formatHeightDualLine(heightCm: number, language: SupportedLanguage): string {
  const { feet, inches } = cmToFeetInches(heightCm);
  const ftStr = `${feet} ft ${inches} in`;
  const cmStr = `${Math.round(heightCm)} cm`;
  return language === "en" ? `${ftStr} / ${cmStr}` : `${cmStr} / ${ftStr}`;
}

/**
 * Compact vitals one-liner — locale-aware labels (US clinical English vs FR product copy).
 */
export function formatVitalsHeaderLineForLocale(
  vitals: Record<string, number | string | null | undefined>,
  language: SupportedLanguage
): string {
  const painScore = resolveVitalsPainScoreFromRecord(vitals);
  if (language === "en") {
    const parts: string[] = [];
    const sys = vitals.bpSys;
    const dia = vitals.bpDia;
    if (sys != null && sys !== "" && dia != null && dia !== "") {
      parts.push(`BP ${sys}/${dia}`);
    }
    if (vitals.hr != null && vitals.hr !== "") parts.push(`HR ${vitals.hr}/min`);
    const tc = numOrNull(vitals.tempC);
    if (tc != null) parts.push(`Temp ${formatTemperatureDualLine(tc, language)}`);
    if (vitals.spo2 != null && vitals.spo2 !== "") parts.push(`SpO2 ${vitals.spo2}%`);
    if (vitals.rr != null && vitals.rr !== "") parts.push(`RR ${vitals.rr}/min`);
    const wk = numOrNull(vitals.weightKg);
    if (wk != null) parts.push(`Wt ${formatWeightDualLine(wk, language)}`);
    const hc = numOrNull(vitals.heightCm);
    if (hc != null) parts.push(`Ht ${formatHeightDualLine(hc, language)}`);
    if (painScore != null) parts.push(`Pain ${painScore}/10`);
    return parts.length ? parts.join(" · ") : "";
  }
  const parts: string[] = [];
  const sys = vitals.bpSys;
  const dia = vitals.bpDia;
  if (sys != null && sys !== "" && dia != null && dia !== "") {
    parts.push(`TA : ${sys}/${dia}`);
  }
  if (vitals.hr != null && vitals.hr !== "") parts.push(`FC : ${vitals.hr}/min`);
  const tcFr = numOrNull(vitals.tempC);
  if (tcFr != null) parts.push(`Température : ${formatTemperatureDualLine(tcFr, language)}`);
  if (vitals.spo2 != null && vitals.spo2 !== "") parts.push(`SpO₂ : ${vitals.spo2} %`);
  if (vitals.rr != null && vitals.rr !== "") parts.push(`FR : ${vitals.rr}/min`);
  const wkFr = numOrNull(vitals.weightKg);
  if (wkFr != null) parts.push(`Poids : ${formatWeightDualLine(wkFr, language)}`);
  const hcFr = numOrNull(vitals.heightCm);
  if (hcFr != null) parts.push(`Taille : ${formatHeightDualLine(hcFr, language)}`);
  if (painScore != null) parts.push(`Douleur : ${painScore}/10`);
  return parts.length ? parts.join(" · ") : "";
}

function resolveVitalsPainScoreFromRecord(
  vitals: Record<string, number | string | null | undefined>
): string | null {
  for (const key of ["painScore", "pain", "painLevel"] as const) {
    const raw = vitals[key];
    if (raw == null || raw === "") continue;
    const trimmed = String(raw).trim();
    if (trimmed) return trimmed;
  }
  const nested = vitals.medoraErTriageV1;
  if (nested != null && typeof nested === "object" && !Array.isArray(nested)) {
    const legacy = (nested as { painScale0to10?: unknown }).painScale0to10;
    if (typeof legacy === "number" && Number.isFinite(legacy)) {
      return String(Math.min(10, Math.max(0, Math.round(legacy))));
    }
    if (typeof legacy === "string" && legacy.trim()) return legacy.trim();
  }
  return null;
}

export function formatVitalsHeaderLine(vitals: Record<string, number | string | null | undefined>): string {
  return formatVitalsHeaderLineForLocale(vitals, "fr");
}

/**
 * Compact one-line vitals for timelines (coerces JSON vitals; includes pain when recorded).
 */
export function formatEncounterVitalsHistoryCompactLine(
  vitals: Record<string, unknown>,
  language: SupportedLanguage
): string {
  return formatVitalsHeaderLineForLocale(
    vitals as Record<string, number | string | null | undefined>,
    language
  );
}

/** True when the GET /patients/:id/triage payload already carries at least one row (latest ou historique). */
export function hasServerVitalsTimelineData(vitalsTimeline: PatientTriageVitalsResponse | null): boolean {
  if (vitalsTimeline == null) return false;
  return Boolean(vitalsTimeline.latest) || (vitalsTimeline.history?.length ?? 0) > 0;
}

/** Historique complet trié du plus récent au plus ancien (la ligne « latest » de l’API est réinjectée en tête si absente). */
export function buildVitalsTimelineNewestFirst(
  latest: PatientTriageVitalsSnapshot | null | undefined,
  history: PatientTriageVitalsSnapshot[],
  superseded: PatientTriageVitalsSnapshot[]
): PatientTriageVitalsSnapshot[] {
  const merged = mergeVitalsHistory(history, superseded);
  if (!latest || !hasVitalsJson(latest.vitalsJson)) {
    return merged;
  }
  const lk = snapshotKey(latest);
  const withoutDup = merged.filter((r) => snapshotKey(r) !== lk);
  const all = [latest, ...withoutDup];
  all.sort((a, b) => vitalsSnapshotMeasuredAtMs(b) - vitalsSnapshotMeasuredAtMs(a));
  return all;
}

/** Horodatage de mesure pour tri (préfère fin de triage si connue). */
export function vitalsSnapshotMeasuredAtMs(s: Pick<PatientTriageVitalsSnapshot, "triageCompleteAt" | "updatedAt">): number {
  const raw = s.triageCompleteAt ?? s.updatedAt;
  return new Date(raw).getTime();
}

export function snapshotKey(s: Pick<PatientTriageVitalsSnapshot, "triageId" | "updatedAt">): string {
  return `${s.triageId}:${s.updatedAt}`;
}

export function mergeVitalsHistory(
  serverHistory: PatientTriageVitalsSnapshot[],
  localSuperseded: PatientTriageVitalsSnapshot[]
): PatientTriageVitalsSnapshot[] {
  const seen = new Set<string>();
  const merged: PatientTriageVitalsSnapshot[] = [];
  for (const row of [...localSuperseded, ...serverHistory]) {
    const k = snapshotKey(row);
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(row);
  }
  merged.sort((a, b) => vitalsSnapshotMeasuredAtMs(b) - vitalsSnapshotMeasuredAtMs(a));
  return merged;
}
