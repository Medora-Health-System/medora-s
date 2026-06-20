/**
 * MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.3
 * Full CMS ICD-10 catalog audit path for condition-family resolver readiness.
 */

import { loadIcd10DevSampleCatalog } from "./edDischargeCoverageAuditLevel2";
import { buildTemplateToFamilyMap } from "./providerDischargeClinicalFamilyCoverage";
import {
  CLINICAL_CONDITION_FAMILY_DEFINITIONS,
  getRoutableClinicalConditionFamilies,
} from "./providerDischargeConditionFamilies";
import {
  conditionFamilyKeywordWouldOverrideIcdMatch,
  resolveClinicalConditionFamily,
  type ClinicalConditionFamilyResolveContext,
} from "./providerDischargeConditionFamilyResolver";
import {
  GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
  resolveProviderDischargeTemplateForDiagnosis,
} from "./providerDischargeTemplateRegistry";

export type Icd10CatalogRow = {
  code: string;
  label: string;
  edRelevance?: "high" | "medium" | "low";
};

export type Icd10CatalogSource = "dev_sample" | "injected" | "api_catalog";

export type Icd10FamilyAuditRow = {
  code: string;
  label: string;
  familyId: string | null;
  templateId: string;
  matchLevel: string;
  routingStatus: string | null;
  isGenericFallback: boolean;
  keywordOnly: boolean;
  guardrailMismatch: boolean;
  obgynSexMismatch: boolean;
  confidence: "high" | "medium" | "low";
};

export type FullCmsIcd10AuditReadinessReport = {
  catalogSource: Icd10CatalogSource;
  totalIcdCodesAudited: number;
  familySpecificResolvedCount: number;
  genericFallbackCount: number;
  genericFallbackPercent: number;
  top100FallbackCodes: Array<{ code: string; label: string; templateId: string }>;
  unsafeNoMapCount: number;
  pediatricAdultGuardrailMismatchCount: number;
  obgynSexGuardrailMismatchCount: number;
  keywordOnlyResolutionCount: number;
  familyResolutionConfidence: {
    high: number;
    medium: number;
    low: number;
  };
  notes: string[];
};

export type Icd10CatalogCoverageReport = {
  source: Icd10CatalogSource;
  totalCodes: number;
  coveredByFamily: number;
  genericFallback: number;
  coveragePercent: number;
  byMatchLevel: Record<string, number>;
};

function confidenceForRow(row: Icd10FamilyAuditRow): "high" | "medium" | "low" {
  if (row.isGenericFallback) return "low";
  if (row.routingStatus === "UNSAFE_DO_NOT_MAP") return "low";
  if (row.routingStatus === "NEEDS_REVIEW" || row.routingStatus === "DEFERRED_SPECIALTY_ONLY") return "medium";
  if (row.matchLevel === "icdExact" || row.matchLevel === "icdPrefix") return "high";
  if (row.matchLevel === "keyword") return "medium";
  return "low";
}

function auditRowForCode(
  row: Icd10CatalogRow,
  context?: ClinicalConditionFamilyResolveContext
): Icd10FamilyAuditRow {
  const family = resolveClinicalConditionFamily({
    code: row.code,
    displayName: row.label,
    context,
  });

  const pediatricFamily = family.family?.guardrails?.age?.maxAgeYears !== undefined;
  const adultProbe = resolveClinicalConditionFamily({
    code: row.code,
    displayName: row.label,
    context: { ...context, patientAgeYears: 40 },
  });
  const pediatricProbe = resolveClinicalConditionFamily({
    code: row.code,
    displayName: row.label,
    context: { ...context, patientAgeYears: 8 },
  });
  const guardrailMismatch =
    pediatricFamily &&
    family.templateId !== adultProbe.templateId &&
    pediatricProbe.templateId !== adultProbe.templateId;

  const obgynFamily = family.family?.clinicalDomain === "OB/GYN";
  const maleObgynProbe = resolveClinicalConditionFamily({
    code: row.code,
    displayName: row.label,
    context: { ...context, patientSex: "male" },
  });
  const obgynSexMismatch = obgynFamily && maleObgynProbe.familyId === family.familyId;

  return {
    code: row.code,
    label: row.label,
    familyId: family.familyId,
    templateId: family.templateId,
    matchLevel: family.matchLevel,
    routingStatus: family.family?.routingStatus ?? null,
    isGenericFallback: family.templateId === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
    keywordOnly: family.matchLevel === "keyword",
    guardrailMismatch,
    obgynSexMismatch,
    confidence: "low",
  };
}

export function buildIcd10CatalogCoverageReport(
  catalog: Icd10CatalogRow[],
  source: Icd10CatalogSource = "injected"
): Icd10CatalogCoverageReport {
  const byMatchLevel: Record<string, number> = {};
  let covered = 0;
  let generic = 0;

  for (const row of catalog) {
    const result = resolveClinicalConditionFamily({ code: row.code, displayName: row.label });
    byMatchLevel[result.matchLevel] = (byMatchLevel[result.matchLevel] ?? 0) + 1;
    if (result.templateId === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID) generic++;
    else covered++;
  }

  const total = catalog.length;
  return {
    source,
    totalCodes: total,
    coveredByFamily: covered,
    genericFallback: generic,
    coveragePercent: total === 0 ? 100 : Math.round((covered / total) * 1000) / 10,
    byMatchLevel,
  };
}

export function summarizeGenericFallbackByFamily(catalog: Icd10CatalogRow[]): Array<{
  familyId: string;
  genericFallbackCount: number;
}> {
  const counts = new Map<string, number>();
  for (const row of catalog) {
    const result = resolveClinicalConditionFamily({ code: row.code, displayName: row.label });
    if (result.templateId !== GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID) continue;
    const key = result.familyId ?? "unmapped";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([familyId, genericFallbackCount]) => ({ familyId, genericFallbackCount }))
    .sort((a, b) => b.genericFallbackCount - a.genericFallbackCount);
}

export function buildFullIcd10FamilyResolverAudit(
  catalog?: Icd10CatalogRow[],
  source: Icd10CatalogSource = "dev_sample"
): FullCmsIcd10AuditReadinessReport {
  const rows =
    catalog ??
    loadIcd10DevSampleCatalog().map((r) => ({
      code: r.code,
      label: r.label,
      edRelevance: r.edRelevance,
    }));

  const auditRows = rows.map((r) => {
    const row = auditRowForCode(r);
    return { ...row, confidence: confidenceForRow(row) };
  });

  const genericRows = auditRows.filter((r) => r.isGenericFallback);
  const top100FallbackCodes = genericRows.slice(0, 100).map((r) => ({
    code: r.code,
    label: r.label,
    templateId: r.templateId,
  }));

  const confidence = { high: 0, medium: 0, low: 0 };
  for (const r of auditRows) confidence[r.confidence]++;

  return {
    catalogSource: source,
    totalIcdCodesAudited: auditRows.length,
    familySpecificResolvedCount: auditRows.length - genericRows.length,
    genericFallbackCount: genericRows.length,
    genericFallbackPercent:
      auditRows.length === 0
        ? 0
        : Math.round((genericRows.length / auditRows.length) * 1000) / 10,
    top100FallbackCodes,
    unsafeNoMapCount: auditRows.filter((r) => r.routingStatus === "UNSAFE_DO_NOT_MAP").length,
    pediatricAdultGuardrailMismatchCount: auditRows.filter((r) => r.guardrailMismatch).length,
    obgynSexGuardrailMismatchCount: auditRows.filter((r) => r.obgynSexMismatch).length,
    keywordOnlyResolutionCount: auditRows.filter((r) => r.keywordOnly).length,
    familyResolutionConfidence: confidence,
    notes: [
      `Audited ${auditRows.length} ICD rows from ${source}.`,
      `${getRoutableClinicalConditionFamilies().length} routable families of ${CLINICAL_CONDITION_FAMILY_DEFINITIONS.length} total.`,
      "Production CMS catalog: import into Icd10DiagnosisCode table and pass rows to buildFullIcd10FamilyResolverAudit(catalog, 'api_catalog').",
      "Dev sample path: loadIcd10DevSampleCatalog() — no DB required.",
    ],
  };
}

/** Compare registry vs family resolution across an ICD catalog (shadow audit). */
export function buildFullIcd10RegistryVsFamilyAudit(catalog: Icd10CatalogRow[]): {
  total: number;
  registryGenericCount: number;
  familyGenericCount: number;
  parityIdentical: number;
  parityPercent: number;
} {
  let registryGeneric = 0;
  let familyGeneric = 0;
  let identical = 0;
  const templateToFamily = buildTemplateToFamilyMap();

  for (const row of catalog) {
    const registry = resolveProviderDischargeTemplateForDiagnosis({
      code: row.code,
      displayName: row.label,
    });
    const family = resolveClinicalConditionFamily({ code: row.code, displayName: row.label });

    if (registry.template.id === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID) registryGeneric++;
    if (family.templateId === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID) familyGeneric++;

    if (registry.template.id === family.templateId) {
      identical++;
    } else {
      const rf = templateToFamily.get(registry.template.id);
      const ff = templateToFamily.get(family.templateId);
      if (rf && ff && rf === ff) identical++;
    }
  }

  const total = catalog.length;
  return {
    total,
    registryGenericCount: registryGeneric,
    familyGenericCount: familyGeneric,
    parityIdentical: identical,
    parityPercent: total === 0 ? 100 : Math.round((identical / total) * 1000) / 10,
  };
}

export function countKeywordOverrideRisk(catalog: Icd10CatalogRow[]): number {
  return catalog.filter((row) =>
    conditionFamilyKeywordWouldOverrideIcdMatch({ code: row.code, displayName: row.label })
  ).length;
}
