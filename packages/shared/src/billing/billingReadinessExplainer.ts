import type { ClaimPackagesResult } from "../billingClaimPackages.js";

export type BillingReadinessBlockerCategory =
  | "MANUAL_REVIEW"
  | "CODING"
  | "CHARGE_MAPPING"
  | "PAYER"
  | "PROVIDER"
  | "FACILITY"
  | "CLAIM_ASSEMBLY"
  | "EXPORT"
  | "UNKNOWN";

export type BillingReadinessExplainerSeverity = "blocker" | "warning" | "info";

export type BillingReadinessExplainerSuggestedAction =
  | "open_coding_review"
  | "open_charge_capture_review"
  | "open_manual_billing_review"
  | "open_patient_registration"
  | "open_billing_ledger"
  | "open_claim_assembly_preview"
  | "open_facility_billing_settings";

export type BillingReadinessExplainerItem = {
  category: BillingReadinessBlockerCategory;
  label: string;
  detail: string;
  count: number;
  severity: BillingReadinessExplainerSeverity;
  blocksBilling: boolean;
  suggestedAction: BillingReadinessExplainerSuggestedAction;
};

export type BillingReadinessExplainerSummary = {
  isReady: boolean;
  blockerCount: number;
  warningCount: number;
  categories: BillingReadinessBlockerCategory[];
  items: BillingReadinessExplainerItem[];
  primaryReason: BillingReadinessExplainerItem | null;
};

export type BillingReadinessExplainerReadinessInput = {
  isReady: boolean;
  blockers: readonly { code: string; detail?: string }[];
  warnings: readonly { code: string; detail?: string }[];
  counts: {
    totalBillingEvents: number;
    uncodedLines: number;
    ledgerLinesNeedingReview: number;
    diagnosisCount: number;
  };
};

export type BillingReadinessExplainerLedgerInput = {
  total: number;
  needsReview: number;
  missingCode: number;
  unmappedLinesCount: number;
};

export type BillingReadinessExplainerManualReviewInput = {
  unresolvedCount: number;
  requiresReviewCount?: number;
};

export type BillingReadinessExplainerInput = {
  readiness: BillingReadinessExplainerReadinessInput;
  ledger: BillingReadinessExplainerLedgerInput;
  claimPackages: ClaimPackagesResult;
  manualReview: BillingReadinessExplainerManualReviewInput;
  identityGaps?: readonly string[];
  billingFinalizationStatus?: string | null;
  hasAttendingProvider?: boolean;
};

const CATEGORY_PRIORITY: BillingReadinessBlockerCategory[] = [
  "MANUAL_REVIEW",
  "CODING",
  "CHARGE_MAPPING",
  "PAYER",
  "PROVIDER",
  "FACILITY",
  "CLAIM_ASSEMBLY",
  "EXPORT",
  "UNKNOWN",
];

const PAYER_GAP_CODES = new Set([
  "MISSING_PAYER_CONTEXT",
  "MISSING_PRIMARY_COVERAGE",
  "MULTIPLE_PRIMARY_COVERAGE",
  "MISSING_SUBSCRIBER_RELATIONSHIP",
  "MISSING_SUBSCRIBER_NAME",
  "MISSING_PAYER_SOURCE",
  "MISSING_SUBSCRIBER_DATA",
  "AMBIGUOUS_PAYER",
]);

const PROVIDER_GAP_CODES = new Set([
  "MISSING_RENDERING_PROVIDER",
  "MISSING_BILLING_PROVIDER",
  "MISSING_RENDERING_PROVIDER_NPI",
  "MISSING_BILLING_PROVIDER_NPI",
  "MISSING_PROVIDER_NPI",
]);

const FACILITY_GAP_CODES = new Set(["MISSING_FACILITY_EXPORT_CONTEXT"]);

const EXPORT_BLOCKER_CODES = new Set([
  "encounter_not_closed",
  "missing_discharge_status",
  "no_billing_events_captured",
]);

function categoryRank(category: BillingReadinessBlockerCategory): number {
  const index = CATEGORY_PRIORITY.indexOf(category);
  return index === -1 ? CATEGORY_PRIORITY.length : index;
}

function pushItem(items: BillingReadinessExplainerItem[], item: BillingReadinessExplainerItem): void {
  const existing = items.find((row) => row.category === item.category && row.label === item.label);
  if (existing) {
    existing.count += item.count;
    if (item.detail && !existing.detail.includes(item.detail)) {
      existing.detail = existing.detail ? `${existing.detail}; ${item.detail}` : item.detail;
    }
    if (item.blocksBilling) existing.blocksBilling = true;
    if (item.severity === "blocker") existing.severity = "blocker";
    return;
  }
  items.push(item);
}

export function groupBillingReadinessBlockers(
  items: readonly BillingReadinessExplainerItem[]
): Partial<Record<BillingReadinessBlockerCategory, BillingReadinessExplainerItem[]>> {
  const grouped: Partial<Record<BillingReadinessBlockerCategory, BillingReadinessExplainerItem[]>> = {};
  for (const item of items) {
    const list = grouped[item.category] ?? [];
    list.push(item);
    grouped[item.category] = list;
  }
  return grouped;
}

export function resolveBillingReadinessPrimaryReason(
  items: readonly BillingReadinessExplainerItem[]
): BillingReadinessExplainerItem | null {
  const blockers = items.filter((item) => item.blocksBilling);
  if (blockers.length === 0) return null;
  return [...blockers].sort((a, b) => {
    const rankDiff = categoryRank(a.category) - categoryRank(b.category);
    if (rankDiff !== 0) return rankDiff;
    return b.count - a.count;
  })[0] ?? null;
}

export function buildBillingReadinessExplainerSummary(
  input: BillingReadinessExplainerInput
): BillingReadinessExplainerSummary {
  const items: BillingReadinessExplainerItem[] = [];
  const { readiness, ledger, claimPackages, manualReview } = input;

  if (manualReview.unresolvedCount > 0) {
    pushItem(items, {
      category: "MANUAL_REVIEW",
      label: "Manual review pending",
      detail: `${manualReview.unresolvedCount} item(s) awaiting billing review decision`,
      count: manualReview.unresolvedCount,
      severity: "blocker",
      blocksBilling: true,
      suggestedAction: "open_manual_billing_review",
    });
  } else if ((manualReview.requiresReviewCount ?? 0) > 0) {
    pushItem(items, {
      category: "MANUAL_REVIEW",
      label: "Manual review complete",
      detail: "All required manual review decisions are recorded",
      count: 0,
      severity: "info",
      blocksBilling: false,
      suggestedAction: "open_manual_billing_review",
    });
  }

  const uncodedCount = Math.max(readiness.counts.uncodedLines, ledger.missingCode);
  if (uncodedCount > 0) {
    pushItem(items, {
      category: "CODING",
      label: "Uncoded lines",
      detail: `${uncodedCount} billable line(s) missing CPT/HCPCS`,
      count: uncodedCount,
      severity: "blocker",
      blocksBilling: true,
      suggestedAction: "open_coding_review",
    });
  }

  if (ledger.unmappedLinesCount > 0) {
    pushItem(items, {
      category: "CHARGE_MAPPING",
      label: "Unmapped charge lines",
      detail: `${ledger.unmappedLinesCount} line(s) marked UNMAPPED`,
      count: ledger.unmappedLinesCount,
      severity: "blocker",
      blocksBilling: true,
      suggestedAction: "open_charge_capture_review",
    });
  }

  const ledgerReviewCount = Math.max(readiness.counts.ledgerLinesNeedingReview, ledger.needsReview);
  if (ledgerReviewCount > 0) {
    pushItem(items, {
      category: "CHARGE_MAPPING",
      label: "Charge capture review pending",
      detail: `${ledgerReviewCount} ledger line(s) still in captured status`,
      count: ledgerReviewCount,
      severity: "warning",
      blocksBilling: false,
      suggestedAction: "open_charge_capture_review",
    });
  }

  for (const gap of input.identityGaps ?? []) {
    if (PAYER_GAP_CODES.has(gap)) {
      pushItem(items, {
        category: "PAYER",
        label: "Payer / coverage gap",
        detail: gap,
        count: 1,
        severity: "blocker",
        blocksBilling: true,
        suggestedAction: "open_patient_registration",
      });
      continue;
    }
    if (PROVIDER_GAP_CODES.has(gap)) {
      pushItem(items, {
        category: "PROVIDER",
        label: "Provider billing identity gap",
        detail: gap,
        count: 1,
        severity: "blocker",
        blocksBilling: true,
        suggestedAction: "open_billing_ledger",
      });
      continue;
    }
    if (FACILITY_GAP_CODES.has(gap)) {
      pushItem(items, {
        category: "FACILITY",
        label: "Facility billing identity gap",
        detail: gap,
        count: 1,
        severity: "blocker",
        blocksBilling: true,
        suggestedAction: "open_facility_billing_settings",
      });
    }
  }

  if (input.hasAttendingProvider === false) {
    pushItem(items, {
      category: "PROVIDER",
      label: "Missing attending provider",
      detail: "No physician assigned on the encounter",
      count: 1,
      severity: "warning",
      blocksBilling: false,
      suggestedAction: "open_billing_ledger",
    });
  }

  for (const warning of readiness.warnings) {
    if (warning.code === "missing_attending_provider_reference") {
      pushItem(items, {
        category: "PROVIDER",
        label: "Missing attending provider reference",
        detail: warning.detail ?? warning.code,
        count: 1,
        severity: "warning",
        blocksBilling: false,
        suggestedAction: "open_billing_ledger",
      });
    }
  }

  if (readiness.counts.diagnosisCount === 0) {
    pushItem(items, {
      category: "CLAIM_ASSEMBLY",
      label: "Missing diagnosis linkage",
      detail: "No active diagnosis documented for claim assembly",
      count: 1,
      severity: "blocker",
      blocksBilling: true,
      suggestedAction: "open_claim_assembly_preview",
    });
  }

  const claimBlockerCount =
    claimPackages.professional.blockers.length + claimPackages.facility.blockers.length;
  if (
    !claimPackages.overall.readyForProfessionalClaim ||
    !claimPackages.overall.readyForFacilityClaim ||
    claimBlockerCount > 0
  ) {
    const uncodedPackage =
      claimPackages.professional.uncodedLines + claimPackages.facility.uncodedLines;
    const unknownSide =
      claimPackages.professional.unknownSideLines + claimPackages.facility.unknownSideLines;
    const detailParts: string[] = [];
    if (!claimPackages.overall.readyForProfessionalClaim) detailParts.push("professional package not ready");
    if (!claimPackages.overall.readyForFacilityClaim) detailParts.push("facility package not ready");
    if (uncodedPackage > 0) detailParts.push(`${uncodedPackage} uncoded package line(s)`);
    if (unknownSide > 0) detailParts.push(`${unknownSide} unknown billing side line(s)`);

    pushItem(items, {
      category: "CLAIM_ASSEMBLY",
      label: "Claim assembly blockers",
      detail: detailParts.join("; ") || "Claim package completeness checks failed",
      count: Math.max(claimBlockerCount, 1),
      severity: "blocker",
      blocksBilling: true,
      suggestedAction: "open_claim_assembly_preview",
    });
  }

  for (const blocker of readiness.blockers) {
    if (blocker.code === "uncoded_billing_lines" || blocker.code === "no_diagnosis_documented") {
      continue;
    }
    if (EXPORT_BLOCKER_CODES.has(blocker.code)) {
      pushItem(items, {
        category: "EXPORT",
        label: "Export readiness blocker",
        detail: blocker.detail ? `${blocker.code} (${blocker.detail})` : blocker.code,
        count: blocker.detail ? Number.parseInt(blocker.detail, 10) || 1 : 1,
        severity: "blocker",
        blocksBilling: true,
        suggestedAction: "open_claim_assembly_preview",
      });
      continue;
    }
    pushItem(items, {
      category: "UNKNOWN",
      label: "Unresolved readiness blocker",
      detail: blocker.detail ? `${blocker.code} (${blocker.detail})` : blocker.code,
      count: blocker.detail ? Number.parseInt(blocker.detail, 10) || 1 : 1,
      severity: "blocker",
      blocksBilling: true,
      suggestedAction: "open_billing_ledger",
    });
  }

  if (
    input.billingFinalizationStatus &&
    input.billingFinalizationStatus !== "FINALIZED" &&
    !readiness.isReady &&
    items.filter((item) => item.blocksBilling).length === 0
  ) {
    pushItem(items, {
      category: "UNKNOWN",
      label: "Billing workflow not ready",
      detail: `Workflow status: ${input.billingFinalizationStatus}`,
      count: 1,
      severity: "warning",
      blocksBilling: false,
      suggestedAction: "open_billing_ledger",
    });
  }

  const blockerCount = items.filter((item) => item.blocksBilling).length;
  const warningCount = items.filter((item) => item.severity === "warning").length;
  const categories = [...new Set(items.map((item) => item.category))].sort(
    (a, b) => categoryRank(a) - categoryRank(b)
  );
  const primaryReason = resolveBillingReadinessPrimaryReason(items);

  return {
    isReady: readiness.isReady && blockerCount === 0,
    blockerCount,
    warningCount,
    categories,
    items,
    primaryReason,
  };
}
