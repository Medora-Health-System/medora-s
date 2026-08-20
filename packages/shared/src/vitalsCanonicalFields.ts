/**
 * Canonical enterprise vitals field projection.
 * Storage authority: bpSys/bpDia, hr, rr, tempC, spo2, painScore, heightCm, weightKg.
 * Readers must accept documented aliases; they must not invent a second vitals store.
 */

export type CanonicalVitalsMeasurements = {
  bpSys: number | null;
  bpDia: number | null;
  hr: number | null;
  rr: number | null;
  tempC: number | null;
  spo2: number | null;
  painScore: number | null;
  heightCm: number | null;
  weightKg: number | null;
};

function asRecord(vitals: unknown): Record<string, unknown> | null {
  if (vitals == null || typeof vitals !== "object" || Array.isArray(vitals)) return null;
  return vitals as Record<string, unknown>;
}

function numFrom(v: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const raw = v[key];
    if (raw == null || raw === "") continue;
    const n = typeof raw === "number" ? raw : Number(String(raw).trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseCombinedBp(raw: unknown): { sys: number; dia: number } | null {
  if (typeof raw !== "string") return null;
  const m = raw.trim().match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const sys = Number(m[1]);
  const dia = Number(m[2]);
  if (!Number.isFinite(sys) || !Number.isFinite(dia)) return null;
  return { sys, dia };
}

function painFromErBlob(v: Record<string, unknown>): number | null {
  const er = v.medoraErTriageV1 ?? v.erTriageV1;
  if (!er || typeof er !== "object" || Array.isArray(er)) return null;
  return numFrom(er as Record<string, unknown>, ["painScale0to10"]);
}

/** Read canonical measurements from any documented vitals JSON shape. */
export function readCanonicalVitalsMeasurements(vitals: unknown): CanonicalVitalsMeasurements {
  const empty: CanonicalVitalsMeasurements = {
    bpSys: null,
    bpDia: null,
    hr: null,
    rr: null,
    tempC: null,
    spo2: null,
    painScore: null,
    heightCm: null,
    weightKg: null,
  };
  const v = asRecord(vitals);
  if (!v) return empty;

  let bpSys = numFrom(v, ["bpSys", "systolicBp", "sbp", "systolic", "bpSystolic"]);
  let bpDia = numFrom(v, ["bpDia", "diastolicBp", "dbp", "diastolic", "bpDiastolic"]);
  if (bpSys == null || bpDia == null) {
    const combined = parseCombinedBp(v.bp ?? v.bloodPressure);
    if (combined) {
      bpSys = bpSys ?? combined.sys;
      bpDia = bpDia ?? combined.dia;
    }
  }

  return {
    bpSys,
    bpDia,
    hr: numFrom(v, ["hr", "heartRate", "pulse"]),
    rr: numFrom(v, ["rr", "respiratoryRate"]),
    tempC: numFrom(v, ["tempC", "temperatureC", "temperature", "temp"]),
    spo2: numFrom(v, ["spo2", "SpO2", "o2Sat", "oxygenSaturation"]),
    painScore: numFrom(v, ["painScore", "pain", "painLevel"]) ?? painFromErBlob(v),
    heightCm: numFrom(v, ["heightCm", "height"]),
    weightKg: numFrom(v, ["weightKg", "weight"]),
  };
}

export function canonicalVitalsHaveAnyMeasurement(m: CanonicalVitalsMeasurements): boolean {
  return Object.values(m).some((n) => n != null);
}
