/** Phase 2C.3.1 — imaging alias migration governance types (design-only foundation). */

import type { RetirementCatalogRowSnapshot, SharedAliasCollision, SearchShortcutCollision } from "./imaging-catalog-retirement.types";

export type ImagingAliasGovernancePhaseStatus = "planned" | "rolled_back";

/**
 * Planned alias disposition for duplicate-retirement pairs.
 * Does not mutate ImagingStudyAlias or runtime search.
 */
export type AliasOwnershipAction =
  | "transfer"
  | "retain_dual"
  | "deprecate"
  | "successor_canonical"
  | "manual_review";

export type PlannedAliasOwnership = {
  /** Normalized lowercase alias string. */
  alias: string;
  action: AliasOwnershipAction;
  /** Which catalog row currently holds the alias in Haiti seed (when known). */
  currentHolder?: "predecessor" | "successor" | "both";
  notes?: string;
};

export type ImagingAliasSuccessorOwnershipEntry = {
  predecessorCode: string;
  successorCode: string;
  clinicalIntent: string;
  /** Per-alias governance plan for this duplicate pair. */
  aliases: readonly PlannedAliasOwnership[];
  /** Exact search shortcut query keys for this pair (mirrors audited IMAGING_ALIAS_CODE_MAP subset). */
  searchShortcutQueries: readonly string[];
  /** Intended post-cutover shortcut targets — successor code(s) only. */
  postCutoverShortcutCodes: readonly string[];
  manualReviewRequired: boolean;
  manualReviewReason?: string;
  phase: "2C";
  status: ImagingAliasGovernancePhaseStatus;
};

export type AliasGovernanceValidationIssue = {
  code: string;
  message: string;
  severity: "error" | "warning";
};

export type AliasOwnershipGap = {
  predecessorCode: string;
  successorCode: string;
  alias: string;
  message: string;
};

export type SearchShortcutOwnershipGap = {
  predecessorCode: string;
  successorCode: string;
  query: string;
  currentCodes: string[];
  expectedPostCutoverCodes: string[];
  message: string;
};

export type ImagingAliasGovernanceScanResult = {
  validationIssues: AliasGovernanceValidationIssue[];
  sharedAliasCollisions: SharedAliasCollision[];
  searchShortcutCollisions: SearchShortcutCollision[];
  ownershipGaps: AliasOwnershipGap[];
  searchShortcutGaps: SearchShortcutOwnershipGap[];
};

export type AliasPairGovernanceReadiness = {
  predecessorCode: string;
  successorCode: string;
  manualReviewRequired: boolean;
  ownershipDefined: { ready: boolean; blockers: string[] };
  localizationSafe: { ready: boolean; blockers: string[] };
  searchSafe: { ready: boolean; blockers: string[] };
  historicalOrderSafe: { ready: boolean; blockers: string[] };
  dualActiveSafe: { ready: boolean; blockers: string[] };
  migrationReady: boolean;
  verdict: "SAFE" | "NOT_SAFE";
};

export type ImagingAliasGovernanceReport = {
  generatedAt: string;
  pairCount: number;
  safeCount: number;
  notSafeCount: number;
  pairs: AliasPairGovernanceReadiness[];
  scan: ImagingAliasGovernanceScanResult;
  globalBlockers: string[];
  overallVerdict: "SAFE" | "NOT_SAFE";
};

export type ImagingAliasGovernanceInput = {
  catalogRows: RetirementCatalogRowSnapshot[];
  /** Lowercase query → catalog codes (mirrors IMAGING_ALIAS_CODE_MAP relevant entries). */
  searchAliasShortcutMap: Record<string, string[]>;
};
