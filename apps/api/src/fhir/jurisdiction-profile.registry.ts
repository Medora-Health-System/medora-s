import { createHash } from "node:crypto";

export const FHIR_JURISDICTION_PROFILES = Symbol("FHIR_JURISDICTION_PROFILES");

export const JURISDICTION_PROFILE_STATUS = { VERIFIED_AUTHORITATIVE_REQUIREMENT: "VERIFIED_AUTHORITATIVE_REQUIREMENT", IMPLEMENTED: "IMPLEMENTED", ARCHITECTURALLY_SUPPORTED: "ARCHITECTURALLY_SUPPORTED", PENDING_AUTHORITY_CONFIRMATION: "PENDING_AUTHORITY_CONFIRMATION" } as const;
export type JurisdictionProfileStatus = typeof JURISDICTION_PROFILE_STATUS[keyof typeof JURISDICTION_PROFILE_STATUS];
export type JurisdictionProfile = { jurisdictionCode: string; facilityIds: readonly string[]; packageId: string; canonicalUrl: string; semanticVersion: string; publicationDate?: string; effectiveDate?: string; retirementDate?: string; authority: string; evidenceReference: string; checksum: string; status: JurisdictionProfileStatus; resourceProfiles: Readonly<Record<string, readonly string[]>>; extensions: readonly string[]; terminologyBindings: readonly string[]; identifierNamespaces: readonly string[]; allowedInteractions: readonly string[]; searchParameters: readonly string[]; validationPolicy: { severity: "error" | "warning" }; securityMetadata: Readonly<Record<string, string>>; dependencies: readonly string[] };

export const BASE_PROFILE: JurisdictionProfile = { jurisdictionCode: "INTL", facilityIds: [], packageId: "medora.fhir.r4.core", canonicalUrl: "https://medora.health/fhir/StructureDefinition/core", semanticVersion: "0.1.0", authority: "Medora Health System", evidenceReference: "docs/interop/MEDORA_RD_P0_3A_FHIR_FOUNDATION_EVIDENCE.md", checksum: "sha256:8da1b3ecf9d80fe546185f6625f37d336b1e06e2b8fa78df1528ea93d55bc431", status: JURISDICTION_PROFILE_STATUS.ARCHITECTURALLY_SUPPORTED, resourceProfiles: {}, extensions: [], terminologyBindings: [], identifierNamespaces: [], allowedInteractions: ["read", "search-type"], searchParameters: ["subject", "encounter", "_count"], validationPolicy: { severity: "error" }, securityMetadata: { jurisdictionSource: "facility.country" }, dependencies: ["hl7.fhir.r4.core@4.0.1"] };

export class JurisdictionProfileRegistry {
  constructor(private readonly profiles: readonly JurisdictionProfile[] = [BASE_PROFILE]) { this.validate(profiles); }
  resolve(country: string): readonly JurisdictionProfile[] {
    const normalized = country.trim().toUpperCase();
    return [BASE_PROFILE, ...this.profiles.filter((p) => p !== BASE_PROFILE && p.jurisdictionCode === normalized)];
  }
  validate(profiles = this.profiles): void {
    const ids = new Set<string>();
    for (const p of profiles) {
      if (ids.has(`${p.jurisdictionCode}:${p.packageId}`)) throw new Error("FHIR_PROFILE_CONFLICT");
      ids.add(`${p.jurisdictionCode}:${p.packageId}`);
      if (!/^\d+\.\d+\.\d+$/.test(p.semanticVersion) || !p.checksum.startsWith("sha256:") || p.checksum.length !== 71) throw new Error("FHIR_PROFILE_INVALID");
      if (p.retirementDate && new Date(p.retirementDate) <= new Date()) throw new Error("FHIR_PROFILE_RETIRED");
      if (p.dependencies.some((d) => !d.includes("@"))) throw new Error("FHIR_PROFILE_DEPENDENCY_INVALID");
    }
  }
  static checksum(value: string) { return `sha256:${createHash("sha256").update(value).digest("hex")}`; }
}
