/**
 * Authoritative predicate: a vitals payload is a clinical measurement (not context-only).
 * Oxygen device, temperature site, notes, and recordingContext alone do not qualify.
 */

const CLINICAL_MEASUREMENT_KEYS = [
  "tempC",
  "temperatureC",
  "temperature",
  "hr",
  "heartRate",
  "pulse",
  "rr",
  "respiratoryRate",
  "bpSys",
  "systolicBp",
  "sbp",
  "bpDia",
  "diastolicBp",
  "dbp",
  "spo2",
  "SpO2",
  "weightKg",
  "weight",
  "heightCm",
  "height",
  "painScore",
  "pain",
  "painLevel",
] as const;

function isPresentMeasurementValue(raw: unknown): boolean {
  if (raw == null || raw === "") return false;
  if (typeof raw === "number") return Number.isFinite(raw); // includes pain 0
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return false;
    const n = Number(t);
    if (t === "0" || n === 0) return true; // pain 0
    if (Number.isFinite(n)) return true;
    return true; // non-numeric non-empty string (rare)
  }
  return false;
}

function painFromErBlob(vitals: Record<string, unknown>): boolean {
  const er = vitals.medoraErTriageV1 ?? vitals.erTriageV1;
  if (!er || typeof er !== "object" || Array.isArray(er)) return false;
  return isPresentMeasurementValue((er as Record<string, unknown>).painScale0to10);
}

/** True when at least one clinical vital measurement is present. */
export function hasMeaningfulVitalMeasurement(vitals: unknown): boolean {
  if (vitals == null || typeof vitals !== "object" || Array.isArray(vitals)) return false;
  const v = vitals as Record<string, unknown>;
  for (const key of CLINICAL_MEASUREMENT_KEYS) {
    if (isPresentMeasurementValue(v[key])) return true;
  }
  if (painFromErBlob(v)) return true;
  return false;
}

export type MeaningfulVitalsReadingCandidate<T> = T & {
  status?: string | null;
  measuredAt?: string | Date | null;
  recordedAt?: string | Date | null;
  vitalsJson?: unknown;
};

function timeMs(value: string | Date | null | undefined): number {
  if (value == null) return Number.NEGATIVE_INFINITY;
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY;
}

/**
 * Newest ACTIVE meaningful reading. Deterministic: measuredAt DESC, recordedAt DESC.
 */
export function resolveLatestMeaningfulVitalsReading<T extends MeaningfulVitalsReadingCandidate<unknown>>(
  candidates: T[],
  opts?: { nowMs?: number; maxFutureSkewMs?: number }
): T | null {
  const now = opts?.nowMs ?? Date.now();
  const skew = opts?.maxFutureSkewMs ?? 5 * 60 * 1000;
  const eligible = candidates.filter((c) => {
    if (c.status != null && String(c.status).toUpperCase() === "VOIDED") return false;
    if (!hasMeaningfulVitalMeasurement(c.vitalsJson)) return false;
    const measured = timeMs(c.measuredAt ?? null);
    if (measured > now + skew) return false;
    return true;
  });
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => {
    const am = timeMs(a.measuredAt ?? null);
    const bm = timeMs(b.measuredAt ?? null);
    if (bm !== am) return bm - am;
    const ar = timeMs(a.recordedAt ?? null);
    const br = timeMs(b.recordedAt ?? null);
    return br - ar;
  });
  return eligible[0] ?? null;
}
