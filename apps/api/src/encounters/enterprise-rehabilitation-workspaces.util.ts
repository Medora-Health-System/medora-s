/**
 * MEDUI.D4B.5 — Thin Nest-facing rehabilitation workspace projection helpers.
 * Reuses D4B.1 adapters; does not expose unrestricted mutation.
 * Server-authoritative identity — reject client-controlled author/performer/signer.
 */

import {
  buildEnterpriseRehabilitationWorkspaceSummary,
  classifyEncounterTypeToRehabilitationCareSetting,
  resolveRehabilitationDisciplineMode,
  resolveRehabilitationRoleProfile,
  type EnterpriseClinicalDocument,
  type EnterpriseRehabilitationWorkspaceSummary,
  type RehabilitationDisciplineMode,
  type RehabilitationRoleProfile,
} from "@medora/shared";

export type RehabilitationWorkspaceProjectionInput = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  encounterType?: string | null;
  careSetting?: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  disciplineMode?: RehabilitationDisciplineMode | string | null;
  roleCodes?: readonly string[];
  roleProfile?: RehabilitationRoleProfile;
  /** Server-built documents only — client identity fields are ignored upstream. */
  documents?: ReadonlyArray<EnterpriseClinicalDocument>;
  relatedOrders?: ReadonlyArray<{
    orderId: string;
    procedureCode?: string | null;
    displayLabel: string;
    status: string;
    discontinued?: boolean;
  }>;
  nursingMobilityFall?: ReadonlyArray<{
    cardId?: string | null;
    authorUserId?: string | null;
    authorDisplayName?: string | null;
    summaryText?: string | null;
    recordedAt?: string | null;
  }>;
  nursingSwallowScreen?: ReadonlyArray<{
    result?: string | null;
    authorUserId?: string | null;
    recordedAt?: string | null;
  }>;
  techMobilityAdl?: ReadonlyArray<{
    activityId?: string | null;
    performerUserId?: string | null;
    performerDisplayName?: string | null;
    completedAt?: string | null;
  }>;
};

/**
 * Reject client-supplied author/performer/signer overrides.
 * Nest callers must stamp identity from the authenticated session / stored rows.
 */
export function rejectClientControlledRehabIdentity(input: {
  clientAuthorUserId?: string | null;
  serverAuthorUserId: string;
  clientPerformerUserId?: string | null;
  serverPerformerUserId?: string | null;
}): {
  accepted: boolean;
  authorUserId: string;
  performerUserId: string | null;
  clientIdentityRejected: boolean;
} {
  const clientAuthor = String(input.clientAuthorUserId ?? "").trim();
  const serverAuthor = String(input.serverAuthorUserId ?? "").trim();
  const clientPerformer = String(input.clientPerformerUserId ?? "").trim();
  const serverPerformer = String(input.serverPerformerUserId ?? "").trim() || null;
  const authorMismatch = !!clientAuthor && clientAuthor !== serverAuthor;
  const performerMismatch =
    !!clientPerformer && !!serverPerformer && clientPerformer !== serverPerformer;
  return {
    accepted: !authorMismatch && !performerMismatch,
    authorUserId: serverAuthor,
    performerUserId: serverPerformer,
    clientIdentityRejected: authorMismatch || performerMismatch,
  };
}

export function projectEnterpriseRehabilitationWorkspace(
  input: RehabilitationWorkspaceProjectionInput
): EnterpriseRehabilitationWorkspaceSummary {
  const careSetting =
    input.careSetting ??
    classifyEncounterTypeToRehabilitationCareSetting(input.encounterType);
  const disciplineMode =
    (typeof input.disciplineMode === "string"
      ? resolveRehabilitationDisciplineMode(input.disciplineMode)
      : input.disciplineMode) ?? "PHYSICAL_THERAPY";
  const roleProfile =
    input.roleProfile ??
    resolveRehabilitationRoleProfile(input.roleCodes ?? ["RN"], disciplineMode);
  return buildEnterpriseRehabilitationWorkspaceSummary({
    encounterId: input.encounterId,
    patientId: input.patientId,
    facilityId: input.facilityId,
    careSetting,
    disciplineMode,
    roleProfile,
    documents: input.documents,
    relatedOrders: input.relatedOrders,
    nursingMobilityFall: input.nursingMobilityFall,
    nursingSwallowScreen: input.nursingSwallowScreen,
    techMobilityAdl: input.techMobilityAdl,
  });
}
