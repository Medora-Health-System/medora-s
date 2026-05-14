import type { Prisma } from "@prisma/client";
import type { ObservationReassessmentV1Body } from "@medora/shared";
import {
  OBSERVATION_REASSESSMENT_EVENT_SOURCE,
} from "@medora/shared";

export type ObservationReassessmentEventPerformer = {
  performerId: string | null;
  performerDisplayName: string;
  performerRoleTitle: string;
  performerInitials: string;
};

/**
 * Append-only `EncounterClinicalEvent` payload for observation / short-stay reassessment (13G-B).
 * `eventType` remains `NURSING_ASSESSMENT_SAVED`; discriminated from ER reassessment columns via `source`.
 */
export function observationReassessmentClinicalEventPayload(
  body: ObservationReassessmentV1Body,
  performer: ObservationReassessmentEventPerformer
): Prisma.InputJsonValue {
  const obs: Record<string, unknown> = {
    role: body.role,
    patientStatus: body.patientStatus,
    symptomsReviewed: body.symptomsReviewed,
    vitalsReviewed: body.vitalsReviewed,
    resultsReviewed: body.resultsReviewed,
    painControlled: body.painControlled,
    continueObservation: body.continueObservation,
    readyForDischarge: body.readyForDischarge,
    transferConsidered: body.transferConsidered,
  };
  if (body.note !== undefined && body.note !== "") {
    obs.note = body.note;
  }
  const base: Record<string, unknown> = {
    source: OBSERVATION_REASSESSMENT_EVENT_SOURCE,
    observationReassessmentV1: obs,
    performerId: performer.performerId,
    performerDisplayName: performer.performerDisplayName,
    performerRoleTitle: performer.performerRoleTitle,
    performerInitials: performer.performerInitials,
  };
  return JSON.parse(JSON.stringify(base)) as Prisma.InputJsonValue;
}
