/**
 * Independent triage vitals save — shared by full triage panel and quick-entry drawer.
 *
 * Critical: GET /triage returns null when no Triage row exists yet. That is a valid
 * first-save state; callers must not abort before PUT. upsertTriage creates the row.
 */

import { apiFetch } from "@/lib/apiClient";
import { measuredAtIsoFromLocalInputs } from "@/lib/vitalsMeasurementContextDisplay";
import { mergeVitalsJsonForSave, type VitalsJsonMergeFormInput } from "./emergencyTriageVitalsMerge";
import { erTriageV1FormFromVitalsJson, normalizeErTriageV1Form } from "./medoraErTriageV1";
import {
  sepsisScreenFormToJson,
  sepsisScreenFromUnknown,
  strokeScreenFormToJson,
  strokeScreenFromUnknown,
} from "./emergencyTriageDocPreview";

export type IndependentVitalsSaveForm = Omit<VitalsJsonMergeFormInput, "erV1" | "allergyNote"> & {
  measuredDate: string;
  measuredTime: string;
  allergyNote?: string;
  /** When provided, used as ER V1 base; otherwise derived from server vitalsJson. */
  erV1?: VitalsJsonMergeFormInput["erV1"];
};

export type IndependentVitalsSaveErrorCode =
  | "INVALID_MEASURED_AT"
  | "MISSING_CONTEXT"
  | "EMPTY_VITALS"
  | "REQUEST_FAILED";

export type IndependentVitalsSaveResult =
  | { ok: true; measuredAt: string; createdFirstTriageRow: boolean; response: unknown }
  | { ok: false; code: IndependentVitalsSaveErrorCode; cause?: unknown };

export type IndependentVitalsSaveDiagnostics = {
  handlerInvoked: true;
  encounterIdPresent: boolean;
  facilityIdPresent: boolean;
  measuredAtValid: boolean;
  createdFirstTriageRow: boolean;
  requestStarted: boolean;
  responseStatus?: number;
  errorCategory?: IndependentVitalsSaveErrorCode | "SUCCESS";
  payloadFieldNames: string[];
};

type TriageBaseline = {
  id?: string;
  vitalsJson: unknown;
  chiefComplaint: string | null;
  onsetAt: string | Date | null;
  esi: number | string | null;
  strokeScreen: unknown;
  sepsisScreen: unknown;
  triageCompleteAt: string | Date | null;
  updatedAt: string | Date | null;
};

function emptyTriageBaseline(): TriageBaseline {
  return {
    vitalsJson: null,
    chiefComplaint: null,
    onsetAt: null,
    esi: null,
    strokeScreen: null,
    sepsisScreen: null,
    triageCompleteAt: null,
    updatedAt: null,
  };
}

function asTriageBaseline(raw: unknown): { baseline: TriageBaseline; createdFirstTriageRow: boolean } {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return {
      createdFirstTriageRow: false,
      baseline: {
        id: typeof o.id === "string" ? o.id : undefined,
        vitalsJson: o.vitalsJson ?? null,
        chiefComplaint: typeof o.chiefComplaint === "string" ? o.chiefComplaint : null,
        onsetAt: (o.onsetAt as string | Date | null | undefined) ?? null,
        esi: (o.esi as number | string | null | undefined) ?? null,
        strokeScreen: o.strokeScreen ?? null,
        sepsisScreen: o.sepsisScreen ?? null,
        triageCompleteAt: (o.triageCompleteAt as string | Date | null | undefined) ?? null,
        updatedAt: (o.updatedAt as string | Date | null | undefined) ?? null,
      },
    };
  }
  return { baseline: emptyTriageBaseline(), createdFirstTriageRow: true };
}

function isoOrNull(value: string | Date | null | undefined): string | null {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString();
}

/** PHI-safe diagnostics for development troubleshooting only. */
export function logIndependentVitalsSaveDiagnostics(diag: IndependentVitalsSaveDiagnostics): void {
  // Development-only PHI-safe breadcrumbs. Never log in production or unit-test noise.
  if (process.env.NODE_ENV !== "development") return;
  // eslint-disable-next-line no-console
  console.info("[vitals-save]", {
    handlerInvoked: diag.handlerInvoked,
    encounterIdPresent: diag.encounterIdPresent,
    facilityIdPresent: diag.facilityIdPresent,
    measuredAtValid: diag.measuredAtValid,
    createdFirstTriageRow: diag.createdFirstTriageRow,
    requestStarted: diag.requestStarted,
    responseStatus: diag.responseStatus,
    errorCategory: diag.errorCategory,
    payloadFieldNames: diag.payloadFieldNames,
  });
}

/**
 * Load current triage (or empty baseline), merge vitals draft, PUT upsert with measuredAt.
 * Does not require ESI, chief complaint, or triage completion.
 */
export async function saveIndependentEncounterVitals(args: {
  encounterId: string;
  facilityId: string;
  form: IndependentVitalsSaveForm;
  /** Optional: inject fetch for tests. Defaults to apiFetch. */
  fetchImpl?: typeof apiFetch;
}): Promise<IndependentVitalsSaveResult> {
  const { encounterId, facilityId, form } = args;
  const fetchImpl = args.fetchImpl ?? apiFetch;

  const diag: IndependentVitalsSaveDiagnostics = {
    handlerInvoked: true,
    encounterIdPresent: Boolean(encounterId?.trim()),
    facilityIdPresent: Boolean(facilityId?.trim()),
    measuredAtValid: false,
    createdFirstTriageRow: false,
    requestStarted: false,
    payloadFieldNames: [],
  };

  if (!diag.encounterIdPresent || !diag.facilityIdPresent) {
    diag.errorCategory = "MISSING_CONTEXT";
    logIndependentVitalsSaveDiagnostics(diag);
    return { ok: false, code: "MISSING_CONTEXT" };
  }

  const measuredAt = measuredAtIsoFromLocalInputs(form.measuredDate, form.measuredTime);
  diag.measuredAtValid = Boolean(measuredAt);
  if (!measuredAt) {
    diag.errorCategory = "INVALID_MEASURED_AT";
    logIndependentVitalsSaveDiagnostics(diag);
    return { ok: false, code: "INVALID_MEASURED_AT" };
  }

  const latestRaw = await fetchImpl(`/encounters/${encounterId}/triage`, { facilityId });
  const { baseline, createdFirstTriageRow } = asTriageBaseline(latestRaw);
  diag.createdFirstTriageRow = createdFirstTriageRow;

  const erV1Base = normalizeErTriageV1Form(
    form.erV1 ?? erTriageV1FormFromVitalsJson(baseline.vitalsJson)
  );
  const vitalsMerged = mergeVitalsJsonForSave(baseline.vitalsJson, {
    tempC: form.tempC,
    hr: form.hr,
    rr: form.rr,
    bpSys: form.bpSys,
    bpDia: form.bpDia,
    spo2: form.spo2,
    weightKg: form.weightKg,
    heightCm: form.heightCm,
    painScore: form.painScore,
    allergyNote:
      form.allergyNote ??
      (typeof (baseline.vitalsJson as { allergyNote?: string } | null)?.allergyNote === "string"
        ? String((baseline.vitalsJson as { allergyNote?: string }).allergyNote)
        : ""),
    erV1: {
      ...erV1Base,
      painScale0to10: form.painScore.trim() || erV1Base.painScale0to10,
    },
    tempInputUnit: form.tempInputUnit,
    weightInputUnit: form.weightInputUnit,
    heightInputMode: form.heightInputMode,
    heightFeet: form.heightFeet,
    heightInches: form.heightInches,
    temperatureSite: form.temperatureSite,
    oxygenDevice: form.oxygenDevice,
    oxygenFlowLpm: form.oxygenFlowLpm,
    oxygenFiO2Percent: form.oxygenFiO2Percent,
    oxygenDeviceNotes: form.oxygenDeviceNotes,
  });

  if (!vitalsMerged) {
    diag.errorCategory = "EMPTY_VITALS";
    logIndependentVitalsSaveDiagnostics(diag);
    return { ok: false, code: "EMPTY_VITALS" };
  }

  const strokeJson = strokeScreenFormToJson(
    strokeScreenFromUnknown(baseline.strokeScreen),
    baseline.strokeScreen
  );
  const sepsisJson = sepsisScreenFormToJson(
    sepsisScreenFromUnknown(baseline.sepsisScreen),
    baseline.sepsisScreen
  );

  const lastKnownTriageUpdatedAt = isoOrNull(baseline.updatedAt);
  const body = {
    chiefComplaint: baseline.chiefComplaint?.trim() || null,
    onsetAt: isoOrNull(baseline.onsetAt),
    esi: baseline.esi != null && baseline.esi !== "" ? parseInt(String(baseline.esi), 10) : null,
    vitalsJson: vitalsMerged,
    strokeScreen: Object.keys(strokeJson).length > 0 ? strokeJson : null,
    sepsisScreen: Object.keys(sepsisJson).length > 0 ? sepsisJson : null,
    triageCompleteAt: isoOrNull(baseline.triageCompleteAt),
    lastKnownTriageUpdatedAt,
    measuredAt,
  };
  diag.payloadFieldNames = Object.keys(body);

  diag.requestStarted = true;
  try {
    const response = await fetchImpl(`/encounters/${encounterId}/triage`, {
      method: "PUT",
      facilityId,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    diag.errorCategory = "SUCCESS";
    logIndependentVitalsSaveDiagnostics(diag);
    return { ok: true, measuredAt, createdFirstTriageRow, response };
  } catch (cause) {
    diag.errorCategory = "REQUEST_FAILED";
    logIndependentVitalsSaveDiagnostics(diag);
    return { ok: false, code: "REQUEST_FAILED", cause };
  }
}
