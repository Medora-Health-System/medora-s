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

/**
 * Ligne compacte des derniers signes vitaux — libellés français uniquement.
 * TA, FC, température, SpO₂, fréquence respiratoire, poids, taille.
 */
export function formatVitalsHeaderLine(vitals: Record<string, number | string | null | undefined>): string {
  const parts: string[] = [];
  const sys = vitals.bpSys;
  const dia = vitals.bpDia;
  if (sys != null && sys !== "" && dia != null && dia !== "") {
    parts.push(`TA : ${sys}/${dia}`);
  }
  if (vitals.hr != null && vitals.hr !== "") parts.push(`FC : ${vitals.hr}/min`);
  if (vitals.tempC != null && vitals.tempC !== "") parts.push(`Température : ${vitals.tempC} °C`);
  if (vitals.spo2 != null && vitals.spo2 !== "") parts.push(`SpO₂ : ${vitals.spo2} %`);
  if (vitals.rr != null && vitals.rr !== "") parts.push(`FR : ${vitals.rr}/min`);
  if (vitals.weightKg != null && vitals.weightKg !== "") parts.push(`Poids : ${vitals.weightKg} kg`);
  if (vitals.heightCm != null && vitals.heightCm !== "") parts.push(`Taille : ${vitals.heightCm} cm`);
  return parts.length ? parts.join(" · ") : "";
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
