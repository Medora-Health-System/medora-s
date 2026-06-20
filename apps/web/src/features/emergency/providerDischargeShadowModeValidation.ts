/**
 * MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.4
 * Shadow mode validation against repo-available diagnosis traffic proxy.
 */

import { buildEdDischargeDiagnosisCatalog } from "./edDischargeDiagnosisCatalog";
import { loadIcd10DevSampleCatalog } from "./edDischargeCoverageAuditLevel2";
import { buildClinicalFamilyCoverageReport, buildTemplateToFamilyMap } from "./providerDischargeClinicalFamilyCoverage";
import { getClinicalConditionFamilyById } from "./providerDischargeConditionFamilies";
import {
  ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER,
  isEdDischargeConditionFamilyResolverEnabled,
} from "./providerDischargeConditionFamilyFeatureFlag";
import { resolveClinicalConditionFamily, type ClinicalConditionFamilyResolveContext } from "./providerDischargeConditionFamilyResolver";
import {
  QA_DISCHARGE_DIAGNOSIS_FIXTURE,
  SEED_ENCOUNTER_DIAGNOSIS_FIXTURE,
  type EncounterDiagnosisRecord,
  type EncounterDiagnosisSource,
} from "./providerDischargeEncounterDiagnosisFixtures";
import {
  compareRegistryResolverToFamilyResolver,
  type ShadowFamilyOutcomeClassification,
} from "./providerDischargeResolverShadowCompare";
import { resolveDischargeTemplateForDiagnosisGated } from "./providerDischargeTemplateResolverGate";
import {
  GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
  PROVIDER_DISCHARGE_TEMPLATE_REGISTRY,
  resolveProviderDischargeTemplateForDiagnosis,
} from "./providerDischargeTemplateRegistry";

export type ShadowValidationOutcome =
  | "IDENTICAL"
  | "SAFER_FAMILY"
  | "NEEDS_REVIEW"
  | "UNSAFE"
  | "REGRESSION_RISK"
  | "GENERIC_FALLBACK";

export type EncounterDiagnosisDistributionRow = {
  diagnosis: string;
  code: string;
  count: number;
  currentTemplate: string;
  currentFamily: string | null;
  riskCategory: string;
  source: EncounterDiagnosisSource;
};

export type EncounterDiagnosisDistributionReport = {
  datasetSources: EncounterDiagnosisSource[];
  totalUniqueDiagnoses: number;
  totalWeightedCount: number;
  topDiagnoses: EncounterDiagnosisDistributionRow[];
  topFamilies: Array<{ familyId: string; count: number }>;
  topIcdPrefixes: Array<{ prefix: string; count: number }>;
  topTemplates: Array<{ templateId: string; count: number }>;
  rows: EncounterDiagnosisDistributionRow[];
  notes: string[];
};

export type ShadowModeValidationRow = {
  diagnosis: string;
  code: string;
  registryTemplate: string;
  familyTemplate: string;
  outcome: ShadowValidationOutcome;
  explanation: string;
};

export type ShadowModeValidationReport = {
  totalCompared: number;
  outcomeCounts: Record<ShadowValidationOutcome, number>;
  identicalPercent: number;
  saferPercent: number;
  needsReviewPercent: number;
  regressionPercent: number;
  unsafePercent: number;
  genericFallbackPercent: number;
  parityPercent: number;
  rows: ShadowModeValidationRow[];
};

export type ClinicalResolverVarianceRow = {
  diagnosis: string;
  code: string;
  registryOutcome: string;
  familyOutcome: string;
  outcome: ShadowValidationOutcome;
  reason: string;
  risk: "low" | "moderate" | "high";
  recommendedResolution: string;
};

export type ClinicalResolverVarianceReport = {
  rows: ClinicalResolverVarianceRow[];
  regressionRiskCount: number;
  needsReviewCount: number;
  unsafeCount: number;
};

export type HighRiskRoutingProbe = {
  label: string;
  code: string;
  keywordLabel?: string;
  context?: ClinicalConditionFamilyResolveContext;
};

export type HighRiskFamilyRoutingRow = {
  condition: string;
  code: string;
  registryTemplate: string;
  familyTemplate: string;
  familyId: string | null;
  routingStatus: string | null;
  outcome: ShadowValidationOutcome;
  passed: boolean;
  detail: string;
};

export type HighRiskFamilyRoutingAudit = {
  probes: HighRiskFamilyRoutingRow[];
  allPassed: boolean;
  failedCount: number;
};

export type FamilyResolverReadinessLevel =
  | "NOT_READY"
  | "LIMITED_PILOT"
  | "READY_FOR_FLAGGED_PILOT"
  | "READY_FOR_PRODUCTION";

export type FamilyResolverReadinessScore = {
  coveragePercent: number;
  parityPercent: number;
  identicalPercent: number;
  saferPercent: number;
  needsReviewPercent: number;
  regressionPercent: number;
  unsafePercent: number;
  readinessLevel: FamilyResolverReadinessLevel;
  rationale: string[];
};

export type FeatureFlagProductionReadinessReport = {
  flagDefaultOff: boolean;
  offUsesRegistryOnly: boolean;
  onUsesFamilyWhenReady: boolean;
  onFallbackNeedsReview: boolean;
  onBlocksUnsafe: boolean;
  onBlocksDeferred: boolean;
  productionResolverUnchanged: boolean;
  allChecksPassed: boolean;
};

const HIGH_RISK_PROBES: HighRiskRoutingProbe[] = [
  { label: "Chest pain", code: "R07.9" },
  { label: "Stroke/TIA", code: "G45.9" },
  { label: "Seizure", code: "R56.9" },
  { label: "Syncope", code: "R55" },
  { label: "DVT", code: "I82.409" },
  { label: "PE", code: "I26.99" },
  { label: "Behavioral Health Crisis", code: "R45.851" },
  { label: "OB/GYN Bleeding", code: "N93.9", context: { patientSex: "female" } },
  { label: "DKA precautions keyword", code: "", keywordLabel: "DKA return precautions" },
  { label: "Hypoglycemia", code: "E16.2" },
  { label: "Hyperglycemia", code: "E11.65" },
  { label: "AKI", code: "N17.9" },
  { label: "CHF", code: "I50.9" },
  { label: "COPD", code: "J44.1" },
];

function icdPrefix(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return "";
  const dot = normalized.indexOf(".");
  return dot >= 0 ? normalized.slice(0, dot) : normalized.slice(0, 3);
}

function toPublicOutcome(outcome: ShadowFamilyOutcomeClassification): ShadowValidationOutcome {
  switch (outcome) {
    case "identical":
      return "IDENTICAL";
    case "safer_family":
      return "SAFER_FAMILY";
    case "needs_review":
      return "NEEDS_REVIEW";
    case "unsafe_no_map":
      return "UNSAFE";
    case "regression_risk":
      return "REGRESSION_RISK";
    case "generic_fallback":
      return "GENERIC_FALLBACK";
  }
}

function riskForOutcome(outcome: ShadowValidationOutcome): "low" | "moderate" | "high" {
  switch (outcome) {
    case "REGRESSION_RISK":
    case "UNSAFE":
      return "high";
    case "NEEDS_REVIEW":
      return "moderate";
    default:
      return "low";
  }
}

export function buildEncounterDiagnosisAuditDataset(
  extra: Array<{ code: string; label: string; source?: EncounterDiagnosisSource }> = []
): EncounterDiagnosisRecord[] {
  const counts = new Map<string, EncounterDiagnosisRecord>();

  const add = (code: string, label: string, source: EncounterDiagnosisSource, weight = 1) => {
    const key = `${code.trim().toUpperCase()}|${label.trim().toLowerCase()}|${source}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += weight;
      return;
    }
    counts.set(key, { code, label, source, count: weight });
  };

  for (const row of SEED_ENCOUNTER_DIAGNOSIS_FIXTURE) add(row.code, row.label, row.source, 2);
  for (const row of QA_DISCHARGE_DIAGNOSIS_FIXTURE) add(row.code, row.label, row.source, 3);
  for (const row of buildEdDischargeDiagnosisCatalog()) {
    add(row.code, row.label, row.source === "common_diagnosis" ? "common_diagnosis" : "template_canonical", 1);
  }
  for (const row of loadIcd10DevSampleCatalog()) add(row.code, row.label, "dev_icd_sample", 1);
  for (const row of extra) add(row.code, row.label, row.source ?? "injected", 1);

  return [...counts.values()];
}

export function buildEncounterDiagnosisDistributionReport(
  dataset: EncounterDiagnosisRecord[] = buildEncounterDiagnosisAuditDataset()
): EncounterDiagnosisDistributionReport {
  const templateToFamily = buildTemplateToFamilyMap();
  const rows: EncounterDiagnosisDistributionRow[] = dataset.map((record) => {
    const registry = resolveProviderDischargeTemplateForDiagnosis({
      code: record.code,
      displayName: record.label,
    });
    const family = resolveClinicalConditionFamily({ code: record.code, displayName: record.label });
    const familyId = family.familyId ?? templateToFamily.get(registry.template.id) ?? null;
    const familyDef = familyId ? getClinicalConditionFamilyById(familyId) : undefined;

    return {
      diagnosis: record.label,
      code: record.code,
      count: record.count,
      currentTemplate: registry.template.id,
      currentFamily: familyId,
      riskCategory: familyDef?.riskCategory ?? registry.template.riskCategory ?? "unknown",
      source: record.source,
    };
  });

  const familyCounts = new Map<string, number>();
  const prefixCounts = new Map<string, number>();
  const templateCounts = new Map<string, number>();

  for (const row of rows) {
    const fam = row.currentFamily ?? "unmapped";
    familyCounts.set(fam, (familyCounts.get(fam) ?? 0) + row.count);
    const prefix = icdPrefix(row.code);
    if (prefix) prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + row.count);
    templateCounts.set(row.currentTemplate, (templateCounts.get(row.currentTemplate) ?? 0) + row.count);
  }

  const sortDesc = (a: { count: number }, b: { count: number }) => b.count - a.count;

  return {
    datasetSources: [...new Set(dataset.map((d) => d.source))],
    totalUniqueDiagnoses: rows.length,
    totalWeightedCount: rows.reduce((s, r) => s + r.count, 0),
    topDiagnoses: [...rows].sort((a, b) => b.count - a.count).slice(0, 25),
    topFamilies: [...familyCounts.entries()]
      .map(([familyId, count]) => ({ familyId, count }))
      .sort(sortDesc)
      .slice(0, 15),
    topIcdPrefixes: [...prefixCounts.entries()]
      .map(([prefix, count]) => ({ prefix, count }))
      .sort(sortDesc)
      .slice(0, 15),
    topTemplates: [...templateCounts.entries()]
      .map(([templateId, count]) => ({ templateId, count }))
      .sort(sortDesc)
      .slice(0, 15),
    rows,
    notes: [
      "Dataset aggregates seed encounters, QA probes, COMMON_DIAGNOSES, template canonical codes, and dev ICD sample.",
      "Production encounter history requires API/DB export — inject rows via buildEncounterDiagnosisAuditDataset(extra).",
      "Weighted counts: seed×2, QA×3, others×1 to approximate relative test traffic.",
    ],
  };
}

export function buildClinicalTrafficDataset(
  dataset: EncounterDiagnosisRecord[] = buildEncounterDiagnosisAuditDataset()
): EncounterDiagnosisRecord[] {
  return dataset.filter((d) =>
    d.source === "seed_encounter" ||
    d.source === "qa_regression" ||
    d.source === "common_diagnosis"
  );
}

export function buildGatedShadowParityReport(
  dataset: EncounterDiagnosisRecord[] = buildClinicalTrafficDataset()
): {
  totalCompared: number;
  identicalToRegistryCount: number;
  safeGatedRouteCount: number;
  gatedParityPercent: number;
  registryIdenticalPercent: number;
  rows: Array<{
    diagnosis: string;
    code: string;
    registryTemplate: string;
    gatedTemplate: string;
    resolverPath: string;
    shadowOutcome: ShadowFamilyOutcomeClassification;
    matchesRegistry: boolean;
    safeGatedRoute: boolean;
  }>;
} {
  const rows = dataset.map((record) => {
    const registry = resolveProviderDischargeTemplateForDiagnosis({
      code: record.code,
      displayName: record.label,
    });
    const gated = resolveDischargeTemplateForDiagnosisGated(
      { code: record.code, displayName: record.label },
      { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
    );
    const cmp = compareRegistryResolverToFamilyResolver({
      code: record.code,
      displayName: record.label,
    });
    const matchesRegistry = registry.template.id === gated.template.id;
    const safeGatedRoute =
      matchesRegistry ||
      (gated.resolverPath === "family" &&
        (cmp.familyOutcome === "identical" || cmp.familyOutcome === "safer_family"));
    return {
      diagnosis: record.label,
      code: record.code,
      registryTemplate: registry.template.id,
      gatedTemplate: gated.template.id,
      resolverPath: gated.resolverPath,
      shadowOutcome: cmp.familyOutcome,
      matchesRegistry,
      safeGatedRoute,
    };
  });
  const identicalToRegistryCount = rows.filter((r) => r.matchesRegistry).length;
  const safeGatedRouteCount = rows.filter((r) => r.safeGatedRoute).length;
  const total = rows.length;
  const pct = (n: number) => (total === 0 ? 100 : Math.round((n / total) * 1000) / 10);
  return {
    totalCompared: total,
    identicalToRegistryCount,
    safeGatedRouteCount,
    gatedParityPercent: pct(safeGatedRouteCount),
    registryIdenticalPercent: pct(identicalToRegistryCount),
    rows,
  };
}

export function buildShadowModeValidationReport(
  dataset: EncounterDiagnosisRecord[] = buildEncounterDiagnosisAuditDataset()
): ShadowModeValidationReport {
  const rows: ShadowModeValidationRow[] = dataset.map((record) => {
    const cmp = compareRegistryResolverToFamilyResolver({
      code: record.code,
      displayName: record.label,
    });
    return {
      diagnosis: record.label,
      code: record.code,
      registryTemplate: cmp.registryTemplateId,
      familyTemplate: cmp.familyTemplateId,
      outcome: toPublicOutcome(cmp.familyOutcome),
      explanation: cmp.explanation,
    };
  });

  const total = rows.length;
  const outcomeCounts: Record<ShadowValidationOutcome, number> = {
    IDENTICAL: 0,
    SAFER_FAMILY: 0,
    NEEDS_REVIEW: 0,
    UNSAFE: 0,
    REGRESSION_RISK: 0,
    GENERIC_FALLBACK: 0,
  };
  for (const row of rows) outcomeCounts[row.outcome]++;

  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 1000) / 10);
  const parityNumerator = outcomeCounts.IDENTICAL + outcomeCounts.SAFER_FAMILY;

  return {
    totalCompared: total,
    outcomeCounts,
    identicalPercent: pct(outcomeCounts.IDENTICAL),
    saferPercent: pct(outcomeCounts.SAFER_FAMILY),
    needsReviewPercent: pct(outcomeCounts.NEEDS_REVIEW),
    regressionPercent: pct(outcomeCounts.REGRESSION_RISK),
    unsafePercent: pct(outcomeCounts.UNSAFE),
    genericFallbackPercent: pct(outcomeCounts.GENERIC_FALLBACK),
    parityPercent: pct(parityNumerator),
    rows,
  };
}

export function buildClinicalResolverVarianceReport(
  shadow: ShadowModeValidationReport = buildShadowModeValidationReport()
): ClinicalResolverVarianceReport {
  const varianceOutcomes: ShadowValidationOutcome[] = ["REGRESSION_RISK", "NEEDS_REVIEW", "UNSAFE"];

  const rows: ClinicalResolverVarianceRow[] = shadow.rows
    .filter((r) => varianceOutcomes.includes(r.outcome))
    .map((r) => ({
      diagnosis: r.diagnosis,
      code: r.code,
      registryOutcome: r.registryTemplate,
      familyOutcome: r.familyTemplate,
      outcome: r.outcome,
      reason: r.explanation,
      risk: riskForOutcome(r.outcome),
      recommendedResolution:
        r.outcome === "REGRESSION_RISK"
          ? "Block family routing or add age/sex guardrails before flag pilot."
          : r.outcome === "UNSAFE"
            ? "Keep UNSAFE_DO_NOT_MAP; gated resolver must fall back to registry."
            : "Clinical review — promote family to READY or align registry mapping.",
    }));

  return {
    rows,
    regressionRiskCount: rows.filter((r) => r.outcome === "REGRESSION_RISK").length,
    needsReviewCount: rows.filter((r) => r.outcome === "NEEDS_REVIEW").length,
    unsafeCount: rows.filter((r) => r.outcome === "UNSAFE").length,
  };
}

export function buildHighRiskFamilyRoutingAudit(): HighRiskFamilyRoutingAudit {
  const probes: HighRiskFamilyRoutingRow[] = HIGH_RISK_PROBES.map((probe) => {
    const displayName = probe.keywordLabel ?? probe.label;
    const cmp = compareRegistryResolverToFamilyResolver({
      code: probe.code,
      displayName,
      context: probe.context,
    });
    const family = resolveClinicalConditionFamily({
      code: probe.code,
      displayName,
      context: probe.context,
    });

    const outcome = toPublicOutcome(cmp.familyOutcome);
    const lowRiskTemplates = ["wellness_visit_v1", "uri_cough_v1", GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID];

    let passed = true;
    let detail = cmp.explanation;

    if (family.familyId === "pe_evaluation_discharge" || family.familyId === "diabetes_dka_return_precautions") {
      passed =
        family.familyId !== "pe_evaluation_discharge" &&
        family.familyId !== "diabetes_dka_return_precautions";
      detail = `UNSAFE family ${family.familyId} must not route independently`;
    }
    if (
      ["PE", "DVT"].some((k) => probe.label.includes(k)) &&
      lowRiskTemplates.includes(cmp.familyTemplateId) &&
      !lowRiskTemplates.includes(cmp.registryTemplateId)
    ) {
      passed = false;
      detail = "High-risk diagnosis routed to low-risk family template";
    }
    if (probe.label.includes("DKA")) {
      passed = family.familyId !== "diabetes_dka_return_precautions";
      if (cmp.familyTemplateId === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID) {
        detail =
          "UNSAFE DKA family correctly excluded; registry retains DKA template until family promotion.";
      }
    }
    if (probe.label.includes("OB/GYN") && probe.context?.patientSex === "female") {
      passed = passed && family.familyId === "obgyn_bleeding_pelvic_pain";
    }
    if (probe.code === "I26.99") {
      passed = passed && family.familyId !== "pe_evaluation_discharge";
    }

    return {
      condition: probe.label,
      code: probe.code || displayName,
      registryTemplate: cmp.registryTemplateId,
      familyTemplate: cmp.familyTemplateId,
      familyId: family.familyId,
      routingStatus: family.family?.routingStatus ?? null,
      outcome,
      passed,
      detail,
    };
  });

  const failedCount = probes.filter((p) => !p.passed).length;
  return { probes, allPassed: failedCount === 0, failedCount };
}

export function buildFamilyResolverReadinessScore(
  shadow: ShadowModeValidationReport = buildShadowModeValidationReport(
    buildClinicalTrafficDataset()
  ),
  coverage: { coveragePercent: number } = buildClinicalFamilyCoverageReport(),
  gated: { gatedParityPercent: number } = buildGatedShadowParityReport()
): FamilyResolverReadinessScore {
  const { identicalPercent, saferPercent, needsReviewPercent, regressionPercent, unsafePercent } = shadow;
  const parityPercent = shadow.parityPercent;
  const gatedParityPercent = gated.gatedParityPercent;

  let readinessLevel: FamilyResolverReadinessLevel = "NOT_READY";
  const rationale: string[] = [];

  if (
    gatedParityPercent >= 98 &&
    regressionPercent === 0 &&
    unsafePercent === 0 &&
    needsReviewPercent <= 5 &&
    coverage.coveragePercent >= 95
  ) {
    readinessLevel = "READY_FOR_PRODUCTION";
    rationale.push("Gated parity ≥98%, zero regression/unsafe on clinical traffic, coverage ≥95%.");
  } else if (
    gatedParityPercent >= 95 &&
    regressionPercent <= 2 &&
    unsafePercent === 0 &&
    coverage.coveragePercent >= 95
  ) {
    readinessLevel = "READY_FOR_FLAGGED_PILOT";
    rationale.push("Gated parity ≥95% on clinical traffic — suitable for flagged pilot only.");
  } else if (parityPercent >= 90 && coverage.coveragePercent >= 90) {
    readinessLevel = "LIMITED_PILOT";
    rationale.push("Family shadow parity ≥90% on clinical traffic — monitoring only.");
  } else if (gatedParityPercent >= 90) {
    readinessLevel = "LIMITED_PILOT";
    rationale.push("Gated resolver matches registry ≥90% even when raw family resolver diverges.");
  } else {
    rationale.push("Parity or coverage below pilot thresholds.");
  }

  rationale.push(
    `Clinical traffic subset: ${shadow.totalCompared} diagnoses; full audit dataset available separately.`
  );
  rationale.push(`Raw family shadow parity: ${parityPercent}%; gated (flag ON) parity: ${gatedParityPercent}%.`);

  return {
    coveragePercent: coverage.coveragePercent,
    parityPercent: gatedParityPercent,
    identicalPercent,
    saferPercent,
    needsReviewPercent,
    regressionPercent,
    unsafePercent,
    readinessLevel,
    rationale,
  };
}

export function buildFeatureFlagProductionReadinessReport(): FeatureFlagProductionReadinessReport {
  const flagDefaultOff = ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER === false;

  const offResult = resolveDischargeTemplateForDiagnosisGated(
    { code: "R11.2", displayName: "Nausea" },
    { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: false } }
  );

  const onReady = resolveDischargeTemplateForDiagnosisGated(
    { code: "E86.0", displayName: "Dehydration" },
    { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
  );

  const onNeedsReview = resolveDischargeTemplateForDiagnosisGated(
    { code: "", displayName: "Foley catheter precautions" },
    { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
  );

  const onUnsafe = resolveDischargeTemplateForDiagnosisGated(
    { code: "I26.99", displayName: "PE" },
    { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
  );

  const onDeferred = resolveDischargeTemplateForDiagnosisGated(
    { code: "", displayName: "dialysis return precautions" },
    { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
  );

  const registryOnly = resolveProviderDischargeTemplateForDiagnosis({
    code: "R11.2",
    displayName: "Nausea",
  });

  const offUsesRegistryOnly =
    offResult.resolverPath === "registry" && offResult.template.id === registryOnly.template.id;

  const onUsesFamilyWhenReady =
    onReady.resolverPath === "family" && onReady.template.id === "dehydration_v1";

  const onFallbackNeedsReview = onNeedsReview.resolverPath === "family_fallback_registry";

  const onBlocksUnsafe =
    onUnsafe.resolverPath !== "family" &&
    onUnsafe.template.id ===
      resolveProviderDischargeTemplateForDiagnosis({ code: "I26.99", displayName: "PE" }).template.id;

  const onBlocksDeferred = onDeferred.resolverPath === "family_fallback_registry";

  const productionResolverUnchanged =
    isEdDischargeConditionFamilyResolverEnabled() === false &&
    PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.length > 0;

  const allChecksPassed =
    flagDefaultOff &&
    offUsesRegistryOnly &&
    onUsesFamilyWhenReady &&
    onFallbackNeedsReview &&
    onBlocksUnsafe &&
    onBlocksDeferred &&
    productionResolverUnchanged;

  return {
    flagDefaultOff,
    offUsesRegistryOnly,
    onUsesFamilyWhenReady,
    onFallbackNeedsReview,
    onBlocksUnsafe,
    onBlocksDeferred,
    productionResolverUnchanged,
    allChecksPassed,
  };
}
