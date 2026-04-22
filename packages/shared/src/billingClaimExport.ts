/**
 * Phase 6 — Export-safe claim DTOs for future 837 / clearinghouse (no X12 segments yet).
 * Additive; no submission or pricing semantics.
 */

export type ClaimExportType = "PROFESSIONAL" | "FACILITY";

/** Header per export package (professional or facility). */
export type ClaimExportHeader = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  claimType: ClaimExportType;
  /** True when this package has exportable lines and no package-level validation blockers. */
  ready: boolean;
  /** Validation blocker codes for this package (stable identifiers). */
  blockers: string[];
  /** Validation warning codes for this package. */
  warnings: string[];
  /** Distinct ICD / diagnosis tokens from billing ledger rows for this encounter (best-effort). */
  diagnosisCodes: string[];
  /** Assigned physician user id when present on the encounter (attending). */
  attendingProviderId?: string | null;
  /** Encounter provider id when present (e.g. rendering / treating). */
  renderingProviderId?: string | null;
  serviceStartDate?: string | null;
  serviceEndDate?: string | null;
};

/** One billable service line for export (mirrors assembled claim lines + ledger modifiers). */
export type ClaimExportLine = {
  lineNumber: number;
  code: string;
  codeType: "CPT" | "HCPCS";
  companionCode?: string | null;
  companionCodeType?: "CPT" | "HCPCS" | null;
  description?: string | null;
  quantity: number;
  /** BillingSourceModule as string for JSON stability across packages. */
  sourceModule: string;
  originSide: "professional" | "facility" | "both";
  modifier1?: string | null;
  modifier2?: string | null;
  revenueCode?: string | null;
};

export type ClaimExportPackage = {
  header: ClaimExportHeader;
  lines: ClaimExportLine[];
};

export type EncounterClaimExportSummary = {
  readyForExport: boolean;
  /** Encounter-level validation blocker codes. */
  blockers: string[];
  /** Encounter-level validation warning codes. */
  warnings: string[];
  /** Export-only hints (e.g. missing optional context); not claim validation codes. */
  contextWarnings?: string[];
  /**
   * Phase 7 — payer / subscriber / provider NPI / facility billing identity gaps for this encounter.
   * When empty, modeled claim identity is sufficient for preview (structural issues may still apply).
   */
  claimIdentityGaps?: string[];
  /** True when `claimIdentityGaps` is empty or absent. */
  claimIdentityReady?: boolean;
};

export type EncounterClaimExportResult = {
  professional: ClaimExportPackage | null;
  facility: ClaimExportPackage | null;
  summary: EncounterClaimExportSummary;
};
