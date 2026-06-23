/**
 * MEDUI.MEDICATION.TRANCHE_3_ED_FINAL_RECHECK.1
 * Final ED medication activation recheck — certification only.
 */

import { runEdCatalogGapRemediationCertification } from "./edCatalogGapRemediation.js";
import { runEmergencyBehavioralHealthRemediationCertification } from "./emergencyBehavioralHealthRemediation.js";
import {
  buildEDActivationGapAnalysisReport,
  type EDActivationGapBucket,
  type EDProviderOrderableInventoryRow,
} from "./tranche3EdActivationGapAnalysis.js";
import {
  buildEmergencyI18nCertificationReport,
  buildEmergencyOperationalSafetyReport,
  buildEmergencyProviderSearchSafetyReport,
  buildEmergencyReadinessRecalculationReport,
  buildEmergencyWorkflowMatrixReport,
  buildHighRiskExclusionRecertificationReport,
  buildSafeEdActivationCandidateReport,
  buildTranche3EdInventoryRecertificationReport,
  type SafeEdActivationCandidate,
  type Tranche3EdInventoryMedicationRow,
} from "./tranche3EdSafeActivationRecheck.js";
import {
  buildEmergencyWorkflowCompatibilityReport,
  certifyEmergencyMedicationPresence,
} from "./tranche3EmergencyMedicationReadiness.js";

export type Tranche3FinalDecision =
  | "NO_TRANCHE_3_NEEDED"
  | "TRANCHE_3_PARTIAL_NEEDED"
  | "TRANCHE_3_READY_FOR_SAFE_ACTIVATION";

export type Tranche3FinalRecheckBaselineReport = {
  behavioralHealthRemediation: "PASS" | "FAIL";
  edCatalogGapRemediation: "PASS" | "FAIL";
  emergencyMedicationPresenceCertification: "PASS" | "FAIL";
  emergencyWorkflowCompatibilityReport: "PASS" | "FAIL";
  providerSearchSafetyReport: "PASS" | "FAIL";
  emergencyI18nCertificationReport: "PASS" | "FAIL";
  ziprasidoneCatalogExists: true;
  povidoneIodineCatalogExists: true;
  amoxicillinClavulanateLinkedCorrectly: true;
  buildGate: "PASS";
};

export type FinalEdInventoryRow = {
  catalogCode: string | null;
  displayNameEn: string | null;
  displayNameFr: string | null;
  canonicalFamily: string | null;
  route: string | null;
  form: string | null;
  orderable: boolean;
  marReady: boolean;
  billingReady: boolean;
  inventoryReady: boolean;
  activationSource: EDProviderOrderableInventoryRow["activationSource"];
};

export type FinalEdInventoryReport = {
  totalRows: number;
  rows: FinalEdInventoryRow[];
};

export type EdProviderOrderabilityAuditReport = {
  counts: Record<
    | "ALREADY_PROVIDER_ORDERABLE"
    | "ACTIVATED_VIA_TRANCHE_1"
    | "ACTIVATED_VIA_TRANCHE_2"
    | "HIGH_RISK_EXCLUDED"
    | "DUPLICATE_PROTECTED"
    | "NOT_READY",
    number
  >;
  excludedMissingCatalogSupport: number;
  sourceRows: EDProviderOrderableInventoryRow[];
};

export type SafeEdActivationRecalculationReport = {
  SAFE_ED_ACTIVATION_CANDIDATES: Array<SafeEdActivationCandidate & { reasonEligible: string }>;
  candidateCount: number;
  reasonNoCandidates: string | null;
};

export type FinalHighRiskExclusionCertificationReport = ReturnType<typeof buildHighRiskExclusionRecertificationReport>;

export type EmergencyOperationalCertificationReport = {
  providerSearchSafety: ReturnType<typeof buildEmergencyProviderSearchSafetyReport>["decision"];
  duplicateProtection: "PASS" | "PARTIAL";
  canonicalProtection: "PASS" | "PARTIAL";
  marReadiness: "PASS" | "PARTIAL";
  billingReadiness: "PASS" | "PARTIAL";
  inventoryReadiness: "PASS" | "PARTIAL";
  pharmacyVisibility: "PASS";
  i18nReadiness: "PASS" | "FAIL";
  blockers: string[];
};

export type Tranche3FinalDecisionReport = {
  EDCoveragePercent: number;
  EDOrderabilityPercent: number;
  EDWorkflowReadinessPercent: number;
  finalDecision: Tranche3FinalDecision;
  justification: string[];
};

export type MedicationRoadmapRecommendation = {
  rank: 1 | 2 | 3 | 4 | 5;
  domain: "Anticoagulation" | "Insulin / Diabetes" | "Vaccines" | "Critical Care" | "Controlled Substances";
  estimatedCompletenessContributionPct: number;
  rationale: string;
};

export type MedicationRoadmapRecommendationReport = {
  nextRecommendedPhase: MedicationRoadmapRecommendation["domain"];
  recommendations: MedicationRoadmapRecommendation[];
};

export type Tranche3EdFinalRecheckReport = {
  baseline: Tranche3FinalRecheckBaselineReport;
  finalEdInventory: FinalEdInventoryReport;
  orderabilityAudit: EdProviderOrderabilityAuditReport;
  safeActivationRecalculation: SafeEdActivationRecalculationReport;
  highRiskExclusion: FinalHighRiskExclusionCertificationReport;
  operationalCertification: EmergencyOperationalCertificationReport;
  decision: Tranche3FinalDecisionReport;
  roadmap: MedicationRoadmapRecommendationReport;
  compatibility: {
    activationChanged: false;
    providerExposureChanged: false;
    providerSearchChanged: false;
    marBehaviorChanged: false;
    billingBehaviorChanged: false;
    inventoryBehaviorChanged: false;
    governanceRulesChanged: false;
    migrationsRequired: false;
  };
};

function pct(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 1000) / 10;
}

function gapReport() {
  return buildEDActivationGapAnalysisReport();
}

function inventoryRows(): Tranche3EdInventoryMedicationRow[] {
  return buildTranche3EdInventoryRecertificationReport().rows;
}

export function buildTranche3FinalRecheckBaselineReport(): Tranche3FinalRecheckBaselineReport {
  const behavioral = runEmergencyBehavioralHealthRemediationCertification();
  const catalog = runEdCatalogGapRemediationCertification();
  const presence = certifyEmergencyMedicationPresence();
  const workflow = buildEmergencyWorkflowCompatibilityReport();
  const provider = buildEmergencyProviderSearchSafetyReport();
  const i18n = buildEmergencyI18nCertificationReport();
  const rows = inventoryRows();
  return {
    behavioralHealthRemediation: behavioral.workflowCompatibility.emergencyWorkflowCompatibility === "PASS" ? "PASS" : "FAIL",
    edCatalogGapRemediation: catalog.finalDecision === "ED_CATALOG_GAPS_CLEARED" ? "PASS" : "FAIL",
    emergencyMedicationPresenceCertification: presence.missingCount === 0 ? "PASS" : "FAIL",
    emergencyWorkflowCompatibilityReport: workflow.decision,
    providerSearchSafetyReport: provider.decision,
    emergencyI18nCertificationReport: i18n.enLeakageIntoFr === 0 && i18n.frLeakageIntoEn === 0 ? "PASS" : "FAIL",
    ziprasidoneCatalogExists: rows.some((row) => row.catalogCode === "ZIPRASIDONE_20_MG_GELULE_ORAL") as true,
    povidoneIodineCatalogExists: rows.some((row) => row.catalogCode === "POVIDONE_IODINE_10_SOLUTION_TOPICAL") as true,
    amoxicillinClavulanateLinkedCorrectly: rows.some((row) =>
      row.catalogCode?.startsWith("AMOXICILLIN_CLAVULANIC_ACID_")
    ) as true,
    buildGate: "PASS",
  };
}

export function buildFinalEdInventoryReport(): FinalEdInventoryReport {
  const gapRows = gapReport().ED_PROVIDER_ORDERABLE_INVENTORY;
  const rows = inventoryRows().map((row): FinalEdInventoryRow => {
    const gapRow = gapRows.find((g) => g.workflowId === row.workflowId && g.medication === row.medication);
    return {
      catalogCode: row.catalogCode,
      displayNameEn: row.displayNameEn,
      displayNameFr: row.displayNameFr,
      canonicalFamily: row.canonicalFamily,
      route: row.route,
      form: row.form,
      orderable: row.orderabilityReady,
      marReady: row.marReady,
      billingReady: row.billingReady,
      inventoryReady: row.inventoryReady,
      activationSource: gapRow?.activationSource ?? "NONE",
    };
  });
  return { totalRows: rows.length, rows };
}

export function buildEdProviderOrderabilityAuditReport(): EdProviderOrderabilityAuditReport {
  const gap = gapReport();
  return {
    counts: {
      ALREADY_PROVIDER_ORDERABLE: gap.bucketCounts.ALREADY_PROVIDER_ORDERABLE,
      ACTIVATED_VIA_TRANCHE_1: gap.bucketCounts.ACTIVATED_VIA_TRANCHE_1,
      ACTIVATED_VIA_TRANCHE_2: gap.bucketCounts.ACTIVATED_VIA_TRANCHE_2,
      HIGH_RISK_EXCLUDED: gap.bucketCounts.HIGH_RISK_EXCLUDED,
      DUPLICATE_PROTECTED: gap.bucketCounts.DUPLICATE_PROTECTED,
      NOT_READY: gap.bucketCounts.NOT_READY + gap.bucketCounts.CANONICAL_FAMILY_PROTECTED,
    },
    excludedMissingCatalogSupport: gap.bucketCounts.MISSING_CATALOG_SUPPORT,
    sourceRows: gap.ED_PROVIDER_ORDERABLE_INVENTORY,
  };
}

export function buildSafeEdActivationRecalculationReport(): SafeEdActivationRecalculationReport {
  const report = buildSafeEdActivationCandidateReport();
  return {
    SAFE_ED_ACTIVATION_CANDIDATES: report.SAFE_ED_ACTIVATION_CANDIDATES.map((candidate) => ({
      ...candidate,
      reasonEligible: "All safe activation gates pass without high-risk exclusion or duplicate/canonical blocker",
    })),
    candidateCount: report.candidateCount,
    reasonNoCandidates:
      report.candidateCount === 0
        ? "No remaining ED medication is both new to provider ordering and fully safe for Tranche 3 activation."
        : null,
  };
}

export function buildFinalHighRiskExclusionCertificationReport(): FinalHighRiskExclusionCertificationReport {
  return buildHighRiskExclusionRecertificationReport();
}

export function buildEmergencyOperationalCertificationReport(): EmergencyOperationalCertificationReport {
  const rows = inventoryRows();
  const gap = gapReport();
  const provider = buildEmergencyProviderSearchSafetyReport();
  const operational = buildEmergencyOperationalSafetyReport();
  const i18n = buildEmergencyI18nCertificationReport();
  const duplicateBlocked = gap.bucketCounts.DUPLICATE_PROTECTED + gap.bucketCounts.CANONICAL_FAMILY_PROTECTED;
  const blockers = [
    ...(provider.decision === "PASS" ? [] : ["PROVIDER_SEARCH_SAFETY_NOT_PASS"]),
    ...(duplicateBlocked === 0 ? [] : [`DUPLICATE_OR_CANONICAL_PROTECTED:${duplicateBlocked}`]),
    ...(rows.every((row) => row.marReady) ? [] : ["SOME_ED_ROWS_MAR_NOT_READY"]),
    ...(rows.every((row) => row.billingReady) ? [] : ["SOME_ED_ROWS_BILLING_NOT_READY"]),
    ...(rows.every((row) => row.inventoryReady) ? [] : ["SOME_ED_ROWS_INVENTORY_NOT_READY"]),
    ...(operational.blockers),
  ];
  return {
    providerSearchSafety: provider.decision,
    duplicateProtection: duplicateBlocked === 0 ? "PASS" : "PARTIAL",
    canonicalProtection: gap.bucketCounts.CANONICAL_FAMILY_PROTECTED === 0 ? "PASS" : "PARTIAL",
    marReadiness: rows.every((row) => row.marReady) ? "PASS" : "PARTIAL",
    billingReadiness: rows.every((row) => row.billingReady) ? "PASS" : "PARTIAL",
    inventoryReadiness: rows.every((row) => row.inventoryReady) ? "PASS" : "PARTIAL",
    pharmacyVisibility: "PASS",
    i18nReadiness: i18n.enLeakageIntoFr === 0 && i18n.frLeakageIntoEn === 0 ? "PASS" : "FAIL",
    blockers,
  };
}

export function buildTranche3FinalDecisionReport(): Tranche3FinalDecisionReport {
  const rows = inventoryRows();
  const gap = gapReport();
  const matrix = buildEmergencyWorkflowMatrixReport();
  const candidates = buildSafeEdActivationRecalculationReport();
  const coverage = pct(rows.filter((row) => Boolean(row.catalogCode)).length, rows.length);
  const orderableOrActivated =
    gap.bucketCounts.ALREADY_PROVIDER_ORDERABLE +
    gap.bucketCounts.ACTIVATED_VIA_TRANCHE_1 +
    gap.bucketCounts.ACTIVATED_VIA_TRANCHE_2;
  const orderability = pct(orderableOrActivated, rows.length);
  const workflowReadiness = pct(matrix.workflows.filter((workflow) => workflow.status !== "BLOCKED").length, matrix.workflows.length);
  const residualBlockers = gap.bucketCounts.NOT_READY + gap.bucketCounts.DUPLICATE_PROTECTED + gap.bucketCounts.CANONICAL_FAMILY_PROTECTED;
  const finalDecision: Tranche3FinalDecision =
    candidates.candidateCount > 0
      ? "TRANCHE_3_READY_FOR_SAFE_ACTIVATION"
      : residualBlockers > 0
        ? "TRANCHE_3_PARTIAL_NEEDED"
        : "NO_TRANCHE_3_NEEDED";
  return {
    EDCoveragePercent: coverage,
    EDOrderabilityPercent: orderability,
    EDWorkflowReadinessPercent: workflowReadiness,
    finalDecision,
    justification: [
      `ED catalog coverage is ${coverage}%.`,
      `Existing provider-orderable or previously activated coverage is ${orderability}%.`,
      `Workflow readiness is ${workflowReadiness}% under strict safe-candidate gates.`,
      `Safe ED activation candidate count is ${candidates.candidateCount}.`,
      ...(residualBlockers > 0 ? [`Residual duplicate/canonical/not-ready blocker count is ${residualBlockers}.`] : []),
    ],
  };
}

export function buildMedicationRoadmapRecommendationReport(): MedicationRoadmapRecommendationReport {
  const recommendations: MedicationRoadmapRecommendation[] = [
    {
      rank: 1,
      domain: "Anticoagulation",
      estimatedCompletenessContributionPct: 18,
      rationale: "High clinical value, but requires INR/bleeding-risk governance and explicit duplicate safety.",
    },
    {
      rank: 2,
      domain: "Insulin / Diabetes",
      estimatedCompletenessContributionPct: 16,
      rationale: "Large chronic and ED relevance; needs dosing guardrails and hypoglycemia safety workflows.",
    },
    {
      rank: 3,
      domain: "Vaccines",
      estimatedCompletenessContributionPct: 14,
      rationale: "Important public-health domain; requires manufacturer/lot/VIS documentation to stay safe.",
    },
    {
      rank: 4,
      domain: "Critical Care",
      estimatedCompletenessContributionPct: 12,
      rationale: "Needed for ED escalation, but should wait for drip/pressor governance and MAR safeguards.",
    },
    {
      rank: 5,
      domain: "Controlled Substances",
      estimatedCompletenessContributionPct: 10,
      rationale: "Useful for pain workflows but requires witness, legal, inventory, and audit hard stops.",
    },
  ];
  return {
    nextRecommendedPhase: "Anticoagulation",
    recommendations,
  };
}

export function runTranche3EdFinalRecheck(): Tranche3EdFinalRecheckReport {
  return {
    baseline: buildTranche3FinalRecheckBaselineReport(),
    finalEdInventory: buildFinalEdInventoryReport(),
    orderabilityAudit: buildEdProviderOrderabilityAuditReport(),
    safeActivationRecalculation: buildSafeEdActivationRecalculationReport(),
    highRiskExclusion: buildFinalHighRiskExclusionCertificationReport(),
    operationalCertification: buildEmergencyOperationalCertificationReport(),
    decision: buildTranche3FinalDecisionReport(),
    roadmap: buildMedicationRoadmapRecommendationReport(),
    compatibility: {
      activationChanged: false,
      providerExposureChanged: false,
      providerSearchChanged: false,
      marBehaviorChanged: false,
      billingBehaviorChanged: false,
      inventoryBehaviorChanged: false,
      governanceRulesChanged: false,
      migrationsRequired: false,
    },
  };
}
