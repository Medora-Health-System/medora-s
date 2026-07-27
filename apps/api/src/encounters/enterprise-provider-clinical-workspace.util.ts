/**
 * MEDUI.D4B.8 — Thin Nest-facing provider clinical workspace projection helpers.
 * Reuses D4B.1 adapters; does not expose unrestricted mutation.
 * Server-authoritative identity — reject client-controlled author/signer/attester/cosigner.
 * Note ≠ order ≠ diagnosis mutation ≠ MAR ≠ discharge auth ≠ procedure note ≠ discharge summary.
 */

import {
  buildEnterpriseProviderClinicalWorkspaceSummary,
  classifyEncounterTypeToProviderCareSetting,
  resolveProviderRoleProfile,
  type EnterpriseClinicalDocument,
  type EnterpriseProviderClinicalWorkspaceSummary,
  type ProviderCensusRow,
  type ProviderClinicalWorkspaceRoleProfile,
  type ProviderLimitedHandoffProjection,
} from "@medora/shared";

export type ProviderClinicalWorkspaceProjectionInput = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  encounterType?: string | null;
  careSetting?: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleCodes?: readonly string[];
  roleProfile?: ProviderClinicalWorkspaceRoleProfile;
  /** Server-built documents only — client identity fields are ignored upstream. */
  documents?: ReadonlyArray<EnterpriseClinicalDocument>;
  censusRows?: ReadonlyArray<ProviderCensusRow>;
  nursingEntries?: ReadonlyArray<{
    summaryText?: string | null;
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
  careCoordEpisodes?: ReadonlyArray<{
    episodeId?: string | null;
    status?: string | null;
    openBarrierCount?: number;
    destinationHint?: string | null;
    fullSocialWorkNarrative?: string | null;
  }>;
  orders?: ReadonlyArray<{
    orderId?: string | null;
    status?: string | null;
    summaryText?: string | null;
  }>;
  medications?: ReadonlyArray<{
    medicationId?: string | null;
    status?: string | null;
    summaryText?: string | null;
  }>;
  results?: ReadonlyArray<{
    resultId?: string | null;
    status?: string | null;
    summaryText?: string | null;
    acknowledged?: boolean | null;
  }>;
  diagnosisEntries?: ReadonlyArray<{
    diagnosisId?: string | null;
    displayName?: string | null;
    status?: string | null;
    isPrincipal?: boolean | null;
  }>;
  handoff?: ProviderLimitedHandoffProjection | null;
};

/**
 * Reject client-supplied author/signer/attester/cosigner/performer/supervisor overrides.
 * Nest callers must stamp identity from the authenticated session / stored rows.
 */
export function rejectClientControlledProviderIdentity(input: {
  clientAuthorUserId?: string | null;
  serverAuthorUserId: string;
  clientSignerUserId?: string | null;
  serverSignerUserId?: string | null;
  clientAttesterUserId?: string | null;
  serverAttesterUserId?: string | null;
  clientCosignerUserId?: string | null;
  serverCosignerUserId?: string | null;
  clientPerformerUserId?: string | null;
  serverPerformerUserId?: string | null;
  clientSupervisingProviderUserId?: string | null;
  serverSupervisingProviderUserId?: string | null;
}): {
  accepted: boolean;
  authorUserId: string;
  signerUserId: string | null;
  attesterUserId: string | null;
  cosignerUserId: string | null;
  performerUserId: string | null;
  supervisingProviderUserId: string | null;
  clientIdentityRejected: boolean;
} {
  const mismatch = (client?: string | null, server?: string | null) => {
    const c = String(client ?? "").trim();
    const s = String(server ?? "").trim();
    return !!c && !!s && c !== s;
  };
  const authorMismatch = mismatch(input.clientAuthorUserId, input.serverAuthorUserId);
  const signerMismatch = mismatch(input.clientSignerUserId, input.serverSignerUserId);
  const attesterMismatch = mismatch(input.clientAttesterUserId, input.serverAttesterUserId);
  const cosignerMismatch = mismatch(input.clientCosignerUserId, input.serverCosignerUserId);
  const performerMismatch = mismatch(input.clientPerformerUserId, input.serverPerformerUserId);
  const supervisorMismatch = mismatch(
    input.clientSupervisingProviderUserId,
    input.serverSupervisingProviderUserId
  );
  return {
    accepted:
      !authorMismatch &&
      !signerMismatch &&
      !attesterMismatch &&
      !cosignerMismatch &&
      !performerMismatch &&
      !supervisorMismatch,
    authorUserId: String(input.serverAuthorUserId ?? "").trim(),
    signerUserId: String(input.serverSignerUserId ?? "").trim() || null,
    attesterUserId: String(input.serverAttesterUserId ?? "").trim() || null,
    cosignerUserId: String(input.serverCosignerUserId ?? "").trim() || null,
    performerUserId: String(input.serverPerformerUserId ?? "").trim() || null,
    supervisingProviderUserId:
      String(input.serverSupervisingProviderUserId ?? "").trim() || null,
    clientIdentityRejected:
      authorMismatch ||
      signerMismatch ||
      attesterMismatch ||
      cosignerMismatch ||
      performerMismatch ||
      supervisorMismatch,
  };
}

export function projectEnterpriseProviderClinicalWorkspace(
  input: ProviderClinicalWorkspaceProjectionInput
): EnterpriseProviderClinicalWorkspaceSummary {
  const careSetting =
    input.careSetting ??
    classifyEncounterTypeToProviderCareSetting(input.encounterType);
  const roleProfile =
    input.roleProfile ?? resolveProviderRoleProfile(input.roleCodes ?? ["MD"]);
  return buildEnterpriseProviderClinicalWorkspaceSummary({
    encounterId: input.encounterId,
    patientId: input.patientId,
    facilityId: input.facilityId,
    careSetting,
    roleProfile,
    documents: input.documents,
    censusRows: input.censusRows,
    nursingEntries: input.nursingEntries,
    rtEntries: input.rtEntries,
    rehabEntries: input.rehabEntries,
    techTasks: input.techTasks,
    carePlanEntries: input.carePlanEntries,
    careCoordEpisodes: input.careCoordEpisodes,
    orders: input.orders,
    medications: input.medications,
    results: input.results,
    diagnosisEntries: input.diagnosisEntries,
    handoff: input.handoff,
  });
}
