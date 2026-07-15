/**
 * Nursing discharge vitals association + governed exceptions.
 * Additive under nursingAssessment.erDispositionExecutionV1 — no Prisma migration.
 */

export const NURSING_DISCHARGE_VITALS_RECENT_MS = 60 * 60 * 1000; // 60 minutes

export const NURSING_DISCHARGE_VITALS_EXCEPTION_REASONS = [
  "PATIENT_REFUSED",
  "LEFT_BEFORE_COMPLETION",
  "ELOPEMENT_LWBS",
  "AGAINST_MEDICAL_ADVICE",
  "IMMEDIATE_TRANSFER",
  "CLINICAL_EMERGENCY_TRANSFER",
  "DECEASED",
  "UNABLE_RELIABLE_MEASUREMENT",
  "EQUIPMENT_UNAVAILABLE",
  "OTHER",
] as const;

export type NursingDischargeVitalsExceptionReason =
  (typeof NURSING_DISCHARGE_VITALS_EXCEPTION_REASONS)[number];

/** Display snapshot for Summary/print — does not replace TriageVitalsReading. */
export type NursingDischargeVitalsSnapshot = {
  bp?: string;
  hr?: string;
  rr?: string;
  temp?: string;
  tempSite?: string;
  spo2?: string;
  oxygen?: string;
  pain?: string;
  measuredAt?: string;
  enteredBy?: string;
};

export type NursingDischargeVitalsAssociation = {
  dischargeVitalReadingId?: string;
  dischargeVitalsSelectedFromExisting?: boolean;
  dischargeVitalsConfirmedByDisplayName?: string;
  dischargeVitalsConfirmedAt?: string;
  dischargeVitalsSnapshot?: NursingDischargeVitalsSnapshot;
  dischargeVitalsExceptionReason?: NursingDischargeVitalsExceptionReason;
  dischargeVitalsExceptionNote?: string;
  dischargeVitalsExceptionByDisplayName?: string;
  dischargeVitalsExceptionAt?: string;
};

function strField(v: unknown): string | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
}

/** Build a durable display snapshot from vitalsJson + attribution. */
export function buildNursingDischargeVitalsSnapshot(opts: {
  vitalsJson: unknown;
  measuredAt?: string | null;
  enteredBy?: string | null;
}): NursingDischargeVitalsSnapshot {
  const snap: NursingDischargeVitalsSnapshot = {};
  const v =
    opts.vitalsJson && typeof opts.vitalsJson === "object" && !Array.isArray(opts.vitalsJson)
      ? (opts.vitalsJson as Record<string, unknown>)
      : {};
  const sys = strField(v.bpSys ?? v.systolicBp ?? v.sbp);
  const dia = strField(v.bpDia ?? v.diastolicBp ?? v.dbp);
  if (sys && dia) snap.bp = `${sys}/${dia}`;
  else if (sys) snap.bp = sys;
  snap.hr = strField(v.hr ?? v.heartRate ?? v.pulse);
  snap.rr = strField(v.rr ?? v.respiratoryRate);
  const temp = strField(v.tempC ?? v.temperatureC ?? v.temperature);
  if (temp) snap.temp = temp.includes("°") ? temp : `${temp} °C`;
  snap.tempSite = strField(v.temperatureSite ?? v.tempSite);
  snap.spo2 = strField(v.spo2 ?? v.SpO2);
  const o2dev = strField(v.oxygenDevice);
  const flow = strField(v.oxygenFlowLpm ?? v.oxygenFlow);
  const fio2 = strField(v.oxygenFiO2Percent ?? v.fio2);
  const o2bits = [o2dev, flow ? `${flow} L/min` : undefined, fio2 ? `FiO₂ ${fio2}%` : undefined].filter(
    Boolean
  );
  if (o2bits.length) snap.oxygen = o2bits.join(" · ");
  const pain =
    strField(v.painScore) ??
    strField(
      v.erTriageV1 && typeof v.erTriageV1 === "object"
        ? (v.erTriageV1 as Record<string, unknown>).painScale0to10
        : undefined
    );
  if (pain) snap.pain = pain;
  if (opts.measuredAt?.trim()) snap.measuredAt = opts.measuredAt.trim();
  if (opts.enteredBy?.trim()) snap.enteredBy = opts.enteredBy.trim();
  return snap;
}

export function isNursingDischargeVitalsExceptionReason(
  value: unknown
): value is NursingDischargeVitalsExceptionReason {
  return (
    typeof value === "string" &&
    (NURSING_DISCHARGE_VITALS_EXCEPTION_REASONS as readonly string[]).includes(value)
  );
}

export function readNursingDischargeVitalsAssociation(
  nursingAssessment: unknown
): NursingDischargeVitalsAssociation {
  const out: NursingDischargeVitalsAssociation = {};
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) {
    return out;
  }
  const raw = (nursingAssessment as Record<string, unknown>).erDispositionExecutionV1;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const o = raw as Record<string, unknown>;

  if (typeof o.dischargeVitalReadingId === "string" && o.dischargeVitalReadingId.trim()) {
    out.dischargeVitalReadingId = o.dischargeVitalReadingId.trim();
  }
  if (o.dischargeVitalsSelectedFromExisting === true) {
    out.dischargeVitalsSelectedFromExisting = true;
  }
  if (typeof o.dischargeVitalsConfirmedByDisplayName === "string" && o.dischargeVitalsConfirmedByDisplayName.trim()) {
    out.dischargeVitalsConfirmedByDisplayName = o.dischargeVitalsConfirmedByDisplayName.trim();
  }
  if (typeof o.dischargeVitalsConfirmedAt === "string" && o.dischargeVitalsConfirmedAt.trim()) {
    out.dischargeVitalsConfirmedAt = o.dischargeVitalsConfirmedAt.trim();
  }
  if (o.dischargeVitalsSnapshot && typeof o.dischargeVitalsSnapshot === "object" && !Array.isArray(o.dischargeVitalsSnapshot)) {
    const s = o.dischargeVitalsSnapshot as Record<string, unknown>;
    out.dischargeVitalsSnapshot = {
      bp: strField(s.bp),
      hr: strField(s.hr),
      rr: strField(s.rr),
      temp: strField(s.temp),
      tempSite: strField(s.tempSite),
      spo2: strField(s.spo2),
      oxygen: strField(s.oxygen),
      pain: strField(s.pain),
      measuredAt: strField(s.measuredAt),
      enteredBy: strField(s.enteredBy),
    };
  }
  if (isNursingDischargeVitalsExceptionReason(o.dischargeVitalsExceptionReason)) {
    out.dischargeVitalsExceptionReason = o.dischargeVitalsExceptionReason;
  }
  if (typeof o.dischargeVitalsExceptionNote === "string" && o.dischargeVitalsExceptionNote.trim()) {
    out.dischargeVitalsExceptionNote = o.dischargeVitalsExceptionNote.trim().slice(0, 500);
  }
  if (
    typeof o.dischargeVitalsExceptionByDisplayName === "string" &&
    o.dischargeVitalsExceptionByDisplayName.trim()
  ) {
    out.dischargeVitalsExceptionByDisplayName = o.dischargeVitalsExceptionByDisplayName.trim();
  }
  if (typeof o.dischargeVitalsExceptionAt === "string" && o.dischargeVitalsExceptionAt.trim()) {
    out.dischargeVitalsExceptionAt = o.dischargeVitalsExceptionAt.trim();
  }
  return out;
}

export function mergeNursingDischargeVitalsAssociationIntoNursingAssessment(
  previousNursingAssessment: unknown,
  association: NursingDischargeVitalsAssociation
): Record<string, unknown> {
  const base =
    previousNursingAssessment &&
    typeof previousNursingAssessment === "object" &&
    !Array.isArray(previousNursingAssessment)
      ? { ...(previousNursingAssessment as Record<string, unknown>) }
      : {};
  const prevExec =
    base.erDispositionExecutionV1 &&
    typeof base.erDispositionExecutionV1 === "object" &&
    !Array.isArray(base.erDispositionExecutionV1)
      ? { ...(base.erDispositionExecutionV1 as Record<string, unknown>) }
      : {};

  const next = { ...prevExec };

  if (association.dischargeVitalReadingId) {
    next.dischargeVitalReadingId = association.dischargeVitalReadingId;
    delete next.dischargeVitalsExceptionReason;
    delete next.dischargeVitalsExceptionNote;
    delete next.dischargeVitalsExceptionByDisplayName;
    delete next.dischargeVitalsExceptionAt;
  } else {
    delete next.dischargeVitalReadingId;
  }

  if (association.dischargeVitalsSelectedFromExisting === true) {
    next.dischargeVitalsSelectedFromExisting = true;
  } else if (association.dischargeVitalReadingId) {
    next.dischargeVitalsSelectedFromExisting = false;
  }

  if (association.dischargeVitalsConfirmedByDisplayName) {
    next.dischargeVitalsConfirmedByDisplayName = association.dischargeVitalsConfirmedByDisplayName;
  }
  if (association.dischargeVitalsConfirmedAt) {
    next.dischargeVitalsConfirmedAt = association.dischargeVitalsConfirmedAt;
  }
  if (association.dischargeVitalsSnapshot) {
    next.dischargeVitalsSnapshot = association.dischargeVitalsSnapshot;
  } else if (association.dischargeVitalReadingId) {
    // keep prior snapshot if not re-supplied
  }

  if (association.dischargeVitalsExceptionReason) {
    next.dischargeVitalsExceptionReason = association.dischargeVitalsExceptionReason;
    delete next.dischargeVitalReadingId;
    delete next.dischargeVitalsSelectedFromExisting;
    delete next.dischargeVitalsSnapshot;
    if (association.dischargeVitalsExceptionNote) {
      next.dischargeVitalsExceptionNote = association.dischargeVitalsExceptionNote;
    } else {
      delete next.dischargeVitalsExceptionNote;
    }
    if (association.dischargeVitalsExceptionByDisplayName) {
      next.dischargeVitalsExceptionByDisplayName = association.dischargeVitalsExceptionByDisplayName;
    }
    if (association.dischargeVitalsExceptionAt) {
      next.dischargeVitalsExceptionAt = association.dischargeVitalsExceptionAt;
    }
  }

  base.erDispositionExecutionV1 = next;
  return base;
}

export type DischargeVitalsGateResult =
  | { ok: true; mode: "READING" | "EXCEPTION" }
  | { ok: false; code: "MISSING" | "EXCEPTION_OTHER_TEXT" | "STALE_READING" };

/**
 * Routine nursing discharge requires an associated active reading or a governed exception.
 */
export function validateNursingDischargeVitalsGate(
  association: NursingDischargeVitalsAssociation,
  opts?: { readingMeasuredAtIso?: string | null; nowMs?: number }
): DischargeVitalsGateResult {
  if (association.dischargeVitalsExceptionReason) {
    if (
      association.dischargeVitalsExceptionReason === "OTHER" &&
      !(association.dischargeVitalsExceptionNote ?? "").trim()
    ) {
      return { ok: false, code: "EXCEPTION_OTHER_TEXT" };
    }
    return { ok: true, mode: "EXCEPTION" };
  }
  if (!association.dischargeVitalReadingId) {
    return { ok: false, code: "MISSING" };
  }
  if (opts?.readingMeasuredAtIso) {
    const measured = new Date(opts.readingMeasuredAtIso).getTime();
    const now = opts.nowMs ?? Date.now();
    if (!Number.isNaN(measured) && now - measured > NURSING_DISCHARGE_VITALS_RECENT_MS) {
      // Associated reading was explicitly selected or newly entered; only block if somehow stale
      // and selected-from-existing without reconfirmation window.
      if (association.dischargeVitalsSelectedFromExisting === true) {
        return { ok: false, code: "STALE_READING" };
      }
    }
  }
  return { ok: true, mode: "READING" };
}

export function isRecentVitalForDischarge(
  measuredAtIso: string,
  nowMs = Date.now(),
  windowMs = NURSING_DISCHARGE_VITALS_RECENT_MS
): boolean {
  const measured = new Date(measuredAtIso).getTime();
  if (Number.isNaN(measured)) return false;
  const age = nowMs - measured;
  return age >= 0 && age <= windowMs;
}
