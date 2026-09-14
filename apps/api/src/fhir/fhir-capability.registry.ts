import { Injectable } from "@nestjs/common";
import { RoleCode } from "@prisma/client";

export const FHIR_VERSION = "4.0.1" as const;
export const FHIR_MEDIA_TYPES = ["application/fhir+json", "application/json"] as const;
export type FhirInteraction = "read" | "search-type" | "create" | "update" | "patch" | "delete" | "history-instance" | "history-type";

export type FhirCapability = {
  resourceType: "Patient" | "Encounter" | "Observation" | "Condition" | "AllergyIntolerance" | "MedicationRequest" | "MedicationAdministration" | "ServiceRequest" | "DiagnosticReport" | "CarePlan" | "Practitioner" | "PractitionerRole" | "Organization" | "Location";
  interaction: FhirInteraction;
  searchParameters: readonly string[];
  profiles: readonly string[];
  jurisdictions: readonly string[];
  humanRoles: readonly RoleCode[];
  futureM2mScope: string;
  deploymentEnabled: boolean;
  productionEnabled: boolean;
  evidenceTestIds: readonly string[];
};

const ADMIN_CLINICAL_ROLES = [RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN] as const;
const REGISTRATION_READ_ROLES = [...ADMIN_CLINICAL_ROLES, RoleCode.FRONT_DESK] as const;

/** One authoritative contract for route enforcement, metadata, and admin permission choices. */
export const FHIR_CAPABILITIES: readonly FhirCapability[] = Object.freeze([
  { resourceType: "Patient", interaction: "read", searchParameters: [], profiles: [], jurisdictions: ["*"], humanRoles: REGISTRATION_READ_ROLES, futureM2mScope: "patient.read", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["FHIR-001", "FHIR-010"] },
  { resourceType: "Patient", interaction: "search-type", searchParameters: ["_id", "identifier", "family", "given", "name", "birthdate", "gender", "_count", "_cursor"], profiles: [], jurisdictions: ["*"], humanRoles: REGISTRATION_READ_ROLES, futureM2mScope: "patient.search", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["FHIR-021", "FHIR-022"] },
  { resourceType: "Encounter", interaction: "read", searchParameters: [], profiles: [], jurisdictions: ["*"], humanRoles: REGISTRATION_READ_ROLES, futureM2mScope: "encounter.read", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["FHIR-002", "FHIR-011"] },
  { resourceType: "Encounter", interaction: "search-type", searchParameters: ["_id", "patient", "subject", "date", "status", "class", "_count", "_cursor"], profiles: [], jurisdictions: ["*"], humanRoles: REGISTRATION_READ_ROLES, futureM2mScope: "encounter.search", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["FHIR-025", "FHIR-026"] },
  ...(["Practitioner", "PractitionerRole", "Organization", "Location"] as const).flatMap((resourceType) => [
    { resourceType, interaction: "read" as const, searchParameters: [], profiles: [], jurisdictions: ["*"], humanRoles: ADMIN_CLINICAL_ROLES, futureM2mScope: `${resourceType[0]!.toLowerCase()}${resourceType.slice(1)}.read`, deploymentEnabled: true, productionEnabled: true, evidenceTestIds: [`FHIR-${resourceType === "Practitioner" ? "033" : resourceType === "PractitionerRole" ? "036" : resourceType === "Organization" ? "038" : "040"}`] },
    { resourceType, interaction: "search-type" as const, searchParameters: resourceType === "Location" ? ["_id", "identifier", "name", "organization", "status", "_count", "_cursor"] : resourceType === "Organization" ? ["_id", "identifier", "name", "_count", "_cursor"] : resourceType === "PractitionerRole" ? ["_id", "practitioner", "organization", "_count", "_cursor"] : ["_id", "identifier", "family", "given", "name", "_count", "_cursor"], profiles: [], jurisdictions: ["*"], humanRoles: ADMIN_CLINICAL_ROLES, futureM2mScope: `${resourceType[0]!.toLowerCase()}${resourceType.slice(1)}.search`, deploymentEnabled: true, productionEnabled: true, evidenceTestIds: [`FHIR-${resourceType === "Practitioner" ? "034" : resourceType === "PractitionerRole" ? "037" : resourceType === "Organization" ? "039" : "041"}`] },
  ]),
  { resourceType: "Observation", interaction: "read", searchParameters: [], profiles: [], jurisdictions: ["*"], humanRoles: ADMIN_CLINICAL_ROLES, futureM2mScope: "observation.read", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["FHIR-003", "FHIR-012"] },
  { resourceType: "Observation", interaction: "search-type", searchParameters: ["subject", "encounter", "_count"], profiles: [], jurisdictions: ["*"], humanRoles: ADMIN_CLINICAL_ROLES, futureM2mScope: "observation.search", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["FHIR-004", "FHIR-013"] },
  { resourceType: "Condition", interaction: "read", searchParameters: [], profiles: [], jurisdictions: ["*"], humanRoles: ADMIN_CLINICAL_ROLES, futureM2mScope: "condition.read", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["C-Condition-READ"] },
  { resourceType: "Condition", interaction: "search-type", searchParameters: ["_id", "patient", "subject", "encounter", "code", "clinical-status", "verification-status", "recorded-date", "_count", "_cursor"], profiles: [], jurisdictions: ["*"], humanRoles: ADMIN_CLINICAL_ROLES, futureM2mScope: "condition.search", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["C-Condition-SEARCH"] },
  { resourceType: "AllergyIntolerance", interaction: "read", searchParameters: [], profiles: [], jurisdictions: ["*"], humanRoles: ADMIN_CLINICAL_ROLES, futureM2mScope: "allergyIntolerance.read", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["P2A-AllergyIntolerance-READ"] },
  { resourceType: "AllergyIntolerance", interaction: "search-type", searchParameters: ["_id", "patient", "clinical-status", "verification-status", "date", "_count", "_cursor"], profiles: [], jurisdictions: ["*"], humanRoles: ADMIN_CLINICAL_ROLES, futureM2mScope: "allergyIntolerance.search", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["P2A-AllergyIntolerance-SEARCH"] },
  { resourceType: "MedicationRequest", interaction: "read", searchParameters: [], profiles: [], jurisdictions: ["*"], humanRoles: ADMIN_CLINICAL_ROLES, futureM2mScope: "medicationRequest.read", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["P2B-MedicationRequest-READ"] },
  { resourceType: "MedicationRequest", interaction: "search-type", searchParameters: ["_id", "patient", "subject", "encounter", "status", "intent", "_count", "_cursor"], profiles: [], jurisdictions: ["*"], humanRoles: ADMIN_CLINICAL_ROLES, futureM2mScope: "medicationRequest.search", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["P2B-MedicationRequest-SEARCH"] },
  { resourceType: "MedicationAdministration", interaction: "read", searchParameters: [], profiles: [], jurisdictions: ["*"], humanRoles: ADMIN_CLINICAL_ROLES, futureM2mScope: "medicationAdministration.read", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["P2B-MedicationAdministration-READ"] },
  { resourceType: "MedicationAdministration", interaction: "search-type", searchParameters: ["_id", "patient", "subject", "encounter", "request", "status", "_count", "_cursor"], profiles: [], jurisdictions: ["*"], humanRoles: ADMIN_CLINICAL_ROLES, futureM2mScope: "medicationAdministration.search", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["P2B-MedicationAdministration-SEARCH"] },
  { resourceType: "ServiceRequest", interaction: "read", searchParameters: [], profiles: [], jurisdictions: ["*"], humanRoles: ADMIN_CLINICAL_ROLES, futureM2mScope: "serviceRequest.read", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["C-ServiceRequest-READ"] },
  { resourceType: "ServiceRequest", interaction: "search-type", searchParameters: ["_id", "patient", "subject", "encounter", "code", "status", "authored", "_count", "_cursor"], profiles: [], jurisdictions: ["*"], humanRoles: ADMIN_CLINICAL_ROLES, futureM2mScope: "serviceRequest.search", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["C-ServiceRequest-SEARCH"] },
  { resourceType: "DiagnosticReport", interaction: "read", searchParameters: [], profiles: [], jurisdictions: ["*"], humanRoles: ADMIN_CLINICAL_ROLES, futureM2mScope: "diagnosticReport.read", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["C-DiagnosticReport-READ"] },
  { resourceType: "DiagnosticReport", interaction: "search-type", searchParameters: ["_id", "patient", "subject", "encounter", "based-on", "status", "date", "_count", "_cursor"], profiles: [], jurisdictions: ["*"], humanRoles: ADMIN_CLINICAL_ROLES, futureM2mScope: "diagnosticReport.search", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["C-DiagnosticReport-SEARCH"] },
  { resourceType: "CarePlan", interaction: "read", searchParameters: [], profiles: [], jurisdictions: ["*"], humanRoles: ADMIN_CLINICAL_ROLES, futureM2mScope: "carePlan.read", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["C-CarePlan-READ"] },
  { resourceType: "CarePlan", interaction: "search-type", searchParameters: ["_id", "patient", "subject", "encounter", "status", "date", "_count", "_cursor"], profiles: [], jurisdictions: ["*"], humanRoles: ADMIN_CLINICAL_ROLES, futureM2mScope: "carePlan.search", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["C-CarePlan-SEARCH"] },
]);

@Injectable()
export class FhirCapabilityRegistry {
  grantable(jurisdiction?: string): readonly FhirCapability[] {
    return FHIR_CAPABILITIES.filter((capability) =>
      capability.deploymentEnabled &&
      capability.productionEnabled &&
      capability.evidenceTestIds.length > 0 &&
      (capability.jurisdictions.includes("*") || (!!jurisdiction && capability.jurisdictions.includes(jurisdiction)))
    );
  }

  enabled(jurisdiction?: string): readonly FhirCapability[] {
    if ((process.env.MEDORA_INTEROP_ENABLED ?? "false").trim().toLowerCase() !== "true") return [];
    return this.grantable(jurisdiction);
  }

  permissionOptions() {
    return this.grantable().map(({ resourceType, interaction, futureM2mScope }) => ({ code: futureM2mScope, resourceType, interaction }));
  }

  assertPermissionCodes(codes: readonly string[]): void {
    const allowed = new Set(this.permissionOptions().map((permission) => permission.code));
    if (codes.some((code) => !allowed.has(code))) throw new Error("UNSUPPORTED_INTEGRATION_PERMISSION");
  }
}
