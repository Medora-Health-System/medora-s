/**
 * MEDUI.MEDICATION.TRANCHE_3_ED_ACTIVATION_GAP_ANALYSIS.1
 * Explains why SAFE_ED_ACTIVATION_CANDIDATES is empty. Audit only.
 */

import { certifyMedicationActivationCollision } from "./medicationCanonicalNormalization.js";
import { listActiveTranche1PilotCatalogCodes } from "./tranche1PilotUiApiWiring.js";
import { listActiveTranche2ProviderOrderingCatalogCodes } from "./tranche2ProviderOrderingActivation.js";
import {
  buildSafeEdActivationCandidateReport,
  buildTranche3EdInventoryRecertificationReport,
  type Tranche3EdInventoryMedicationRow,
  type Tranche3EdWorkflowId,
} from "./tranche3EdSafeActivationRecheck.js";

export type EDActivationGapBucket =
  | "ALREADY_PROVIDER_ORDERABLE"
  | "ACTIVATED_VIA_TRANCHE_1"
  | "ACTIVATED_VIA_TRANCHE_2"
  | "DUPLICATE_PROTECTED"
  | "CANONICAL_FAMILY_PROTECTED"
  | "HIGH_RISK_EXCLUDED"
  | "NOT_READY"
  | "MISSING_CATALOG_SUPPORT";

export type EDActivationSource = "ALREADY_PROVIDER_ORDERABLE" | "TRANCHE_1" | "TRANCHE_2" | "NONE";

export type EDProviderOrderableInventoryRow = {
  workflowId: Tranche3EdWorkflowId;
  medication: string;
  catalogCode: string | null;
  displayNameEn: string | null;
  displayNameFr: string | null;
  activationSource: EDActivationSource;
  orderableStatus: "ORDERABLE" | "NOT_ORDERABLE" | "MISSING";
  marStatus: "READY" | "NOT_READY";
  billingStatus: "READY" | "NOT_READY";
  inventoryStatus: "READY" | "NOT_READY";
  bucket: EDActivationGapBucket;
  exclusionReasonIfNotOrderable: string | null;
};

export type EDActivationGapAnalysisDecision =
  | "NO_TRANCHE_3_NEEDED"
  | "TRANCHE_3_PARTIAL_NEEDED"
  | "TRANCHE_3_SAFE_ACTIVATION_AVAILABLE";

export type EDActivationGapAnalysisReport = {
  ticket: "MEDUI.MEDICATION.TRANCHE_3_ED_ACTIVATION_GAP_ANALYSIS.1";
  safeEdActivationCandidateCount: number;
  ED_PROVIDER_ORDERABLE_INVENTORY: EDProviderOrderableInventoryRow[];
  bucketCounts: Record<EDActivationGapBucket, number>;
  blockerSummary: string[];
  finalDecision: EDActivationGapAnalysisDecision;
  compatibility: {
    activationChanged: false;
    providerSearchChanged: false;
    marBehaviorChanged: false;
    billingBehaviorChanged: false;
    inventoryBehaviorChanged: false;
    migrationsRequired: false;
  };
};

const BUCKETS: EDActivationGapBucket[] = [
  "ALREADY_PROVIDER_ORDERABLE",
  "ACTIVATED_VIA_TRANCHE_1",
  "ACTIVATED_VIA_TRANCHE_2",
  "DUPLICATE_PROTECTED",
  "CANONICAL_FAMILY_PROTECTED",
  "HIGH_RISK_EXCLUDED",
  "NOT_READY",
  "MISSING_CATALOG_SUPPORT",
];

function activationSource(row: Tranche3EdInventoryMedicationRow, tranche1: Set<string>, tranche2: Set<string>): EDActivationSource {
  if (!row.catalogCode) return "NONE";
  if (tranche1.has(row.catalogCode)) return "TRANCHE_1";
  if (tranche2.has(row.catalogCode)) return "TRANCHE_2";
  if (row.orderabilityReady) return "ALREADY_PROVIDER_ORDERABLE";
  return "NONE";
}

function hasCanonicalFamilyProtection(row: Tranche3EdInventoryMedicationRow): boolean {
  if (!row.catalogCode) return false;
  const collision = certifyMedicationActivationCollision([row.catalogCode]);
  return collision.blockers.some((blocker) => blocker.includes("FAMILY") || blocker.includes("ALREADY_ORDERABLE"));
}

function bucketForRow(row: Tranche3EdInventoryMedicationRow, source: EDActivationSource): EDActivationGapBucket {
  if (!row.catalogCode) return "MISSING_CATALOG_SUPPORT";
  if (source === "TRANCHE_1") return "ACTIVATED_VIA_TRANCHE_1";
  if (source === "TRANCHE_2") return "ACTIVATED_VIA_TRANCHE_2";
  if (source === "ALREADY_PROVIDER_ORDERABLE") return "ALREADY_PROVIDER_ORDERABLE";
  if (row.highRiskExcluded) return "HIGH_RISK_EXCLUDED";
  if (row.duplicateStatus !== "SAFE") return "DUPLICATE_PROTECTED";
  if (hasCanonicalFamilyProtection(row)) return "CANONICAL_FAMILY_PROTECTED";
  return "NOT_READY";
}

function exclusionReason(row: Tranche3EdInventoryMedicationRow, bucket: EDActivationGapBucket): string | null {
  if (bucket === "ALREADY_PROVIDER_ORDERABLE" || bucket === "ACTIVATED_VIA_TRANCHE_1" || bucket === "ACTIVATED_VIA_TRANCHE_2") {
    return null;
  }
  if (bucket === "MISSING_CATALOG_SUPPORT") return "Missing catalog support";
  if (bucket === "HIGH_RISK_EXCLUDED") return "High-risk ED medication excluded";
  if (bucket === "DUPLICATE_PROTECTED") return "Duplicate activation protection blocks new activation";
  if (bucket === "CANONICAL_FAMILY_PROTECTED") return "Canonical-family protection blocks new activation";
  return row.blockers.length > 0 ? row.blockers.join("; ") : "Not ready for safe activation";
}

function toInventoryRow(
  row: Tranche3EdInventoryMedicationRow,
  tranche1: Set<string>,
  tranche2: Set<string>
): EDProviderOrderableInventoryRow {
  const source = activationSource(row, tranche1, tranche2);
  const bucket = bucketForRow(row, source);
  return {
    workflowId: row.workflowId,
    medication: row.medication,
    catalogCode: row.catalogCode,
    displayNameEn: row.displayNameEn,
    displayNameFr: row.displayNameFr,
    activationSource: source,
    orderableStatus: row.catalogCode ? (row.orderabilityReady ? "ORDERABLE" : "NOT_ORDERABLE") : "MISSING",
    marStatus: row.marReady ? "READY" : "NOT_READY",
    billingStatus: row.billingReady ? "READY" : "NOT_READY",
    inventoryStatus: row.inventoryReady ? "READY" : "NOT_READY",
    bucket,
    exclusionReasonIfNotOrderable: exclusionReason(row, bucket),
  };
}

export function buildEDActivationGapAnalysisReport(): EDActivationGapAnalysisReport {
  const tranche1 = new Set(listActiveTranche1PilotCatalogCodes());
  const tranche2 = new Set(listActiveTranche2ProviderOrderingCatalogCodes());
  const candidates = buildSafeEdActivationCandidateReport();
  const rows = buildTranche3EdInventoryRecertificationReport().rows.map((row) => toInventoryRow(row, tranche1, tranche2));
  const bucketCounts = Object.fromEntries(BUCKETS.map((bucket) => [bucket, rows.filter((row) => row.bucket === bucket).length])) as Record<
    EDActivationGapBucket,
    number
  >;
  const blockerSummary = [
    ...(bucketCounts.MISSING_CATALOG_SUPPORT > 0 ? [`MISSING_CATALOG_SUPPORT:${bucketCounts.MISSING_CATALOG_SUPPORT}`] : []),
    ...(bucketCounts.NOT_READY > 0 ? [`NOT_READY:${bucketCounts.NOT_READY}`] : []),
    ...(bucketCounts.DUPLICATE_PROTECTED > 0 ? [`DUPLICATE_PROTECTED:${bucketCounts.DUPLICATE_PROTECTED}`] : []),
    ...(bucketCounts.CANONICAL_FAMILY_PROTECTED > 0 ? [`CANONICAL_FAMILY_PROTECTED:${bucketCounts.CANONICAL_FAMILY_PROTECTED}`] : []),
    ...(bucketCounts.HIGH_RISK_EXCLUDED > 0 ? [`HIGH_RISK_EXCLUDED:${bucketCounts.HIGH_RISK_EXCLUDED}`] : []),
  ];
  return {
    ticket: "MEDUI.MEDICATION.TRANCHE_3_ED_ACTIVATION_GAP_ANALYSIS.1",
    safeEdActivationCandidateCount: candidates.candidateCount,
    ED_PROVIDER_ORDERABLE_INVENTORY: rows,
    bucketCounts,
    blockerSummary,
    finalDecision:
      candidates.candidateCount > 0
        ? "TRANCHE_3_SAFE_ACTIVATION_AVAILABLE"
        : bucketCounts.MISSING_CATALOG_SUPPORT > 0 || bucketCounts.NOT_READY > 0
          ? "TRANCHE_3_PARTIAL_NEEDED"
          : "NO_TRANCHE_3_NEEDED",
    compatibility: {
      activationChanged: false,
      providerSearchChanged: false,
      marBehaviorChanged: false,
      billingBehaviorChanged: false,
      inventoryBehaviorChanged: false,
      migrationsRequired: false,
    },
  };
}
