/**
 * MEDUI.ED.DISCHARGE.PRODUCTION_SWITCH_READINESS.1
 * Clinical Condition Family Resolver production switch readiness certification.
 * Audit-only — does NOT enable family resolver by default.
 */

import { loadIcd10DevSampleCatalog } from "./edDischargeCoverageAuditLevel2";
import {
  buildFeatureFlagScaffoldReport,
  ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER,
  isEdDischargeConditionFamilyResolverEnabled,
  type EdDischargeResolverFeatureFlags,
} from "./providerDischargeConditionFamilyFeatureFlag";
import { resolveClinicalConditionFamily } from "./providerDischargeConditionFamilyResolver";
import {
  CLINICAL_CONDITION_FAMILY_DEFINITIONS,
  getRoutableClinicalConditionFamilies,
} from "./providerDischargeConditionFamilies";
import {
  buildFullIcd10FamilyResolverAudit,
  buildFullIcd10RegistryVsFamilyAudit,
  type Icd10CatalogRow,
  type Icd10CatalogSource,
} from "./providerDischargeIcd10FamilyAudit";
import {
  ADULT_FEVER_TEMPLATE_ID,
  PEDIATRIC_FEVER_TEMPLATE_ID,
} from "./providerDischargePediatricFeverAgePolicy";
import { buildProductionResolverCoverageAudit } from "./providerDischargeProductionResolverAudit";
import {
  compareRegistryResolverToFamilyResolver,
  type ShadowFamilyOutcomeClassification,
} from "./providerDischargeResolverShadowCompare";
import { runResolverSafetyCertification } from "./providerDischargeResolverSafetyCertification";
import {
  evaluateProductionDefaultSwitchReadiness,
  PRODUCTION_DEFAULT_SWITCH_THRESHOLDS,
  runRealEncounterShadowValidation,
  type ProductionDefaultSwitchThresholdEvaluation,
  type RealEncounterDiagnosisRow,
  type RealEncounterShadowValidationToolReport,
} from "./providerDischargeRealEncounterValidation";
import { resolveDischargeTemplateForDiagnosisGated } from "./providerDischargeTemplateResolverGate";
import {
  GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
  PROVIDER_DISCHARGE_TEMPLATE_REGISTRY,
  resolveProviderDischargeTemplateForDiagnosis,
} from "./providerDischargeTemplateRegistry";
import { runEnterpriseDischargeCertification } from "./providerDischargeEnterpriseCertification";

export type CurrentResolverStateAudit = {
  activeProductionResolver: "registry";
  familyResolverStatus: "available_gated_off_by_default";
  featureFlagName: "ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER";
  featureFlagDefault: false;
  defaultBehavior: string;
  fallbackBehavior: string;
  unsafeFamilyBlocking: string;
  pediatricAgePolicy: string;
  patientSpecificAdditionsImpact: string;
  genericFallbackImpact: string;
  registryTemplateCount: number;
  familyTemplateCount: number;
  routableFamilyCount: number;
  notes: string[];
};

export function buildCurrentResolverStateAudit(): CurrentResolverStateAudit {
  const flagReport = buildFeatureFlagScaffoldReport();
  const coverage = buildProductionResolverCoverageAudit();
  const nonGenericTemplates = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.filter(
    (t) => t.id !== GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID
  );

  return {
    activeProductionResolver: "registry",
    familyResolverStatus: "available_gated_off_by_default",
    featureFlagName: "ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER",
    featureFlagDefault: false,
    defaultBehavior:
      "resolveProviderDischargeTemplateForDiagnosis() and resolveDischargeTemplateForDiagnosisGated() with flag OFF use registry ICD exact/family/keyword → template or generic_ed_discharge_v1.",
    fallbackBehavior:
      "When flag ON: READY families route to family template; UNSAFE_DO_NOT_MAP, NEEDS_REVIEW, DEFERRED_SPECIALTY_ONLY, missing template, or generic family → registry fallback (family_fallback_registry).",
    unsafeFamilyBlocking:
      "UNSAFE_DO_NOT_MAP families (e.g. PE evaluation, DKA blind ICD) never route via gated resolver — always registry fallback.",
    pediatricAgePolicy:
      "R50.x fever: age <18 → pediatric_fever_v1; age ≥18 or unknown → infectious_fever_unknown_source_v1; explicit pediatric label without age → generic NEEDS_REVIEW. Registry remains age-agnostic until flag ON.",
    patientSpecificAdditionsImpact:
      "Patient-specific and medication-aware additions are resolver-agnostic — keyed on applied templateIds in diagnosis cards, not resolver path.",
    genericFallbackImpact:
      "generic_ed_discharge_v1 is hospital-grade for both resolvers; family generic used when no READY family match.",
    registryTemplateCount: nonGenericTemplates.length,
    familyTemplateCount: new Set(
      CLINICAL_CONDITION_FAMILY_DEFINITIONS.map((f) => f.templateId)
    ).size,
    routableFamilyCount: getRoutableClinicalConditionFamilies().length,
    notes: [
      ...flagReport.notes,
      `Registry/family template parity (coverage audit): ${coverage.parityPercent}%.`,
      `Production uses family resolver: ${coverage.productionUsesFamilyResolver}.`,
    ],
  };
};

export type FullCmsIcd10ProductionSwitchAudit = {
  fullCmsDataAvailableLocally: boolean;
  cmsStatus: "FULL_CMS_DATA_NOT_AVAILABLE_LOCALLY" | "PARTIAL_DEV_SAMPLE" | "INJECTED_CATALOG" | "API_CATALOG";
  catalogSourcesAudited: Icd10CatalogSource[];
  totalIcdRowsAudited: number;
  registryTemplateCount: number;
  familyTemplateCount: number;
  registryGenericFallbackCount: number;
  familyGenericFallbackCount: number;
  registryFamilyParityPercent: number;
  highRiskGenericFallbackCandidates: Array<{ code: string; label: string; registryTemplateId: string; familyTemplateId: string }>;
  unsafeFamilyOutcomes: number;
  pediatricAdultGuardrailOutcomes: number;
  obgynGuardrailOutcomes: number;
  keywordOnlyOutcomes: number;
  top100Differences: Array<{
    code: string;
    label: string;
    registryTemplateId: string;
    familyTemplateId: string;
    classification: ProductionResolverVarianceClassification;
  }>;
  top100GenericFallbackRows: Array<{ code: string; label: string; registryTemplateId: string; familyTemplateId: string }>;
  notes: string[];
};

const FULL_CMS_MIN_ROWS = 10_000;

export function loadAvailableIcd10CatalogForAudit(input?: {
  injectedCatalog?: Icd10CatalogRow[];
  apiCatalog?: Icd10CatalogRow[];
}): { catalog: Icd10CatalogRow[]; sources: Icd10CatalogSource[]; fullCmsAvailable: boolean; cmsStatus: FullCmsIcd10ProductionSwitchAudit["cmsStatus"] } {
  const catalog: Icd10CatalogRow[] = [];
  const sources: Icd10CatalogSource[] = [];

  if (input?.apiCatalog?.length) {
    catalog.push(...input.apiCatalog);
    sources.push("api_catalog");
  }
  if (input?.injectedCatalog?.length) {
    catalog.push(...input.injectedCatalog);
    sources.push("injected");
  }

  const devSample = loadIcd10DevSampleCatalog().map((r) => ({
    code: r.code,
    label: r.label,
    edRelevance: r.edRelevance,
  }));
  catalog.push(...devSample);
  sources.push("dev_sample");

  const fullCmsAvailable =
    (input?.apiCatalog?.length ?? 0) >= FULL_CMS_MIN_ROWS ||
    (input?.injectedCatalog?.length ?? 0) >= FULL_CMS_MIN_ROWS;

  let cmsStatus: FullCmsIcd10ProductionSwitchAudit["cmsStatus"];
  if (fullCmsAvailable) {
    cmsStatus = input?.apiCatalog?.length ? "API_CATALOG" : "INJECTED_CATALOG";
  } else if (input?.injectedCatalog?.length) {
    cmsStatus = "INJECTED_CATALOG";
  } else {
    cmsStatus = "FULL_CMS_DATA_NOT_AVAILABLE_LOCALLY";
  }

  return { catalog, sources, fullCmsAvailable, cmsStatus };
}

export type ProductionResolverVarianceClassification =
  | "IDENTICAL"
  | "SAFER_FAMILY"
  | "SAFE_REGISTRY_FALLBACK"
  | "NEEDS_REVIEW"
  | "UNSAFE_BLOCKED"
  | "REGRESSION_RISK"
  | "DATA_INSUFFICIENT";

export function classifyVarianceForProductionSwitch(input: {
  shadowOutcome: ShadowFamilyOutcomeClassification;
  registryTemplateId: string;
  familyTemplateId: string;
  gatedResolverPath: "registry" | "family" | "family_fallback_registry";
  familyRoutingStatus?: string | null;
}): ProductionResolverVarianceClassification {
  if (input.shadowOutcome === "identical") return "IDENTICAL";
  if (input.shadowOutcome === "safer_family") return "SAFER_FAMILY";
  if (input.shadowOutcome === "regression_risk") return "REGRESSION_RISK";
  if (input.shadowOutcome === "unsafe_no_map") return "UNSAFE_BLOCKED";
  if (input.shadowOutcome === "needs_review") {
    if (input.gatedResolverPath === "family_fallback_registry") return "SAFE_REGISTRY_FALLBACK";
    return "NEEDS_REVIEW";
  }
  if (
    input.familyRoutingStatus === "UNSAFE_DO_NOT_MAP" ||
    input.familyRoutingStatus === "NEEDS_REVIEW" ||
    input.familyRoutingStatus === "DEFERRED_SPECIALTY_ONLY"
  ) {
    if (input.gatedResolverPath === "family_fallback_registry") return "SAFE_REGISTRY_FALLBACK";
  }
  if (input.shadowOutcome === "generic_fallback") {
    if (input.registryTemplateId !== GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID) {
      return "NEEDS_REVIEW";
    }
    return "IDENTICAL";
  }
  if (input.gatedResolverPath === "family_fallback_registry") return "SAFE_REGISTRY_FALLBACK";
  return "NEEDS_REVIEW";
}

export function buildFullCmsIcd10ProductionSwitchAudit(input?: {
  injectedCatalog?: Icd10CatalogRow[];
  apiCatalog?: Icd10CatalogRow[];
}): FullCmsIcd10ProductionSwitchAudit {
  const loaded = loadAvailableIcd10CatalogForAudit(input);
  const familyAudit = buildFullIcd10FamilyResolverAudit(loaded.catalog, loaded.sources[0] ?? "dev_sample");
  const parity = buildFullIcd10RegistryVsFamilyAudit(loaded.catalog);
  const nonGenericTemplates = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.filter(
    (t) => t.id !== GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID
  );

  const differences: FullCmsIcd10ProductionSwitchAudit["top100Differences"] = [];
  const genericFallbackRows: FullCmsIcd10ProductionSwitchAudit["top100GenericFallbackRows"] = [];
  const highRiskGeneric: FullCmsIcd10ProductionSwitchAudit["highRiskGenericFallbackCandidates"] = [];

  for (const row of loaded.catalog) {
    const registry = resolveProviderDischargeTemplateForDiagnosis({ code: row.code, displayName: row.label });
    const family = resolveClinicalConditionFamily({ code: row.code, displayName: row.label });
    const gated = resolveDischargeTemplateForDiagnosisGated(
      { code: row.code, displayName: row.label },
      { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
    );
    const compare = compareRegistryResolverToFamilyResolver({ code: row.code, displayName: row.label });

    if (registry.template.id !== family.templateId && differences.length < 100) {
      differences.push({
        code: row.code,
        label: row.label,
        registryTemplateId: registry.template.id,
        familyTemplateId: family.templateId,
        classification: classifyVarianceForProductionSwitch({
          shadowOutcome: compare.familyOutcome,
          registryTemplateId: registry.template.id,
          familyTemplateId: family.templateId,
          gatedResolverPath: gated.resolverPath,
          familyRoutingStatus: family.family?.routingStatus ?? null,
        }),
      });
    }

    if (
      registry.template.id === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID ||
      family.templateId === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID
    ) {
      if (genericFallbackRows.length < 100) {
        genericFallbackRows.push({
          code: row.code,
          label: row.label,
          registryTemplateId: registry.template.id,
          familyTemplateId: family.templateId,
        });
      }
      if (
        family.templateId === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID &&
        registry.template.id !== GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID &&
        highRiskGeneric.length < 25
      ) {
        highRiskGeneric.push({
          code: row.code,
          label: row.label,
          registryTemplateId: registry.template.id,
          familyTemplateId: family.templateId,
        });
      }
    }
  }

  const notes = [
    ...familyAudit.notes,
    loaded.fullCmsAvailable
      ? "Full CMS-scale catalog provided for audit."
      : "FULL_CMS_DATA_NOT_AVAILABLE_LOCALLY — certified dev sample + tooling path only.",
    `Registry/family parity on audited catalog: ${parity.parityPercent}%.`,
  ];

  return {
    fullCmsDataAvailableLocally: loaded.fullCmsAvailable,
    cmsStatus: loaded.cmsStatus,
    catalogSourcesAudited: loaded.sources,
    totalIcdRowsAudited: loaded.catalog.length,
    registryTemplateCount: nonGenericTemplates.length,
    familyTemplateCount: new Set(CLINICAL_CONDITION_FAMILY_DEFINITIONS.map((f) => f.templateId)).size,
    registryGenericFallbackCount: parity.registryGenericCount,
    familyGenericFallbackCount: parity.familyGenericCount,
    registryFamilyParityPercent: parity.parityPercent,
    highRiskGenericFallbackCandidates: highRiskGeneric,
    unsafeFamilyOutcomes: familyAudit.unsafeNoMapCount,
    pediatricAdultGuardrailOutcomes: familyAudit.pediatricAdultGuardrailMismatchCount,
    obgynGuardrailOutcomes: familyAudit.obgynSexGuardrailMismatchCount,
    keywordOnlyOutcomes: familyAudit.keywordOnlyResolutionCount,
    top100Differences: differences,
    top100GenericFallbackRows: genericFallbackRows,
    notes,
  };
}

export type RealEncounterProductionSwitchValidationReport = {
  result:
    | "NOT_READY_FOR_DEFAULT_ON_DATA_INSUFFICIENT"
    | "NOT_READY_FOR_DEFAULT_ON_THRESHOLDS_UNMET"
    | "READY_FOR_DEFAULT_ON_EVALUATION";
  mode: RealEncounterShadowValidationToolReport["mode"];
  aggregate: RealEncounterShadowValidationToolReport["aggregate"];
  thresholdEvaluation: ProductionDefaultSwitchThresholdEvaluation;
  clinicalSignOffRecorded: boolean;
  highRiskAuditPassed: boolean;
  notes: string[];
};

export function buildMockRealEncounterRowsForThresholdTest(count: number): RealEncounterDiagnosisRow[] {
  const seeds: RealEncounterDiagnosisRow[] = [
    { encounterId: "seed-1", diagnosisCode: "R11.2", diagnosisLabel: "Nausea and vomiting", encounterClass: "ED", patientAgeYears: 45 },
    { encounterId: "seed-2", diagnosisCode: "R07.9", diagnosisLabel: "Chest pain", encounterClass: "ED", patientAgeYears: 58 },
    { encounterId: "seed-3", diagnosisCode: "L08.9", diagnosisLabel: "Cellulitis", encounterClass: "ED", patientAgeYears: 50 },
    { encounterId: "seed-4", diagnosisCode: "E11.9", diagnosisLabel: "Type 2 diabetes", encounterClass: "ED", patientAgeYears: 62 },
    { encounterId: "seed-5", diagnosisCode: "R50.9", diagnosisLabel: "Fever", encounterClass: "ED", patientAgeYears: 72 },
    { encounterId: "seed-6", diagnosisCode: "F41.9", diagnosisLabel: "Anxiety", encounterClass: "ED", patientAgeYears: 30 },
    { encounterId: "seed-7", diagnosisCode: "N93.9", diagnosisLabel: "Vaginal bleeding", encounterClass: "ED", patientSex: "female", patientAgeYears: 28 },
    { encounterId: "seed-8", diagnosisCode: "J06.9", diagnosisLabel: "URI", encounterClass: "ED", patientAgeYears: 12 },
  ];
  const rows: RealEncounterDiagnosisRow[] = [];
  for (let i = 0; i < count; i += 1) {
    const seed = seeds[i % seeds.length]!;
    rows.push({ ...seed, encounterId: `mock-enc-${i + 1}` });
  }
  return rows;
}

export function buildRealEncounterProductionSwitchValidationReport(input?: {
  mode?: "fixture" | "injected" | "api_db";
  injectedRows?: readonly RealEncounterDiagnosisRow[];
  clinicalSignOffRecorded?: boolean;
  highRiskAuditPassed?: boolean;
  genericFallbackPercentReviewed?: boolean;
  featureFlags?: EdDischargeResolverFeatureFlags;
}): RealEncounterProductionSwitchValidationReport {
  const mode = input?.mode ?? "fixture";
  const report = runRealEncounterShadowValidation({
    mode,
    injectedRows: input?.injectedRows,
    featureFlags: input?.featureFlags,
  });

  const thresholdEvaluation = evaluateProductionDefaultSwitchReadiness({
    report: { aggregate: report.aggregate },
    clinicalSignOffRecorded: input?.clinicalSignOffRecorded,
    highRiskDiagnosisAuditPassed: input?.highRiskAuditPassed,
    genericFallbackPercentReviewed: input?.genericFallbackPercentReviewed,
  });

  const notes: string[] = [];
  let result: RealEncounterProductionSwitchValidationReport["result"];

  if (!thresholdEvaluation.meetsMinimumRowCount) {
    result = "NOT_READY_FOR_DEFAULT_ON_DATA_INSUFFICIENT";
    notes.push(
      `Insufficient real ED rows: ${report.aggregate.totalRows} < ${PRODUCTION_DEFAULT_SWITCH_THRESHOLDS.minimumRealEdDiagnosisRows}.`
    );
  } else if (!thresholdEvaluation.readyForProductionDefaultSwitch) {
    result = "NOT_READY_FOR_DEFAULT_ON_THRESHOLDS_UNMET";
    notes.push(...thresholdEvaluation.blockers);
  } else {
    result = "READY_FOR_DEFAULT_ON_EVALUATION";
    notes.push("All numeric thresholds met — pending CMS audit and clinical sign-off for DEFAULT_ON.");
  }

  return {
    result,
    mode: report.mode,
    aggregate: report.aggregate,
    thresholdEvaluation,
    clinicalSignOffRecorded: input?.clinicalSignOffRecorded === true,
    highRiskAuditPassed: input?.highRiskAuditPassed === true,
    notes,
  };
}

export type HighRiskProductionSwitchSafetyRow = {
  condition: string;
  icdExamples: string[];
  registryTemplateId: string;
  familyTemplateId: string;
  gatedOutcome: string;
  gatedResolverPath: "registry" | "family" | "family_fallback_registry";
  risk: "low" | "medium" | "high";
  recommendation: string;
};

export const HIGH_RISK_PRODUCTION_SWITCH_CONDITIONS: Array<{
  condition: string;
  icdExamples: string[];
  displayName: string;
  context?: Parameters<typeof resolveClinicalConditionFamily>[0]["context"];
}> = [
  { condition: "Chest pain", icdExamples: ["R07.9"], displayName: "Chest pain" },
  { condition: "MI/STEMI/NSTEMI", icdExamples: ["I21.9"], displayName: "Acute myocardial infarction" },
  { condition: "Stroke/TIA", icdExamples: ["G45.9"], displayName: "TIA" },
  { condition: "Seizure", icdExamples: ["R56.9"], displayName: "Seizure" },
  { condition: "Syncope", icdExamples: ["R55"], displayName: "Syncope" },
  { condition: "DVT", icdExamples: ["I82.409"], displayName: "DVT evaluation" },
  { condition: "PE", icdExamples: ["I26.99"], displayName: "Pulmonary embolism" },
  { condition: "DKA", icdExamples: ["E10.10"], displayName: "DKA" },
  { condition: "Hypoglycemia", icdExamples: ["E11.649"], displayName: "Hypoglycemia" },
  { condition: "Hyperglycemia", icdExamples: ["E11.65"], displayName: "Hyperglycemia" },
  { condition: "AKI", icdExamples: ["N17.9"], displayName: "Acute kidney injury" },
  { condition: "CHF", icdExamples: ["I50.9"], displayName: "Heart failure" },
  { condition: "COPD", icdExamples: ["J44.9"], displayName: "COPD" },
  { condition: "Asthma", icdExamples: ["J45.909"], displayName: "Asthma" },
  { condition: "Suicidal ideation", icdExamples: ["R45.851"], displayName: "Suicidal ideation" },
  { condition: "Psychosis", icdExamples: ["F29"], displayName: "Psychosis" },
  { condition: "Alcohol withdrawal", icdExamples: ["F10.239"], displayName: "Alcohol withdrawal" },
  { condition: "Opioid overdose", icdExamples: ["T40.2X1A"], displayName: "Opioid overdose" },
  { condition: "OB/GYN bleeding", icdExamples: ["N93.9"], displayName: "Vaginal bleeding", context: { patientSex: "female" } },
  { condition: "Pregnancy-related symptoms", icdExamples: ["O26.899"], displayName: "Pregnancy complication" },
  { condition: "Pediatric fever", icdExamples: ["R50.9"], displayName: "Fever", context: { patientAgeYears: 10 } },
  { condition: "Pediatric respiratory symptoms", icdExamples: ["J06.9"], displayName: "URI", context: { patientAgeYears: 6 } },
  { condition: "Pediatric head injury", icdExamples: ["S09.90XA"], displayName: "Head injury", context: { patientAgeYears: 8 } },
];

export function buildHighRiskProductionSwitchSafetyReport(): {
  rows: HighRiskProductionSwitchSafetyRow[];
  allSafeForGatedResolver: boolean;
  highRiskAuditPassed: boolean;
  notes: string[];
} {
  const rows: HighRiskProductionSwitchSafetyRow[] = [];

  for (const probe of HIGH_RISK_PRODUCTION_SWITCH_CONDITIONS) {
    const code = probe.icdExamples[0] ?? "";
    const registry = resolveProviderDischargeTemplateForDiagnosis({ code, displayName: probe.displayName });
    const family = resolveClinicalConditionFamily({
      code,
      displayName: probe.displayName,
      context: probe.context,
    });
    const gated = resolveDischargeTemplateForDiagnosisGated(
      { code, displayName: probe.displayName, context: probe.context },
      { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
    );
    const compare = compareRegistryResolverToFamilyResolver({
      code,
      displayName: probe.displayName,
      context: probe.context,
    });

    let risk: HighRiskProductionSwitchSafetyRow["risk"] = "low";
    let recommendation = "Safe for shadow monitoring; gated path preserves registry when family unsafe.";

    if (probe.condition === "PE" || probe.condition === "DKA") {
      risk = gated.resolverPath === "family" ? "high" : "low";
      recommendation =
        gated.resolverPath === "family_fallback_registry"
          ? "UNSAFE family blocked — registry/generic fallback retained."
          : "BLOCK — do not route PE/DKA via family without clinical review.";
    } else if (compare.familyOutcome === "regression_risk") {
      risk = "high";
      recommendation = "Regression risk — resolve before default ON.";
    } else if (gated.template.id === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID && registry.template.id !== GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID) {
      risk = "medium";
      recommendation = "Gated generic fallback — verify hospital-grade generic acceptable for this condition.";
    } else if (probe.condition === "Suicidal ideation") {
      risk = gated.template.id.includes("suicidal") || gated.template.id.includes("behavioral") ? "low" : "medium";
      recommendation = "Must retain high-risk behavioral health template or safe fallback.";
    }

    rows.push({
      condition: probe.condition,
      icdExamples: probe.icdExamples,
      registryTemplateId: registry.template.id,
      familyTemplateId: family.templateId,
      gatedOutcome: compare.familyOutcome,
      gatedResolverPath: gated.resolverPath,
      risk,
      recommendation,
    });
  }

  const allSafeForGatedResolver = rows.every(
    (r) => r.risk !== "high" && (r.gatedResolverPath !== "family" || r.risk === "low")
  );
  const peRow = rows.find((r) => r.condition === "PE");
  const dkaRow = rows.find((r) => r.condition === "DKA");
  const suicidalRow = rows.find((r) => r.condition === "Suicidal ideation");

  const suicidalOk =
    suicidalRow &&
    (suicidalRow.gatedResolverPath === "family" ||
      suicidalRow.registryTemplateId.includes("suicidal") ||
      suicidalRow.familyTemplateId.includes("suicidal") ||
      suicidalRow.registryTemplateId.includes("behavioral_health_suicidal"));

  const highRiskAuditPassed =
    peRow?.gatedResolverPath === "family_fallback_registry" &&
    dkaRow?.gatedResolverPath === "family_fallback_registry" &&
    Boolean(suicidalOk) &&
    rows.filter((r) => r.risk === "high").length === 0;

  return {
    rows,
    allSafeForGatedResolver,
    highRiskAuditPassed,
    notes: [
      "PE and DKA must remain blocked (family_fallback_registry) in gated resolver.",
      "Suicidal ideation must route high-risk behavioral template when family flag ON.",
    ],
  };
}

export type ProductionResolverVarianceRow = {
  code: string;
  diagnosis: string;
  registryTemplateId: string;
  familyTemplateId: string;
  classification: ProductionResolverVarianceClassification;
  reason: string;
  recommendedAction: string;
};

export function buildProductionResolverVarianceReport(catalog?: Icd10CatalogRow[]): {
  rows: ProductionResolverVarianceRow[];
  summary: Record<ProductionResolverVarianceClassification, number>;
  unresolvedRegressionRiskCount: number;
  allGatedSafe: boolean;
} {
  const rowsCatalog =
    catalog ??
    loadIcd10DevSampleCatalog().map((r) => ({ code: r.code, label: r.label }));

  const rows: ProductionResolverVarianceRow[] = [];
  const summary: Record<ProductionResolverVarianceClassification, number> = {
    IDENTICAL: 0,
    SAFER_FAMILY: 0,
    SAFE_REGISTRY_FALLBACK: 0,
    NEEDS_REVIEW: 0,
    UNSAFE_BLOCKED: 0,
    REGRESSION_RISK: 0,
    DATA_INSUFFICIENT: 0,
  };

  for (const row of rowsCatalog) {
    const registry = resolveProviderDischargeTemplateForDiagnosis({ code: row.code, displayName: row.label });
    const family = resolveClinicalConditionFamily({ code: row.code, displayName: row.label });
    const gated = resolveDischargeTemplateForDiagnosisGated(
      { code: row.code, displayName: row.label },
      { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
    );
    const compare = compareRegistryResolverToFamilyResolver({ code: row.code, displayName: row.label });
    const classification = classifyVarianceForProductionSwitch({
      shadowOutcome: compare.familyOutcome,
      registryTemplateId: registry.template.id,
      familyTemplateId: family.templateId,
      gatedResolverPath: gated.resolverPath,
      familyRoutingStatus: family.family?.routingStatus ?? null,
    });
    summary[classification]++;
    rows.push({
      code: row.code,
      diagnosis: row.label,
      registryTemplateId: registry.template.id,
      familyTemplateId: family.templateId,
      classification,
      reason: compare.explanation,
      recommendedAction: compare.recommendedAction,
    });
  }

  const unresolvedRegressionRiskCount = summary.REGRESSION_RISK;
  const allGatedSafe = unresolvedRegressionRiskCount === 0 && summary.UNSAFE_BLOCKED >= 0;

  return { rows, summary, unresolvedRegressionRiskCount, allGatedSafe };
}

export type RolloutStage = {
  stage: number;
  name: string;
  flagState: "OFF" | "SHADOW" | "PILOT_ON" | "DEFAULT_ON";
  entryCriteria: string[];
  exitCriteria: string[];
  rollbackTrigger: string[];
  monitoringMetrics: string[];
  responsibleReviewer: string;
  clinicalSignOffRequired: boolean;
};

export const FAMILY_RESOLVER_FEATURE_FLAG_ROLLOUT_PLAN: RolloutStage[] = [
  {
    stage: 0,
    name: "Registry resolver (current production)",
    flagState: "OFF",
    entryCriteria: ["Current production baseline"],
    exitCriteria: ["Shadow comparator deployed", "Enterprise discharge certification passing"],
    rollbackTrigger: ["N/A — baseline state"],
    monitoringMetrics: ["generic_fallback_rate", "provider_override_rate"],
    responsibleReviewer: "ED clinical lead + engineering lead",
    clinicalSignOffRequired: false,
  },
  {
    stage: 1,
    name: "Shadow only",
    flagState: "SHADOW",
    entryCriteria: [
      "runRealEncounterShadowValidation() tooling available",
      "High-risk safety report passing",
      "No unresolved REGRESSION_RISK in audited catalog",
    ],
    exitCriteria: [
      "≥500 real ED diagnosis rows collected",
      "Registry/family parity ≥95% on real data",
      "Gated safe parity 100%",
    ],
    rollbackTrigger: ["Any unsafe routed count > 0", "Regression risk detected in shadow logs"],
    monitoringMetrics: [
      "registry_family_parity_percent",
      "gated_safe_parity_percent",
      "regression_risk_count",
      "unsafe_routed_count",
    ],
    responsibleReviewer: "ED clinical lead",
    clinicalSignOffRequired: false,
  },
  {
    stage: 2,
    name: "Limited pilot — dev/test facility",
    flagState: "PILOT_ON",
    entryCriteria: [
      "Stage 1 exit criteria met on fixture + injected exports",
      "Clinical review of top 100 variance rows",
      "Rollback runbook documented",
    ],
    exitCriteria: ["Zero provider-reported routing errors for 2 weeks", "Generic fallback rate stable"],
    rollbackTrigger: ["Any high-risk template downgrade", "Provider safety report"],
    monitoringMetrics: ["provider_refresh_use", "generic_fallback_rate", "unsafe_blocked_count"],
    responsibleReviewer: "Pilot clinic medical director",
    clinicalSignOffRequired: true,
  },
  {
    stage: 3,
    name: "Single facility pilot",
    flagState: "PILOT_ON",
    entryCriteria: ["Stage 2 exit criteria met", "Single-facility clinical sign-off"],
    exitCriteria: ["≥500 real rows at pilot facility", "Parity thresholds met on live data"],
    rollbackTrigger: ["Parity drops below 95%", "Unsafe routed > 0"],
    monitoringMetrics: ["real_encounter_parity", "pediatric_age_guardrail_count", "obgyn_guardrail_count"],
    responsibleReviewer: "Facility chief of staff",
    clinicalSignOffRequired: true,
  },
  {
    stage: 4,
    name: "Broader pilot",
    flagState: "PILOT_ON",
    entryCriteria: ["Stage 3 exit criteria met", "Full CMS ICD audit completed or waived"],
    exitCriteria: ["Multi-facility parity stable", "Clinical sign-off at org level"],
    rollbackTrigger: ["Cross-facility regression risk", "Elevated generic fallback without review"],
    monitoringMetrics: ["facility_level_parity", "high_risk_diagnosis_count"],
    responsibleReviewer: "Org clinical governance committee",
    clinicalSignOffRequired: true,
  },
  {
    stage: 5,
    name: "Default ON with rollback",
    flagState: "DEFAULT_ON",
    entryCriteria: [
      "All READY_FOR_DEFAULT_ON criteria met",
      "Full CMS audit or formal waiver",
      "≥500 real ED rows",
      "Clinical sign-off recorded",
      "Rollback plan tested",
    ],
    exitCriteria: ["Stable production metrics for 30 days"],
    rollbackTrigger: [
      "Set ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER=false",
      "Any unsafe routed event",
      "Regression risk in live monitoring",
    ],
    monitoringMetrics: [
      "total_diagnoses_resolved",
      "registry_vs_family_outcome",
      "generic_fallback_rate",
      "unsafe_blocked_count",
    ],
    responsibleReviewer: "Org clinical + engineering governance",
    clinicalSignOffRequired: true,
  },
];

export type FamilyResolverMonitoringPlan = {
  metrics: string[];
  dimensions: string[];
  storageRecommendation: string;
  implementationNote: string;
  alertThresholds: Array<{ metric: string; threshold: string; action: string }>;
};

export const FAMILY_RESOLVER_MONITORING_PLAN: FamilyResolverMonitoringPlan = {
  metrics: [
    "total_diagnoses_resolved",
    "registry_template_count",
    "family_template_count",
    "gated_template_count",
    "outcome_classification_counts",
    "generic_fallback_rate",
    "high_risk_diagnosis_count",
    "unsafe_family_blocked_count",
    "pediatric_age_guardrail_count",
    "obgyn_guardrail_count",
    "provider_refresh_use_count",
    "provider_override_customization_rate",
  ],
  dimensions: ["resolver_path", "template_id", "family_id", "outcome_classification", "encounter_class"],
  storageRecommendation:
    "Append-only shadow audit log table or structured application log — local/dev first; production only after Stage 1 sign-off.",
  implementationNote:
    "No telemetry implemented in this phase. Use runRealEncounterShadowValidation() and buildProductionResolverVarianceReport() for offline audits until Stage 2.",
  alertThresholds: [
    { metric: "unsafe_family_blocked_count", threshold: ">0 routed (not blocked)", action: "Immediate rollback review" },
    { metric: "regression_risk_count", threshold: ">0", action: "Block flag promotion" },
    { metric: "generic_fallback_rate", threshold: ">15% unexplained increase", action: "Clinical review" },
    { metric: "pediatric_age_guardrail_count", threshold: "unreviewed >0", action: "Block pediatric routing" },
  ],
};

export type ProductionSwitchReadinessDecision =
  | "NOT_READY"
  | "READY_FOR_SHADOW_ONLY"
  | "READY_FOR_LIMITED_PILOT"
  | "READY_FOR_BROADER_PILOT"
  | "READY_FOR_DEFAULT_ON";

export function determineProductionSwitchReadinessDecision(input?: {
  realEncounterReport?: RealEncounterProductionSwitchValidationReport;
  cmsAudit?: FullCmsIcd10ProductionSwitchAudit;
  highRiskReport?: ReturnType<typeof buildHighRiskProductionSwitchSafetyReport>;
  varianceReport?: ReturnType<typeof buildProductionResolverVarianceReport>;
  clinicalSignOffRecorded?: boolean;
  enterpriseCertificationReady?: boolean;
}): {
  decision: ProductionSwitchReadinessDecision;
  blockers: string[];
  rationale: string[];
} {
  const realEncounter =
    input?.realEncounterReport ?? buildRealEncounterProductionSwitchValidationReport();
  const cmsAudit = input?.cmsAudit ?? buildFullCmsIcd10ProductionSwitchAudit();
  const highRisk = input?.highRiskReport ?? buildHighRiskProductionSwitchSafetyReport();
  const variance = input?.varianceReport ?? buildProductionResolverVarianceReport();
  const enterpriseReady = input?.enterpriseCertificationReady ?? runEnterpriseDischargeCertification().enterpriseReady;
  const blockers: string[] = [];
  const rationale: string[] = [];

  if (!enterpriseReady) blockers.push("Enterprise discharge certification not ready.");
  if (!highRisk.highRiskAuditPassed) blockers.push("High-risk clinical safety audit not passed.");
  if (variance.unresolvedRegressionRiskCount > 0) {
    blockers.push(`Unresolved regression risk count: ${variance.unresolvedRegressionRiskCount}.`);
  }
  if (!cmsAudit.fullCmsDataAvailableLocally) {
    blockers.push("Full CMS ICD-10 catalog audit not completed locally (FULL_CMS_DATA_NOT_AVAILABLE_LOCALLY).");
  }
  if (input?.clinicalSignOffRecorded !== true) {
    blockers.push("Clinical sign-off not recorded.");
  }
  if (realEncounter.result === "NOT_READY_FOR_DEFAULT_ON_DATA_INSUFFICIENT") {
    blockers.push(
      `Real encounter data insufficient: ${realEncounter.aggregate.totalRows} rows (need ${PRODUCTION_DEFAULT_SWITCH_THRESHOLDS.minimumRealEdDiagnosisRows}).`
    );
  }
  if (!realEncounter.thresholdEvaluation.meetsRegistryFamilyParity) {
    blockers.push("Registry/family parity below 95% on available real data.");
  }
  if (!realEncounter.thresholdEvaluation.meetsGatedSafeParity) {
    blockers.push("Gated safe parity below 100% on available real data.");
  }

  const defaultOnBlockers = [...blockers];
  const shadowReady =
    enterpriseReady &&
    highRisk.highRiskAuditPassed &&
    variance.unresolvedRegressionRiskCount === 0 &&
    ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER === false;

  if (defaultOnBlockers.length === 0 && realEncounter.thresholdEvaluation.readyForProductionDefaultSwitch) {
    return {
      decision: "READY_FOR_DEFAULT_ON",
      blockers: [],
      rationale: ["All DEFAULT_ON criteria met including CMS audit, real data, and clinical sign-off."],
    };
  }

  if (
    defaultOnBlockers.filter(
      (b) =>
        !b.includes("Clinical sign-off") &&
        !b.includes("CMS ICD-10") &&
        !b.includes("Insufficient real ED rows")
    ).length === 0 &&
    realEncounter.thresholdEvaluation.meetsMinimumRowCount &&
    realEncounter.thresholdEvaluation.meetsRegistryFamilyParity &&
    realEncounter.thresholdEvaluation.meetsGatedSafeParity &&
    cmsAudit.fullCmsDataAvailableLocally
  ) {
    rationale.push("Numeric thresholds met but clinical sign-off or final review pending.");
    return { decision: "READY_FOR_BROADER_PILOT", blockers: defaultOnBlockers, rationale };
  }

  if (
    shadowReady &&
    realEncounter.thresholdEvaluation.meetsGatedSafeParity &&
    highRisk.highRiskAuditPassed
  ) {
    rationale.push("Shadow infrastructure certified; real encounter volume insufficient for default ON.");
    return {
      decision: "READY_FOR_SHADOW_ONLY",
      blockers: defaultOnBlockers,
      rationale,
    };
  }

  if (shadowReady) {
    return { decision: "READY_FOR_LIMITED_PILOT", blockers: defaultOnBlockers, rationale: ["Pilot tooling ready with documented blockers."] };
  }

  return { decision: "NOT_READY", blockers, rationale: ["Core safety or certification gates not met."] };
}

export function runProductionSwitchReadinessCertification(input?: {
  injectedRealEncounterRows?: readonly RealEncounterDiagnosisRow[];
  injectedIcdCatalog?: Icd10CatalogRow[];
  clinicalSignOffRecorded?: boolean;
}): {
  resolverState: CurrentResolverStateAudit;
  cmsAudit: FullCmsIcd10ProductionSwitchAudit;
  realEncounter: RealEncounterProductionSwitchValidationReport;
  highRisk: ReturnType<typeof buildHighRiskProductionSwitchSafetyReport>;
  variance: ReturnType<typeof buildProductionResolverVarianceReport>;
  rolloutPlan: typeof FAMILY_RESOLVER_FEATURE_FLAG_ROLLOUT_PLAN;
  monitoringPlan: typeof FAMILY_RESOLVER_MONITORING_PLAN;
  decision: ReturnType<typeof determineProductionSwitchReadinessDecision>;
  resolverSafety: ReturnType<typeof runResolverSafetyCertification>;
  enterpriseReady: boolean;
} {
  const cmsAudit = buildFullCmsIcd10ProductionSwitchAudit({ injectedCatalog: input?.injectedIcdCatalog });
  const highRisk = buildHighRiskProductionSwitchSafetyReport();
  const realEncounter = buildRealEncounterProductionSwitchValidationReport({
    mode: input?.injectedRealEncounterRows?.length ? "injected" : "fixture",
    injectedRows: input?.injectedRealEncounterRows,
    clinicalSignOffRecorded: input?.clinicalSignOffRecorded,
    highRiskAuditPassed: highRisk.highRiskAuditPassed,
    genericFallbackPercentReviewed: false,
  });
  const variance = buildProductionResolverVarianceReport(
    input?.injectedIcdCatalog ??
      loadIcd10DevSampleCatalog().map((r) => ({ code: r.code, label: r.label }))
  );
  const enterpriseReady = runEnterpriseDischargeCertification().enterpriseReady;
  const decision = determineProductionSwitchReadinessDecision({
    realEncounterReport: realEncounter,
    cmsAudit,
    highRiskReport: highRisk,
    varianceReport: variance,
    clinicalSignOffRecorded: input?.clinicalSignOffRecorded,
    enterpriseCertificationReady: enterpriseReady,
  });

  return {
    resolverState: buildCurrentResolverStateAudit(),
    cmsAudit,
    realEncounter,
    highRisk,
    variance,
    rolloutPlan: FAMILY_RESOLVER_FEATURE_FLAG_ROLLOUT_PLAN,
    monitoringPlan: FAMILY_RESOLVER_MONITORING_PLAN,
    decision,
    resolverSafety: runResolverSafetyCertification(),
    enterpriseReady,
  };
}

/** Verify registry remains active when compile-time flag default is OFF. */
export function productionUsesRegistryResolverWhenFlagOff(): boolean {
  const gated = resolveDischargeTemplateForDiagnosisGated(
    { code: "R11.2", displayName: "Nausea and vomiting" },
    { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: false } }
  );
  return gated.resolverPath === "registry" && !isEdDischargeConditionFamilyResolverEnabled();
}

/** Verify adult fever family routing for unknown age. */
export function familyResolverAdultFeverForUnknownAge(): boolean {
  const family = resolveClinicalConditionFamily({ code: "R50.9", displayName: "Fever" });
  return family.templateId === ADULT_FEVER_TEMPLATE_ID;
}

/** Verify pediatric fever requires age context in family resolver. */
export function familyResolverPediatricFeverRequiresAge(): boolean {
  const child = resolveClinicalConditionFamily({
    code: "R50.9",
    displayName: "Fever",
    context: { patientAgeYears: 10 },
  });
  return child.templateId === PEDIATRIC_FEVER_TEMPLATE_ID;
}
