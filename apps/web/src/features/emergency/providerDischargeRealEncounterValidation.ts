/**
 * MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.6
 * Real encounter diagnosis shadow validation — audit-only; no production routing changes.
 */

import {
  ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER,
  type EdDischargeResolverFeatureFlags,
} from "./providerDischargeConditionFamilyFeatureFlag";
import {
  resolveClinicalConditionFamily,
  type ClinicalConditionFamilyResolveContext,
} from "./providerDischargeConditionFamilyResolver";
import type { EncounterDiagnosisRecord } from "./providerDischargeEncounterDiagnosisFixtures";
import { buildEncounterDiagnosisAuditDataset } from "./providerDischargeShadowModeValidation";
import {
  evaluatePediatricFeverAgePolicy,
  isAdultToPediatricPreventedOutcome,
  isPediatricFeverIcdCode,
  type PediatricFeverAgePolicyStatus,
} from "./providerDischargePediatricFeverAgePolicy";
import {
  compareRegistryResolverToFamilyResolver,
  type ShadowFamilyOutcomeClassification,
  type ShadowResolverCompareResult,
} from "./providerDischargeResolverShadowCompare";
import { resolveDischargeTemplateForDiagnosisGated } from "./providerDischargeTemplateResolverGate";
import {
  resolveProviderDischargeTemplateForDiagnosis,
} from "./providerDischargeTemplateRegistry";

export type RealEncounterDiagnosisRow = {
  encounterId: string;
  patientId?: string;
  patientDob?: string;
  patientAgeYears?: number;
  patientSex?: string;
  diagnosisCode: string;
  diagnosisLabel: string;
  isPrimary?: boolean;
  encounterClass?: "ED" | "INPATIENT" | "OBSERVATION" | "OUTPATIENT";
  createdAt?: string;
};

export type RealEncounterValidationMode = "fixture" | "injected" | "api_db";

export type RealEncounterShadowRowResult = {
  row: RealEncounterDiagnosisRow;
  registryTemplateId: string;
  familyTemplateId: string;
  gatedTemplateId: string;
  gatedResolverPath: "registry" | "family" | "family_fallback_registry";
  outcome: ShadowFamilyOutcomeClassification;
  ageContextUsed?: number;
  ageContextStatus: PediatricFeverAgePolicyStatus | "age_unavailable_non_fever";
  sexContextUsed?: ClinicalConditionFamilyResolveContext["patientSex"];
  riskStatus: string;
  recommendedAction: string;
  feverAgePolicyStatus: PediatricFeverAgePolicyStatus;
  adultToPediatricPrevented: boolean;
  pediatricAgeContextMissing: boolean;
  unsafeAdultToPediatricRoute: boolean;
};

export type RealEncounterShadowValidationToolReport = {
  mode: RealEncounterValidationMode;
  rows: RealEncounterShadowRowResult[];
  aggregate: {
    totalRows: number;
    uniqueIcdCodes: number;
    uniqueDiagnoses: number;
    registryFamilyIdenticalCount: number;
    saferFamilyCount: number;
    needsReviewCount: number;
    regressionRiskCount: number;
    unsafeRoutedCount: number;
    genericFallbackCount: number;
    pediatricAgeContextMissingCount: number;
    adultToPediatricPreventedCount: number;
    unsafeAdultToPediatricRouteCount: number;
    gatedSafeParityCount: number;
    gatedSafeParityPercent: number;
    registryFamilyParityPercent: number;
    topVarianceRows: RealEncounterShadowRowResult[];
    topGenericFallbackRows: RealEncounterShadowRowResult[];
  };
  productionDefaultSwitchEvaluation: ProductionDefaultSwitchThresholdEvaluation;
};

export type ProductionDefaultSwitchThresholds = {
  minimumRealEdDiagnosisRows: number;
  minimumRegistryFamilyParityPercent: number;
  minimumGatedSafeParityPercent: number;
  maximumRegressionRisk: number;
  maximumUnsafeRouted: number;
  maximumAdultToPediatricUnsafe: number;
  maximumPediatricAgeContextMissingUnreviewed: number;
};

export type ProductionDefaultSwitchThresholdEvaluation = {
  thresholds: ProductionDefaultSwitchThresholds;
  meetsMinimumRowCount: boolean;
  meetsRegistryFamilyParity: boolean;
  meetsGatedSafeParity: boolean;
  meetsRegressionRisk: boolean;
  meetsUnsafeRouted: boolean;
  meetsAdultToPediatricSafety: boolean;
  meetsPediatricAgeContextPolicy: boolean;
  readyForProductionDefaultSwitch: boolean;
  blockers: string[];
};

export const PRODUCTION_DEFAULT_SWITCH_THRESHOLDS: ProductionDefaultSwitchThresholds = {
  minimumRealEdDiagnosisRows: 500,
  minimumRegistryFamilyParityPercent: 95,
  minimumGatedSafeParityPercent: 100,
  maximumRegressionRisk: 0,
  maximumUnsafeRouted: 0,
  maximumAdultToPediatricUnsafe: 0,
  maximumPediatricAgeContextMissingUnreviewed: 0,
};

function normalizePatientSex(
  sex?: string
): ClinicalConditionFamilyResolveContext["patientSex"] | undefined {
  if (!sex?.trim()) return undefined;
  const normalized = sex.trim().toLowerCase();
  if (normalized === "female" || normalized === "f") return "female";
  if (normalized === "male" || normalized === "m") return "male";
  return "unknown";
}

export function buildResolverContextFromEncounterRow(
  row: RealEncounterDiagnosisRow
): ClinicalConditionFamilyResolveContext {
  const feverPolicy = evaluatePediatricFeverAgePolicy({
    code: row.diagnosisCode,
    displayName: row.diagnosisLabel,
    label: row.diagnosisLabel,
    patientAgeYears: row.patientAgeYears,
    patientDob: row.patientDob,
    referenceDate: row.createdAt,
  });

  const resolvedAge =
    feverPolicy.resolvedAgeYears ??
    (typeof row.patientAgeYears === "number" ? row.patientAgeYears : undefined);

  return {
    patientAgeYears: resolvedAge,
    patientDob: row.patientDob,
    patientSex: normalizePatientSex(row.patientSex),
    encounterClass: row.encounterClass,
    feverAdultDefaultUnknownAge: feverPolicy.feverAdultDefaultUnknownAge,
    feverForceGenericFallback: feverPolicy.forceGenericFallback,
  };
}

function refineShadowOutcomeForAgePolicy(input: {
  compare: ShadowResolverCompareResult;
  feverPolicyStatus: PediatricFeverAgePolicyStatus;
  registryTemplateId: string;
  familyTemplateId: string;
}): ShadowResolverCompareResult {
  const { compare, feverPolicyStatus, registryTemplateId, familyTemplateId } = input;

  if (
    isAdultToPediatricPreventedOutcome({
      registryTemplateId,
      familyTemplateId,
      policyStatus: feverPolicyStatus,
    })
  ) {
    return {
      ...compare,
      familyOutcome: "safer_family",
      explanation:
        "Age policy prevented unsafe pediatric routing when age was unavailable or adult-confirmed.",
      recommendedAction:
        "Accept family adult fever default; registry pediatric route requires age context review.",
    };
  }

  if (
    compare.familyOutcome === "regression_risk" &&
    familyTemplateId.includes("pediatric") &&
    feverPolicyStatus !== "pediatric_confirmed"
  ) {
    return {
      ...compare,
      familyOutcome: "needs_review",
      explanation: "Pediatric fever template blocked without confirmed pediatric age context.",
      recommendedAction: "Provide patient age or use adult fever policy default.",
    };
  }

  if (feverPolicyStatus === "needs_review_pediatric_label_no_age") {
    return {
      ...compare,
      familyOutcome: "needs_review",
      explanation: "Explicit pediatric label without age — clinical review required before routing.",
      recommendedAction: "Confirm patient age or keep registry resolver.",
    };
  }

  return compare;
}

function isGatedSafeRow(outcome: ShadowFamilyOutcomeClassification): boolean {
  return (
    outcome === "identical" ||
    outcome === "safer_family" ||
    outcome === "needs_review" ||
    outcome === "generic_fallback"
  );
}

export function validateRealEncounterDiagnosisRow(
  row: RealEncounterDiagnosisRow,
  featureFlags: EdDischargeResolverFeatureFlags = {}
): RealEncounterShadowRowResult {
  const context = buildResolverContextFromEncounterRow(row);
  const feverPolicy = evaluatePediatricFeverAgePolicy({
    code: row.diagnosisCode,
    displayName: row.diagnosisLabel,
    label: row.diagnosisLabel,
    patientAgeYears: row.patientAgeYears,
    patientDob: row.patientDob,
    referenceDate: row.createdAt,
  });

  const registry = resolveProviderDischargeTemplateForDiagnosis({
    code: row.diagnosisCode,
    displayName: row.diagnosisLabel,
  });
  const family = resolveClinicalConditionFamily({
    code: row.diagnosisCode,
    displayName: row.diagnosisLabel,
    label: row.diagnosisLabel,
    context,
  });
  const gated = resolveDischargeTemplateForDiagnosisGated(
    {
      code: row.diagnosisCode,
      displayName: row.diagnosisLabel,
      label: row.diagnosisLabel,
      context,
    },
    { featureFlags }
  );

  const rawCompare = compareRegistryResolverToFamilyResolver({
    code: row.diagnosisCode,
    displayName: row.diagnosisLabel,
    label: row.diagnosisLabel,
    context,
  });
  const compare = refineShadowOutcomeForAgePolicy({
    compare: rawCompare,
    feverPolicyStatus: feverPolicy.status,
    registryTemplateId: registry.template.id,
    familyTemplateId: family.templateId,
  });

  const adultToPediatricPrevented = isAdultToPediatricPreventedOutcome({
    registryTemplateId: registry.template.id,
    familyTemplateId: family.templateId,
    policyStatus: feverPolicy.status,
  });

  const pediatricAgeContextMissing =
    isPediatricFeverIcdCode(row.diagnosisCode) &&
    feverPolicy.resolvedAgeYears === undefined &&
    feverPolicy.status !== "needs_review_pediatric_label_no_age";

  const unsafeAdultToPediatricRoute =
    family.templateId.includes("pediatric") &&
    (feverPolicy.resolvedAgeYears === undefined ||
      feverPolicy.resolvedAgeYears >= 18);

  const ageContextStatus: RealEncounterShadowRowResult["ageContextStatus"] =
    feverPolicy.status === "not_applicable"
      ? feverPolicy.resolvedAgeYears === undefined
        ? "age_unavailable_non_fever"
        : feverPolicy.status
      : feverPolicy.status;

  return {
    row,
    registryTemplateId: registry.template.id,
    familyTemplateId: family.templateId,
    gatedTemplateId: gated.template.id,
    gatedResolverPath: gated.resolverPath,
    outcome: compare.familyOutcome,
    ageContextUsed: context.patientAgeYears,
    ageContextStatus,
    sexContextUsed: context.patientSex,
    riskStatus: family.family?.routingStatus ?? "unknown",
    recommendedAction: compare.recommendedAction,
    feverAgePolicyStatus: feverPolicy.status,
    adultToPediatricPrevented,
    pediatricAgeContextMissing,
    unsafeAdultToPediatricRoute,
  };
}

function fixtureRecordsToRows(records: readonly EncounterDiagnosisRecord[]): RealEncounterDiagnosisRow[] {
  const rows: RealEncounterDiagnosisRow[] = [];
  let idx = 0;
  for (const record of records) {
    for (let i = 0; i < record.count; i += 1) {
      idx += 1;
      rows.push({
        encounterId: `fixture-enc-${idx}`,
        diagnosisCode: record.code,
        diagnosisLabel: record.label,
        encounterClass: "ED",
        isPrimary: i === 0,
      });
    }
  }
  return rows;
}

export function evaluateProductionDefaultSwitchReadiness(input: {
  report: Pick<RealEncounterShadowValidationToolReport, "aggregate">;
  thresholds?: ProductionDefaultSwitchThresholds;
  clinicalSignOffRecorded?: boolean;
  highRiskDiagnosisAuditPassed?: boolean;
  genericFallbackPercentReviewed?: boolean;
}): ProductionDefaultSwitchThresholdEvaluation {
  const thresholds = input.thresholds ?? PRODUCTION_DEFAULT_SWITCH_THRESHOLDS;
  const { aggregate } = input.report;
  const blockers: string[] = [];

  const meetsMinimumRowCount =
    aggregate.totalRows >= thresholds.minimumRealEdDiagnosisRows;
  const meetsRegistryFamilyParity =
    aggregate.registryFamilyParityPercent >= thresholds.minimumRegistryFamilyParityPercent;
  const meetsGatedSafeParity =
    aggregate.gatedSafeParityPercent >= thresholds.minimumGatedSafeParityPercent;
  const meetsRegressionRisk =
    aggregate.regressionRiskCount <= thresholds.maximumRegressionRisk;
  const meetsUnsafeRouted =
    aggregate.unsafeRoutedCount <= thresholds.maximumUnsafeRouted;
  const meetsAdultToPediatricSafety =
    aggregate.unsafeAdultToPediatricRouteCount <= thresholds.maximumAdultToPediatricUnsafe;
  const meetsPediatricAgeContextPolicy =
    aggregate.pediatricAgeContextMissingCount <=
    thresholds.maximumPediatricAgeContextMissingUnreviewed;

  if (!meetsMinimumRowCount) {
    blockers.push(
      `Need >= ${thresholds.minimumRealEdDiagnosisRows} real ED rows (have ${aggregate.totalRows}).`
    );
  }
  if (!meetsRegistryFamilyParity) {
    blockers.push(
      `Registry/family parity ${aggregate.registryFamilyParityPercent.toFixed(1)}% below ${thresholds.minimumRegistryFamilyParityPercent}%.`
    );
  }
  if (!meetsGatedSafeParity) {
    blockers.push(
      `Gated safe parity ${aggregate.gatedSafeParityPercent.toFixed(1)}% below ${thresholds.minimumGatedSafeParityPercent}%.`
    );
  }
  if (!meetsRegressionRisk) {
    blockers.push(`Regression risk count ${aggregate.regressionRiskCount} > 0.`);
  }
  if (!meetsUnsafeRouted) {
    blockers.push(`Unsafe routed count ${aggregate.unsafeRoutedCount} > 0.`);
  }
  if (!meetsAdultToPediatricSafety) {
    blockers.push(
      `Unsafe adult-to-pediatric routes ${aggregate.unsafeAdultToPediatricRouteCount} > 0.`
    );
  }
  if (!meetsPediatricAgeContextPolicy) {
    blockers.push(
      `Pediatric age-context missing routes ${aggregate.pediatricAgeContextMissingCount} require review.`
    );
  }
  if (input.highRiskDiagnosisAuditPassed !== true) {
    blockers.push("High-risk diagnosis audit not recorded as passed.");
  }
  if (input.clinicalSignOffRecorded !== true) {
    blockers.push("Clinical sign-off not recorded.");
  }
  if (input.genericFallbackPercentReviewed !== true) {
    blockers.push("Generic fallback percentage not reviewed and accepted.");
  }

  return {
    thresholds,
    meetsMinimumRowCount,
    meetsRegistryFamilyParity,
    meetsGatedSafeParity,
    meetsRegressionRisk,
    meetsUnsafeRouted,
    meetsAdultToPediatricSafety,
    meetsPediatricAgeContextPolicy,
    readyForProductionDefaultSwitch: blockers.length === 0,
    blockers,
  };
}

function buildAggregate(
  rows: RealEncounterShadowRowResult[]
): RealEncounterShadowValidationToolReport["aggregate"] {
  const uniqueIcdCodes = new Set(rows.map((r) => r.row.diagnosisCode.trim().toUpperCase())).size;
  const uniqueDiagnoses = new Set(
    rows.map((r) => `${r.row.diagnosisCode}|${r.row.diagnosisLabel}`.toLowerCase())
  ).size;

  const identicalCount = rows.filter((r) => r.outcome === "identical").length;
  const saferFamilyCount = rows.filter((r) => r.outcome === "safer_family").length;
  const needsReviewCount = rows.filter((r) => r.outcome === "needs_review").length;
  const regressionRiskCount = rows.filter((r) => r.outcome === "regression_risk").length;
  const unsafeRoutedCount = rows.filter((r) => r.outcome === "unsafe_no_map").length;
  const genericFallbackCount = rows.filter((r) => r.outcome === "generic_fallback").length;
  const pediatricAgeContextMissingCount = rows.filter((r) => r.pediatricAgeContextMissing).length;
  const adultToPediatricPreventedCount = rows.filter((r) => r.adultToPediatricPrevented).length;
  const unsafeAdultToPediatricRouteCount = rows.filter((r) => r.unsafeAdultToPediatricRoute).length;
  const gatedSafeParityCount = rows.filter((r) => isGatedSafeRow(r.outcome)).length;

  const varianceRows = rows
    .filter((r) => r.outcome !== "identical")
    .sort((a, b) => a.outcome.localeCompare(b.outcome))
    .slice(0, 100);

  const genericFallbackRows = rows
    .filter((r) => r.outcome === "generic_fallback")
    .slice(0, 100);

  const totalRows = rows.length;
  const registryFamilyParityPercent =
    totalRows === 0 ? 100 : (identicalCount / totalRows) * 100;
  const gatedSafeParityPercent =
    totalRows === 0 ? 100 : (gatedSafeParityCount / totalRows) * 100;

  return {
    totalRows,
    uniqueIcdCodes,
    uniqueDiagnoses,
    registryFamilyIdenticalCount: identicalCount,
    saferFamilyCount,
    needsReviewCount,
    regressionRiskCount,
    unsafeRoutedCount,
    genericFallbackCount,
    pediatricAgeContextMissingCount,
    adultToPediatricPreventedCount,
    unsafeAdultToPediatricRouteCount,
    gatedSafeParityCount,
    gatedSafeParityPercent,
    registryFamilyParityPercent,
    topVarianceRows: varianceRows,
    topGenericFallbackRows: genericFallbackRows,
  };
}

export function buildRealEncounterShadowValidationReport(input: {
  mode: RealEncounterValidationMode;
  rows: readonly RealEncounterDiagnosisRow[];
  featureFlags?: EdDischargeResolverFeatureFlags;
  productionEvaluationExtras?: {
    clinicalSignOffRecorded?: boolean;
    highRiskDiagnosisAuditPassed?: boolean;
    genericFallbackPercentReviewed?: boolean;
    thresholds?: ProductionDefaultSwitchThresholds;
  };
}): RealEncounterShadowValidationToolReport {
  const featureFlags = input.featureFlags ?? {
    ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER,
  };
  const rowResults = input.rows.map((row) =>
    validateRealEncounterDiagnosisRow(row, featureFlags)
  );
  const aggregate = buildAggregate(rowResults);
  return {
    mode: input.mode,
    rows: rowResults,
    aggregate,
    productionDefaultSwitchEvaluation: evaluateProductionDefaultSwitchReadiness({
      report: { aggregate },
      thresholds: input.productionEvaluationExtras?.thresholds,
      clinicalSignOffRecorded: input.productionEvaluationExtras?.clinicalSignOffRecorded,
      highRiskDiagnosisAuditPassed: input.productionEvaluationExtras?.highRiskDiagnosisAuditPassed,
      genericFallbackPercentReviewed: input.productionEvaluationExtras?.genericFallbackPercentReviewed,
    }),
  };
}

export function runRealEncounterShadowValidation(input: {
  mode: RealEncounterValidationMode;
  injectedRows?: readonly RealEncounterDiagnosisRow[];
  featureFlags?: EdDischargeResolverFeatureFlags;
}): RealEncounterShadowValidationToolReport {
  if (input.mode === "injected") {
    return buildRealEncounterShadowValidationReport({
      mode: "injected",
      rows: input.injectedRows ?? [],
      featureFlags: input.featureFlags,
    });
  }

  if (input.mode === "api_db") {
    return buildRealEncounterShadowValidationReport({
      mode: "api_db",
      rows: input.injectedRows ?? [],
      featureFlags: input.featureFlags,
    });
  }

  const fixtureRecords = buildEncounterDiagnosisAuditDataset();
  return buildRealEncounterShadowValidationReport({
    mode: "fixture",
    rows: fixtureRecordsToRows(fixtureRecords),
    featureFlags: input.featureFlags,
  });
}

export const REAL_DATA_VALIDATION_MODES_REPORT = {
  modes: [
    {
      id: "fixture" as const,
      description: "Uses repo encounter diagnosis fixtures (seed + QA + canonical traffic).",
      requiresProductionCredentials: false,
    },
    {
      id: "injected" as const,
      description: "Accepts imported JSON/CSV rows from staging or production export.",
      requiresProductionCredentials: false,
    },
    {
      id: "api_db" as const,
      description:
        "Read-only local Prisma/API query when a dev database is available; caller supplies mapped rows.",
      requiresProductionCredentials: false,
    },
  ],
  productionDefaultEnabled: false,
  featureFlagDefault: false,
} as const;
