/** Phase 2C.1 — imaging catalog duplicate-retirement governance types (design-only foundation). */

export type ImagingRetirementPhaseStatus = "planned" | "rolled_back";

export type ImagingCatalogSuccessorEntry = {
  /** Legacy / duplicate catalog code scheduled for deactivation. */
  predecessorCode: string;
  /** Canonical replacement orderable code. */
  successorCode: string;
  /** Short clinical intent label for governance review. */
  clinicalIntent: string;
  /** Phase 2C audit: manual review before retirement execution. */
  manualReviewRequired: boolean;
  manualReviewReason?: string;
  /** Governance phase tag (2C batch). */
  phase: "2C";
  /** Crosswalk lifecycle — never `executed` until a future retirement phase runs. */
  status: ImagingRetirementPhaseStatus;
};

export type RetirementValidationIssue = {
  code: string;
  message: string;
  severity: "error" | "warning";
};

export type RetirementCatalogRowSnapshot = {
  code: string;
  isActive: boolean;
  aliases: string[];
};

export type OrderSetPredecessorReference = {
  source: string;
  predecessorCode: string;
  /** When the order set already names a primary successor code. */
  successorCode?: string;
  role: "primary" | "fallback";
};

export type SharedAliasCollision = {
  alias: string;
  codes: string[];
  pairPredecessor: string;
  pairSuccessor: string;
};

export type SearchShortcutCollision = {
  query: string;
  codes: string[];
  pairPredecessor: string;
  pairSuccessor: string;
};

export type ActiveDuplicateGroup = {
  predecessorCode: string;
  successorCode: string;
  predecessorActive: boolean;
  successorActive: boolean;
};

export type PairReadinessDimension = {
  ready: boolean;
  blockers: string[];
};

export type ImagingPairRetirementReadiness = {
  predecessorCode: string;
  successorCode: string;
  manualReviewRequired: boolean;
  billing: PairReadinessDimension;
  alias: PairReadinessDimension;
  orderSet: PairReadinessDimension;
  search: PairReadinessDimension;
  historicalOrders: PairReadinessDimension & { orderCount: number };
  reporting: PairReadinessDimension;
  retirementReady: boolean;
  verdict: "SAFE" | "NOT_SAFE";
};

export type ImagingRetirementReadinessReport = {
  generatedAt: string;
  pairCount: number;
  safeCount: number;
  notSafeCount: number;
  pairs: ImagingPairRetirementReadiness[];
  globalBlockers: string[];
  overallVerdict: "SAFE" | "NOT_SAFE";
};

export type ImagingRetirementScanResult = {
  validationIssues: RetirementValidationIssue[];
  activeDuplicateGroups: ActiveDuplicateGroup[];
  sharedAliasCollisions: SharedAliasCollision[];
  searchShortcutCollisions: SearchShortcutCollision[];
  orderSetPredecessorRefs: OrderSetPredecessorReference[];
};

export type ImagingRetirementReadinessInput = {
  catalogRows: RetirementCatalogRowSnapshot[];
  /** BillingCatalog IMAGING externalCode values present in the environment. */
  billingMappedExternalCodes: Set<string>;
  orderSetPredecessorRefs: OrderSetPredecessorReference[];
  /** Lowercase query → catalog codes (mirrors IMAGING_ALIAS_CODE_MAP relevant entries). */
  searchAliasShortcutMap: Record<string, string[]>;
  /** Predecessor code → historical OrderItem count (IMAGING_STUDY). */
  historicalOrderCountsByPredecessor: Record<string, number>;
};
