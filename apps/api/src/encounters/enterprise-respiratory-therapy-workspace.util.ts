/**
 * MEDUI.D4B.4 — Thin Nest-facing respiratory therapy workspace projection helpers.
 * Reuses D4B.1 adapters; does not expose unrestricted mutation.
 */

import {
  buildEnterpriseRespiratoryTherapyWorkspaceSummary,
  classifyEncounterTypeToRespiratoryTherapyCareSetting,
  resolveRespiratoryTherapyRoleProfile,
  type EnterpriseRespiratoryTherapyWorkspaceSummary,
  type EdocEntryAdapterInput,
  type RespiratoryTherapyRoleProfile,
  type TechnicianVitalsContributionProjection,
} from "@medora/shared";

export type RespiratoryTherapyWorkspaceProjectionInput = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  encounterType?: string | null;
  careSetting?: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleCodes?: readonly string[];
  roleProfile?: RespiratoryTherapyRoleProfile;
  hospitalEpisodeId?: string | null;
  edocEntries?: ReadonlyArray<EdocEntryAdapterInput & { rnProxyAuthorship?: boolean }>;
  activeOrders?: ReadonlyArray<{
    orderId: string;
    procedureCode?: string | null;
    displayLabel: string;
    status: string;
    rtInvolvement?: string | null;
    discontinued?: boolean;
  }>;
  marResponses?: ReadonlyArray<{
    administrationEventId: string;
    responseCode?: string | null;
    documentedAt?: string | null;
    administratorUserId?: string | null;
  }>;
  techMeasurements?: ReadonlyArray<TechnicianVitalsContributionProjection>;
};

export function projectEnterpriseRespiratoryTherapyWorkspace(
  input: RespiratoryTherapyWorkspaceProjectionInput
): EnterpriseRespiratoryTherapyWorkspaceSummary {
  const careSetting =
    input.careSetting ??
    classifyEncounterTypeToRespiratoryTherapyCareSetting(input.encounterType);
  const roleProfile =
    input.roleProfile ??
    resolveRespiratoryTherapyRoleProfile(input.roleCodes ?? ["RN"]);
  return buildEnterpriseRespiratoryTherapyWorkspaceSummary({
    encounterId: input.encounterId,
    patientId: input.patientId,
    facilityId: input.facilityId,
    careSetting,
    roleProfile,
    hospitalEpisodeId: input.hospitalEpisodeId,
    edocEntries: input.edocEntries,
    activeOrders: input.activeOrders,
    marResponses: input.marResponses,
    techMeasurements: input.techMeasurements,
  });
}
