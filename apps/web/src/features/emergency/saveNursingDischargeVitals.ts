/**
 * Nursing-discharge vitals save — reuses certified saveIndependentEncounterVitals.
 * Sets recordingContext = NURSING_DISCHARGE and resolves the ACTIVE reading for association.
 */

import { apiFetch } from "@/lib/apiClient";
import {
  buildVitalsTimelineNewestFirst,
  type PatientTriageVitalsResponse,
} from "@/lib/patientVitals";
import {
  saveIndependentEncounterVitals,
  type IndependentVitalsSaveErrorCode,
  type IndependentVitalsSaveForm,
} from "./saveIndependentEncounterVitals";
import {
  buildNursingDischargeVitalsSnapshot,
  resolveAuthoritativeNursingDischargeReadingId,
  type NursingDischargeVitalsAssociation,
  type NursingDischargeVitalsSnapshot,
} from "./nursingDischargeVitalsModel";

export type SaveNursingDischargeVitalsErrorCode = IndependentVitalsSaveErrorCode | "READING_NOT_FOUND";

export type SaveNursingDischargeVitalsResult =
  | {
      ok: true;
      measuredAt: string;
      readingId: string;
      vitalsJson: Record<string, unknown>;
      snapshot: NursingDischargeVitalsSnapshot;
      association: NursingDischargeVitalsAssociation;
      createdFirstTriageRow: boolean;
    }
  | {
      ok: false;
      code: SaveNursingDischargeVitalsErrorCode;
      cause?: unknown;
    };

export async function saveNursingDischargeVitals(args: {
  encounterId: string;
  facilityId: string;
  patientId?: string | null;
  form: IndependentVitalsSaveForm;
  confirmedByDisplayName: string;
  fetchImpl?: typeof apiFetch;
}): Promise<SaveNursingDischargeVitalsResult> {
  const fetchImpl = args.fetchImpl ?? apiFetch;

  const saveResult = await saveIndependentEncounterVitals({
    encounterId: args.encounterId,
    facilityId: args.facilityId,
    form: args.form,
    mutateVitalsJson: (vitals) => {
      vitals.recordingContext = "NURSING_DISCHARGE";
    },
    fetchImpl,
  });

  if (!saveResult.ok) {
    return { ok: false, code: saveResult.code, cause: saveResult.cause };
  }

  let readingId: string | null = null;
  if (args.patientId?.trim()) {
    const timeline = (await fetchImpl(`/patients/${args.patientId}/triage?latest=true`, {
      facilityId: args.facilityId,
    })) as PatientTriageVitalsResponse;
    const merged = buildVitalsTimelineNewestFirst(timeline.latest, timeline.history, []);
    readingId = resolveAuthoritativeNursingDischargeReadingId({
      encounterId: args.encounterId,
      measuredAtIso: saveResult.measuredAt,
      candidates: merged.map((s) => ({
        encounterId: s.encounterId,
        readingId: s.readingId,
        measuredAt: s.measuredAt ?? s.updatedAt,
        status: s.status,
        vitalsJson: s.vitalsJson,
      })),
    });
  }

  if (!readingId) {
    return { ok: false, code: "READING_NOT_FOUND" };
  }

  const snapshot = buildNursingDischargeVitalsSnapshot({
    vitalsJson: saveResult.vitalsJson,
    measuredAt: saveResult.measuredAt,
    enteredBy: args.confirmedByDisplayName,
  });

  const association: NursingDischargeVitalsAssociation = {
    dischargeVitalReadingId: readingId,
    dischargeVitalsSelectedFromExisting: false,
    dischargeVitalsConfirmedByDisplayName: args.confirmedByDisplayName,
    dischargeVitalsConfirmedAt: new Date().toISOString(),
    dischargeVitalsSnapshot: snapshot,
  };

  return {
    ok: true,
    measuredAt: saveResult.measuredAt,
    readingId,
    vitalsJson: saveResult.vitalsJson,
    snapshot,
    association,
    createdFirstTriageRow: saveResult.createdFirstTriageRow,
  };
}
