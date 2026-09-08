import { Injectable } from "@nestjs/common";
import { RoleCode } from "@prisma/client";

export const FHIR_VERSION = "4.0.1" as const;
export const FHIR_MEDIA_TYPES = ["application/fhir+json", "application/json"] as const;
export type FhirInteraction = "read" | "search-type" | "create" | "update" | "patch" | "delete" | "history-instance" | "history-type";

export type FhirCapability = {
  resourceType: "Patient" | "Encounter" | "Observation";
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

const READ_ROLES = [RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK] as const;

/** One authoritative contract for route enforcement, metadata, and admin permission choices. */
export const FHIR_CAPABILITIES: readonly FhirCapability[] = Object.freeze([
  { resourceType: "Patient", interaction: "read", searchParameters: [], profiles: [], jurisdictions: ["*"], humanRoles: READ_ROLES, futureM2mScope: "patient.read", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["FHIR-001", "FHIR-010"] },
  { resourceType: "Encounter", interaction: "read", searchParameters: [], profiles: [], jurisdictions: ["*"], humanRoles: READ_ROLES, futureM2mScope: "encounter.read", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["FHIR-002", "FHIR-011"] },
  { resourceType: "Observation", interaction: "read", searchParameters: [], profiles: [], jurisdictions: ["*"], humanRoles: READ_ROLES, futureM2mScope: "observation.read", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["FHIR-003", "FHIR-012"] },
  { resourceType: "Observation", interaction: "search-type", searchParameters: ["subject", "encounter", "_count"], profiles: [], jurisdictions: ["*"], humanRoles: READ_ROLES, futureM2mScope: "observation.search", deploymentEnabled: true, productionEnabled: true, evidenceTestIds: ["FHIR-004", "FHIR-013"] },
]);

@Injectable()
export class FhirCapabilityRegistry {
  /** A disabled deployment exposes neither routes, metadata claims, nor grantable permissions. */
  enabled(jurisdiction?: string): readonly FhirCapability[] {
    if ((process.env.MEDORA_INTEROP_ENABLED ?? "false").trim().toLowerCase() !== "true") return [];
    return FHIR_CAPABILITIES.filter((c) => c.deploymentEnabled && c.productionEnabled && c.evidenceTestIds.length > 0 && (c.jurisdictions.includes("*") || (!!jurisdiction && c.jurisdictions.includes(jurisdiction))));
  }

  permissionOptions() {
    return this.enabled().map(({ resourceType, interaction, futureM2mScope }) => ({
      code: futureM2mScope,
      resourceType,
      interaction,
    }));
  }

  assertPermissionCodes(codes: readonly string[]): void {
    const allowed = new Set(this.permissionOptions().map((p) => p.code));
    if (codes.some((code) => !allowed.has(code))) throw new Error("UNSUPPORTED_INTEGRATION_PERMISSION");
  }
}
