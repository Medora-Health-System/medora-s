/**
 * MEDUI.D4B.7 — Thin Nest-facing care-coordination projection helpers.
 * Reuses D4B.1 adapters; does not expose unrestricted mutation.
 * Server-authoritative identity — reject client-controlled author/performer/signer.
 * Does not authorize discharge, mutate disposition, create orders, or rewrite D4B.6.
 */

import {
  buildEnterpriseCaseManagementDischargePlanningSummary,
  classifyEncounterTypeToCareCoordinationCareSetting,
  resolveCareCoordinationRoleProfile,
  type CareCoordinationEpisode,
  type CareCoordinationRoleProfile,
  type EnterpriseCaseManagementDischargePlanningSummary,
  type EnterpriseClinicalDocument,
} from "@medora/shared";

export type CareCoordinationProjectionInput = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  encounterType?: string | null;
  careSetting?: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleCodes?: readonly string[];
  roleProfile?: CareCoordinationRoleProfile;
  episodes?: ReadonlyArray<CareCoordinationEpisode>;
  /** Server-built documents only — client identity fields are ignored upstream. */
  documents?: ReadonlyArray<EnterpriseClinicalDocument>;
  nursingEntries?: ReadonlyArray<{
    readinessSummary?: string | null;
    authorUserId?: string | null;
    recordedAt?: string | null;
  }>;
  rtEntries?: ReadonlyArray<{
    documentTypeId?: string | null;
    summaryText?: string | null;
    authorUserId?: string | null;
    recordedAt?: string | null;
  }>;
  rehabEntries?: ReadonlyArray<{
    discipline: "PHYSICAL_THERAPY" | "OCCUPATIONAL_THERAPY" | "SPEECH_LANGUAGE_PATHOLOGY";
    documentTypeId?: string | null;
    summaryText?: string | null;
    authorUserId?: string | null;
    recordedAt?: string | null;
  }>;
  techTasks?: ReadonlyArray<{
    activityId?: string | null;
    performerUserId?: string | null;
    completedAt?: string | null;
  }>;
  carePlanEntries?: ReadonlyArray<{
    planId?: string | null;
    templateId?: string | null;
    lifecycleState?: string | null;
    readinessHint?: string | null;
  }>;
  legacyOps?: {
    workflowState?: string | null;
    destination?: string | null;
    barriers?: string | null;
    anticipatedDischargeDate?: string | null;
  } | null;
};

/**
 * Reject client-supplied author/performer/signer overrides.
 * Nest callers must stamp identity from the authenticated session / stored rows.
 */
export function rejectClientControlledCareCoordinationIdentity(input: {
  clientAuthorUserId?: string | null;
  serverAuthorUserId: string;
  clientPerformerUserId?: string | null;
  serverPerformerUserId?: string | null;
  clientSignerUserId?: string | null;
  serverSignerUserId?: string | null;
}): {
  accepted: boolean;
  authorUserId: string;
  performerUserId: string | null;
  signerUserId: string | null;
  clientIdentityRejected: boolean;
} {
  const clientAuthor = String(input.clientAuthorUserId ?? "").trim();
  const serverAuthor = String(input.serverAuthorUserId ?? "").trim();
  const clientPerformer = String(input.clientPerformerUserId ?? "").trim();
  const serverPerformer = String(input.serverPerformerUserId ?? "").trim() || null;
  const clientSigner = String(input.clientSignerUserId ?? "").trim();
  const serverSigner = String(input.serverSignerUserId ?? "").trim() || null;
  const authorMismatch = !!clientAuthor && clientAuthor !== serverAuthor;
  const performerMismatch =
    !!clientPerformer && !!serverPerformer && clientPerformer !== serverPerformer;
  const signerMismatch = !!clientSigner && !!serverSigner && clientSigner !== serverSigner;
  return {
    accepted: !authorMismatch && !performerMismatch && !signerMismatch,
    authorUserId: serverAuthor,
    performerUserId: serverPerformer,
    signerUserId: serverSigner,
    clientIdentityRejected: authorMismatch || performerMismatch || signerMismatch,
  };
}

export function projectEnterpriseCaseManagementDischargePlanning(
  input: CareCoordinationProjectionInput
): EnterpriseCaseManagementDischargePlanningSummary {
  const careSetting =
    input.careSetting ??
    classifyEncounterTypeToCareCoordinationCareSetting(input.encounterType);
  const roleProfile =
    input.roleProfile ?? resolveCareCoordinationRoleProfile(input.roleCodes ?? ["CM"]);
  return buildEnterpriseCaseManagementDischargePlanningSummary({
    encounterId: input.encounterId,
    patientId: input.patientId,
    facilityId: input.facilityId,
    careSetting,
    roleProfile,
    episodes: input.episodes,
    documents: input.documents,
    nursingEntries: input.nursingEntries,
    rtEntries: input.rtEntries,
    rehabEntries: input.rehabEntries,
    techTasks: input.techTasks,
    carePlanEntries: input.carePlanEntries,
    legacyOps: input.legacyOps,
  });
}
