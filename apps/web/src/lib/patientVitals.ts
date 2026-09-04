import {
  celsiusToFahrenheit,
  cmToFeetInches,
  hasMeaningfulVitalMeasurement,
  kgToPounds,
  readCanonicalVitalsMeasurements,
  resolveLatestMeaningfulVitalsReading,
} from "@medora/shared";
import { pickProductUiCopy } from "@/i18n/config";

export { hasMeaningfulVitalMeasurement, resolveLatestMeaningfulVitalsReading };

/** Dispatched after encounter triage vitals save (detail: { patientId, supersededSnapshot? }). */
export const MEDORA_PATIENT_VITALS_UPDATED = "medora:patient-vitals-updated";

export type PatientTriageVitalsSnapshot = {
  encounterId: string;
  encounterType: string;
  triageId: string;
  updatedAt: string;
  triageCompleteAt: string | null;
  vitalsJson: Record<string, unknown>;
  readingId?: string;
  measuredAt?: string;
  recordedAt?: string;
  status?: "ACTIVE" | "VOIDED";
  recordedByUserId?: string | null;
  recordedByDisplayName?: string | null;
  recordedByInitials?: string | null;
  recordedByRole?: string | null;
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
    if (!t || !hasMeaningfulVitalMeasurement(t.vitalsJson)) continue;
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
  if (hasMeaningfulVitalMeasurement(latestVitalsJson)) {
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
  const latest = pickLatestMeaningfulVitalsSnapshot(dedup);
  const history = dedup.filter((s) => !latest || snapshotKey(s) !== snapshotKey(latest));
  return { latest, history };
}

/** Any non-empty vitals JSON object (may be context-only). Prefer hasMeaningfulVitalMeasurement for clinical latest. */
export function hasVitalsJson(vitalsJson: unknown): boolean {
  if (vitalsJson == null || typeof vitalsJson !== "object" || Array.isArray(vitalsJson)) return false;
  return Object.keys(vitalsJson as object).length > 0;
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

/** Dual °F / °C from stored canonical °C. EN US-first; FR and ES independently metric-first. */
export function formatTemperatureDualLine(tempC: number, language: string): string {
  const f = celsiusToFahrenheit(tempC);
  const fStr = `${f.toFixed(1)}°F`;
  const cStr = `${tempC.toFixed(1)}°C`;
  const usFirst = `${fStr} / ${cStr}`;
  const metricFirst = `${cStr} / ${fStr}`;
  return pickProductUiCopy(language, { en: usFirst, fr: metricFirst, es: metricFirst }, metricFirst);
}

export function formatWeightDualLine(weightKg: number, language: string): string {
  const lb = kgToPounds(weightKg);
  const lbStr = `${lb.toFixed(1)} lb`;
  const kgStr = `${weightKg.toFixed(1)} kg`;
  const usFirst = `${lbStr} / ${kgStr}`;
  const metricFirst = `${kgStr} / ${lbStr}`;
  return pickProductUiCopy(language, { en: usFirst, fr: metricFirst, es: metricFirst }, metricFirst);
}

export function formatHeightDualLine(heightCm: number, language: string): string {
  const { feet, inches } = cmToFeetInches(heightCm);
  const ftStr = `${feet} ft ${inches} in`;
  const cmStr = `${Math.round(heightCm)} cm`;
  const usFirst = `${ftStr} / ${cmStr}`;
  const metricFirst = `${cmStr} / ${ftStr}`;
  return pickProductUiCopy(language, { en: usFirst, fr: metricFirst, es: metricFirst }, metricFirst);
}

/**
 * Compact vitals one-liner — locale-aware labels (US clinical English vs FR product copy).
 */
export function formatVitalsHeaderLineForLocale(
  vitals: Record<string, number | string | null | undefined>,
  language: string
): string {
  const c = readCanonicalVitalsMeasurements(vitals);
  const painScore = c.painScore;
  const labels = pickProductUiCopy(
    language,
    {
      en: {
        bp: (sys: number, dia: number) => `BP ${sys}/${dia} mmHg`,
        hr: (n: number) => `HR ${n}/min`,
        temp: (line: string) => `Temp ${line}`,
        spo2: (n: number) => `SpO2 ${n}%`,
        rr: (n: number) => `RR ${n}/min`,
        wt: (line: string) => `Wt ${line}`,
        ht: (line: string) => `Ht ${line}`,
        pain: (n: number | string) => `Pain ${n}/10`,
      },
      fr: {
        bp: (sys: number, dia: number) => `TA : ${sys}/${dia} mmHg`,
        hr: (n: number) => `FC : ${n}/min`,
        temp: (line: string) => `Température : ${line}`,
        spo2: (n: number) => `SpO₂ : ${n} %`,
        rr: (n: number) => `FR : ${n}/min`,
        wt: (line: string) => `Poids : ${line}`,
        ht: (line: string) => `Taille : ${line}`,
        pain: (n: number | string) => `Douleur : ${n}/10`,
      },
      es: {
        bp: (sys: number, dia: number) => `PA ${sys}/${dia} mmHg`,
        hr: (n: number) => `FC ${n}/min`,
        temp: (line: string) => `Temp. ${line}`,
        spo2: (n: number) => `SpO2 ${n}%`,
        rr: (n: number) => `FR ${n}/min`,
        wt: (line: string) => `Peso ${line}`,
        ht: (line: string) => `Talla ${line}`,
        pain: (n: number | string) => `Dolor ${n}/10`,
      },
    },
    {
      bp: (sys: number, dia: number) => `PA ${sys}/${dia} mmHg`,
      hr: (n: number) => `FC ${n}/min`,
      temp: (line: string) => `Temp. ${line}`,
      spo2: (n: number) => `SpO2 ${n}%`,
      rr: (n: number) => `FR ${n}/min`,
      wt: (line: string) => `Peso ${line}`,
      ht: (line: string) => `Talla ${line}`,
      pain: (n: number | string) => `Dolor ${n}/10`,
    }
  );
  const parts: string[] = [];
  if (c.bpSys != null && c.bpDia != null) parts.push(labels.bp(c.bpSys, c.bpDia));
  if (c.hr != null) parts.push(labels.hr(c.hr));
  if (c.tempC != null) parts.push(labels.temp(formatTemperatureDualLine(c.tempC, language)));
  if (c.spo2 != null) parts.push(labels.spo2(c.spo2));
  if (c.rr != null) parts.push(labels.rr(c.rr));
  if (c.weightKg != null) parts.push(labels.wt(formatWeightDualLine(c.weightKg, language)));
  if (c.heightCm != null) parts.push(labels.ht(formatHeightDualLine(c.heightCm, language)));
  if (painScore != null) parts.push(labels.pain(painScore));
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
  language: string
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

/** Newest ACTIVE meaningful reading from a newest-first (or unsorted) timeline. */
export function pickLatestMeaningfulVitalsSnapshot(
  snapshots: PatientTriageVitalsSnapshot[]
): PatientTriageVitalsSnapshot | null {
  return resolveLatestMeaningfulVitalsReading(
    snapshots.map((s) => ({
      ...s,
      status: s.status,
      measuredAt: s.measuredAt ?? s.updatedAt,
      recordedAt: s.recordedAt,
      vitalsJson: s.vitalsJson,
    }))
  );
}

/** Horodatage de mesure pour tri — prefers measuredAt, then triageCompleteAt, then updatedAt. */
export function vitalsSnapshotMeasuredAtMs(
  s: Pick<PatientTriageVitalsSnapshot, "measuredAt" | "triageCompleteAt" | "updatedAt" | "recordedAt">
): number {
  const raw = s.measuredAt ?? s.triageCompleteAt ?? s.updatedAt ?? s.recordedAt;
  return new Date(raw).getTime();
}

export function snapshotKey(
  s: Pick<PatientTriageVitalsSnapshot, "readingId" | "triageId" | "updatedAt" | "measuredAt">
): string {
  if (s.readingId) return `reading:${s.readingId}`;
  return `${s.triageId}:${s.measuredAt ?? s.updatedAt}`;
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
