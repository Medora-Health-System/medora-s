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
  /**
   * Phase 7.4 — Resolved rendering provider user id for billing (encounter provider, else attending).
   */
  resolvedRenderingProviderUserId?: string | null;
  /**
   * Phase 7.4 — Resolved billing provider user id (attending when present, else encounter provider).
   */
  resolvedBillingProviderUserId?: string | null;
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
  /**
   * Phase 7.1 — Unified completeness gate (validation + identity + export context + line rules).
   * `claimReady` is false when `claimBlockers` is non-empty.
   */
  claimReady: boolean;
  claimBlockers: string[];
  claimWarnings: string[];
  claimInfo: string[];
  /**
   * Phase 7.5 — Professional package readiness (vacuously true when no professional export lines).
   * Independent from facility side when both packages exist.
   */
  professionalClaimReady?: boolean;
  professionalClaimBlockers?: string[];
  professionalClaimWarnings?: string[];
  professionalClaimInfo?: string[];
  /**
   * Phase 7.5 — Facility package readiness (vacuously true when no facility export lines).
   */
  facilityClaimReady?: boolean;
  facilityClaimBlockers?: string[];
  facilityClaimWarnings?: string[];
  facilityClaimInfo?: string[];
  /**
   * Phase 7.4 — Same user ids as export headers: who is treated as rendering vs billing for this export.
   */
  resolvedRenderingProviderUserId?: string | null;
  resolvedBillingProviderUserId?: string | null;
  /** True when a facility export package exists (institutional billing entity applies). */
  facilityBillingRoleActive?: boolean;
  /** Facility billing identity satisfies institutional structural checks (or no facility package). */
  facilityBillingEntityResolved?: boolean;
  /** Professional provider + NPI requirements satisfied for the professional package (or no professional package). */
  professionalBillingContextResolved?: boolean;
  /** Institutional facility billing identity satisfied (or no facility package). */
  institutionalBillingContextResolved?: boolean;
  /** Auditable fallback hints (e.g. rendering fell back to attending). */
  roleResolutionWarnings?: string[];
};

export type EncounterClaimExportResult = {
  professional: ClaimExportPackage | null;
  facility: ClaimExportPackage | null;
  summary: EncounterClaimExportSummary;
};
