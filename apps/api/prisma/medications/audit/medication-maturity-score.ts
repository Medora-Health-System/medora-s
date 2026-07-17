/**
 * Evidence-based medication engine maturity scoring (Phase 1 audit).
 */
import type { CatalogMetricsSnapshot } from "./medication-catalog-metrics";
import { auditBase, type AuditConfidence, type AuditDataSource } from "./medication-audit-types";

export type MaturityDomainId =
  | "dataModel"
  | "canonicalIdentifiers"
  | "catalogCompleteness"
  | "genericBrand"
  | "strengthFormRoute"
  | "searchQuality"
  | "englishLocalization"
  | "frenchLocalization"
  | "medicationOrdering"
  | "prescriptionWorkflow"
  | "marAdministration"
  | "medicationReconciliation"
  | "allergyChecking"
  | "interactionChecking"
  | "dosingIntelligence"
  | "pediatricSupport"
  | "renalHepaticSupport"
  | "controlledSubstances"
  | "formulary"
  | "inventory"
  | "hcpcsBilling"
  | "externalIntegration"
  | "securityAuditability"
  | "historicalVersionSafety"
  | "testCoverage"
  | "performanceScalability"
  | "dataUpdateLifecycle"
  | "productionDeploymentReadiness";

export type MaturityDomainScore = {
  domain: MaturityDomainId;
  score: number;
  maxScore: 5;
  evidence: string;
};

export const MATURITY_DOMAIN_COUNT = 28;
export const MATURITY_MAX_PER_DOMAIN = 5;

/** Baseline evidence scores — adjusted slightly when live metrics diverge. */
export function buildBaselineMaturityDomains(metrics?: CatalogMetricsSnapshot): MaturityDomainScore[] {
  const rxNorm = metrics?.liveCounts.rxNormPopulated ?? 0;
  const catalogTotal = metrics?.liveCounts.catalogMedication ?? 0;
  const displayEn = metrics?.liveCounts.displayNameEnPopulated ?? 0;
  const displayFr = metrics?.liveCounts.displayNameFrPopulated ?? 0;

  const identifierScore = rxNorm > 0 ? 3 : 2;
  const englishScore = catalogTotal > 0 && displayEn >= catalogTotal * 0.95 ? 4 : 3;
  const frenchScore = catalogTotal > 0 && displayFr >= catalogTotal * 0.9 ? 4 : 3;
  const perfScore = catalogTotal > 5000 ? 3 : 2;

  return [
    { domain: "dataModel", score: 4, maxScore: 5, evidence: "Dual CatalogMedication + Concept/Product/Package" },
    {
      domain: "canonicalIdentifiers",
      score: identifierScore,
      maxScore: 5,
      evidence: rxNorm > 0 ? `Internal codes + ${rxNorm} RxNorm concepts` : "Internal codes yes; RxNorm=0",
    },
    { domain: "catalogCompleteness", score: 2, maxScore: 5, evidence: "CURATED not COMPLETE" },
    { domain: "genericBrand", score: 3, maxScore: 5, evidence: "genericName + aliases; no formal brand entity" },
    { domain: "strengthFormRoute", score: 3, maxScore: 5, evidence: "String fields; concentration model exists" },
    { domain: "searchQuality", score: 3, maxScore: 5, evidence: "Tiered ranking on CatalogMedication; scale unproven at 100k+" },
    {
      domain: "englishLocalization",
      score: englishScore,
      maxScore: 5,
      evidence: "displayNameEn populated",
    },
    {
      domain: "frenchLocalization",
      score: frenchScore,
      maxScore: 5,
      evidence: "displayNameFr mostly populated",
    },
    { domain: "medicationOrdering", score: 4, maxScore: 5, evidence: "Order/OrderItem mature" },
    { domain: "prescriptionWorkflow", score: 1, maxScore: 5, evidence: "No Prescription model" },
    { domain: "marAdministration", score: 4, maxScore: 5, evidence: "Append-only MAR" },
    { domain: "medicationReconciliation", score: 1, maxScore: 5, evidence: "No clinical med-rec entity" },
    { domain: "allergyChecking", score: 2, maxScore: 5, evidence: "Ack gates; free-text allergies" },
    { domain: "interactionChecking", score: 1, maxScore: 5, evidence: "interactionGroupIds JSON only; no engine" },
    { domain: "dosingIntelligence", score: 2, maxScore: 5, evidence: "Partial weight/frequency; no knowledge base" },
    { domain: "pediatricSupport", score: 2, maxScore: 5, evidence: "Partial" },
    { domain: "renalHepaticSupport", score: 1, maxScore: 5, evidence: "Absent as knowledge source" },
    { domain: "controlledSubstances", score: 3, maxScore: 5, evidence: "Flags + waste schema; limited enforcement" },
    { domain: "formulary", score: 3, maxScore: 5, evidence: "FacilityFormularyItem + waves" },
    { domain: "inventory", score: 3, maxScore: 5, evidence: "InventoryItem exists; small stocked set" },
    { domain: "hcpcsBilling", score: 2, maxScore: 5, evidence: "Partial mappings; billing ≠ clinical" },
    { domain: "externalIntegration", score: 1, maxScore: 5, evidence: "No Surescripts/FHIR med runtime" },
    { domain: "securityAuditability", score: 3, maxScore: 5, evidence: "Facility scope + MAR audit" },
    { domain: "historicalVersionSafety", score: 3, maxScore: 5, evidence: "Snapshots on MAR; catalog mutable" },
    { domain: "testCoverage", score: 4, maxScore: 5, evidence: "Large shared/api MAR test surface" },
    {
      domain: "performanceScalability",
      score: perfScore,
      maxScore: 5,
      evidence: catalogTotal > 5000 ? "Search OK for mid-scale catalog" : "Search OK for ~1k; no proven 100k",
    },
    { domain: "dataUpdateLifecycle", score: 3, maxScore: 5, evidence: "Staging/promotion exists" },
    {
      domain: "productionDeploymentReadiness",
      score: 3,
      maxScore: 5,
      evidence: "Curated formulary deployable; not full catalog",
    },
  ];
}

export function computeMaturityPercentage(domains: MaturityDomainScore[]): number {
  const sum = domains.reduce((total, row) => total + row.score, 0);
  const max = domains.length * MATURITY_MAX_PER_DOMAIN;
  if (max === 0) return 0;
  return Math.round((sum / max) * 1000) / 10;
}

export function computeMaturitySummary(domains: MaturityDomainScore[]) {
  const sum = domains.reduce((total, row) => total + row.score, 0);
  const percentage = computeMaturityPercentage(domains);
  return { domainCount: domains.length, sum, maxPossible: domains.length * MATURITY_MAX_PER_DOMAIN, percentage };
}

export type MaturityFinalDecision = "MEDICATION_ENGINE_FOUNDATION_REPAIR_REQUIRED";

export function resolveFinalDecision(
  metrics: CatalogMetricsSnapshot,
  percentage: number
): MaturityFinalDecision {
  void percentage;
  if (metrics.liveCounts.rxNormPopulated === 0) return "MEDICATION_ENGINE_FOUNDATION_REPAIR_REQUIRED";
  return "MEDICATION_ENGINE_FOUNDATION_REPAIR_REQUIRED";
}

export function buildMaturityScoreArtifact(
  dataSource: AuditDataSource,
  confidence: AuditConfidence,
  metrics: CatalogMetricsSnapshot
) {
  const domains = buildBaselineMaturityDomains(metrics);
  const summary = computeMaturitySummary(domains);
  const finalDecision = resolveFinalDecision(metrics, summary.percentage);

  return {
    ...auditBase(dataSource, confidence),
    domains,
    summary,
    finalDecision,
    blockers: [
      "RxNorm unpopulated on MedicationConcept",
      "Dual-identity cutover NOT SAFE",
      "No Prescription entity",
      "No medication reconciliation entity",
    ],
    catalogClassification: "CURATED" as const,
  };
}

/** Pure function exported for tests — empty catalog handling. */
export function computeMaturityForEmptyCatalog(): ReturnType<typeof computeMaturitySummary> {
  return computeMaturitySummary(buildBaselineMaturityDomains(undefined));
}
