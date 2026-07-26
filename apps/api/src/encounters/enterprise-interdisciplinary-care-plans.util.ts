/**
 * MEDUI.D4B.6 — Thin Nest-facing interdisciplinary care-plan projection helpers.
 * Reuses D4B.1 adapters; does not expose unrestricted mutation.
 * Server-authoritative identity — reject client-controlled author/performer/signer.
 */

import {
  buildEnterpriseInterdisciplinaryCarePlansSummary,
  classifyEncounterTypeToCarePlanCareSetting,
  resolveCarePlanRoleProfile,
  type CarePlanPatientPlan,
  type CarePlanRoleProfile,
  type EnterpriseClinicalDocument,
  type EnterpriseInterdisciplinaryCarePlansSummary,
} from "@medora/shared";

export type CarePlansProjectionInput = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  encounterType?: string | null;
  careSetting?: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleCodes?: readonly string[];
  roleProfile?: CarePlanRoleProfile;
  plans?: ReadonlyArray<CarePlanPatientPlan>;
  /** Server-built documents only — client identity fields are ignored upstream. */
  documents?: ReadonlyArray<EnterpriseClinicalDocument>;
  nursingContributions?: ReadonlyArray<{
    cardId?: string | null;
    authorUserId?: string | null;
    authorDisplayName?: string | null;
    summaryText?: string | null;
    recordedAt?: string | null;
  }>;
  rtContributions?: ReadonlyArray<{
    documentTypeId?: string | null;
    authorUserId?: string | null;
    summaryText?: string | null;
    recordedAt?: string | null;
  }>;
  rehabContributions?: ReadonlyArray<{
    discipline: "PHYSICAL_THERAPY" | "OCCUPATIONAL_THERAPY" | "SPEECH_LANGUAGE_PATHOLOGY";
    documentTypeId?: string | null;
    authorUserId?: string | null;
    summaryText?: string | null;
    recordedAt?: string | null;
  }>;
  techProgress?: ReadonlyArray<{
    activityId?: string | null;
    performerUserId?: string | null;
    performerDisplayName?: string | null;
    completedAt?: string | null;
  }>;
  legacyD3eStub?: ReadonlyArray<{
    itemId: string;
    discipline: string;
    goalText: string;
    status: string;
  }>;
};

/**
 * Reject client-supplied author/performer/signer overrides.
 * Nest callers must stamp identity from the authenticated session / stored rows.
 */
export function rejectClientControlledCarePlanIdentity(input: {
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

export function projectEnterpriseInterdisciplinaryCarePlans(
  input: CarePlansProjectionInput
): EnterpriseInterdisciplinaryCarePlansSummary {
  const careSetting =
    input.careSetting ?? classifyEncounterTypeToCarePlanCareSetting(input.encounterType);
  const roleProfile =
    input.roleProfile ?? resolveCarePlanRoleProfile(input.roleCodes ?? ["RN"]);
  return buildEnterpriseInterdisciplinaryCarePlansSummary({
    encounterId: input.encounterId,
    patientId: input.patientId,
    facilityId: input.facilityId,
    careSetting,
    roleProfile,
    plans: input.plans,
    documents: input.documents,
    nursingContributions: input.nursingContributions,
    rtContributions: input.rtContributions,
    rehabContributions: input.rehabContributions,
    techProgress: input.techProgress,
    legacyD3eStub: input.legacyD3eStub,
  });
}
