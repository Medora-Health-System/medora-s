/**
 * MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.3
 * Production resolver coverage audit — template ↔ family assignment matrix.
 */

import {
  buildClinicalFamilyCoverageReport,
  buildResolverParityReport,
  buildTemplateToFamilyMap,
} from "./providerDischargeClinicalFamilyCoverage";
import {
  CLINICAL_CONDITION_FAMILY_DEFINITIONS,
  getClinicalConditionFamilyById,
  getFamiliesByRoutingStatus,
} from "./providerDischargeConditionFamilies";
import type {
  ClinicalConditionFamilyRoutingStatus,
  EdClinicalDomain,
} from "./providerDischargeConditionFamilyTypes";
import {
  GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
  PROVIDER_DISCHARGE_TEMPLATE_REGISTRY,
} from "./providerDischargeTemplateRegistry";

export type ProductionResolverCoverageRow = {
  templateId: string;
  currentRegistryMapping: string;
  familyId: string | null;
  familyStatus: ClinicalConditionFamilyRoutingStatus | "UNASSIGNED";
  domain: EdClinicalDomain | "Unknown";
  risk: string;
  recommendedAction: string;
};

export type ProductionResolverCoverageAudit = {
  totalNonGenericRegistryTemplates: number;
  templatesAssignedToClinicalFamilies: number;
  templatesNotAssigned: number;
  coveragePercent: number;
  parityPercent: number;
  needsReviewFamilies: Array<{ id: string; label: string; templateId: string }>;
  unsafeDoNotMapFamilies: Array<{ id: string; label: string; templateId: string }>;
  deferredSpecialtyFamilies: Array<{ id: string; label: string; templateId: string }>;
  unmappedTemplateIds: string[];
  productionUsesFamilyResolver: boolean;
  rows: ProductionResolverCoverageRow[];
};

function formatRegistryMapping(templateId: string): string {
  const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === templateId);
  if (!template) return "unknown";
  const m = template.diagnosisMappings;
  const parts: string[] = [];
  if (m.icdExact?.length) parts.push(`icdExact: ${m.icdExact.slice(0, 3).join(", ")}`);
  if (m.icdFamily?.length) parts.push(`icdFamily: ${m.icdFamily.slice(0, 3).join(", ")}`);
  if (m.keyword?.length) parts.push(`keyword: ${m.keyword.slice(0, 2).join(", ")}`);
  return parts.length ? parts.join(" | ") : "none";
}

function recommendedActionForRow(
  familyId: string | null,
  status: ClinicalConditionFamilyRoutingStatus | "UNASSIGNED"
): string {
  if (status === "UNASSIGNED") return "Add conservative family or classify as DEFERRED_SPECIALTY_ONLY";
  if (status === "UNSAFE_DO_NOT_MAP") return "Never route via family resolver — registry/keyword only";
  if (status === "DEFERRED_SPECIALTY_ONLY") return "Specialty follow-up template — keyword context required";
  if (status === "NEEDS_REVIEW") return "Clinical review before promoting to READY";
  return "Ready for shadow-mode monitoring";
}

export function buildProductionResolverCoverageAudit(): ProductionResolverCoverageAudit {
  const coverage = buildClinicalFamilyCoverageReport();
  const parity = buildResolverParityReport();
  const templateToFamily = buildTemplateToFamilyMap();

  const templates = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.filter(
    (t) => t.id !== GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID
  );

  const rows: ProductionResolverCoverageRow[] = templates.map((template) => {
    const familyId = templateToFamily.get(template.id) ?? null;
    const family = familyId ? getClinicalConditionFamilyById(familyId) : undefined;
    const status = family?.routingStatus ?? "UNASSIGNED";

    return {
      templateId: template.id,
      currentRegistryMapping: formatRegistryMapping(template.id),
      familyId,
      familyStatus: status,
      domain: family?.clinicalDomain ?? "Unknown",
      risk: family?.riskCategory ?? template.riskCategory ?? "unknown",
      recommendedAction: recommendedActionForRow(familyId, status),
    };
  });

  const mapFamilies = (families: typeof CLINICAL_CONDITION_FAMILY_DEFINITIONS) =>
    families.map((f) => ({ id: f.id, label: f.label, templateId: f.templateId }));

  return {
    totalNonGenericRegistryTemplates: coverage.totalRegistryTemplates,
    templatesAssignedToClinicalFamilies: coverage.templatesAssignedToFamilies,
    templatesNotAssigned: coverage.templatesNotAssigned,
    coveragePercent: coverage.coveragePercent,
    parityPercent: parity.parityPercent,
    needsReviewFamilies: mapFamilies(getFamiliesByRoutingStatus("NEEDS_REVIEW")),
    unsafeDoNotMapFamilies: mapFamilies(getFamiliesByRoutingStatus("UNSAFE_DO_NOT_MAP")),
    deferredSpecialtyFamilies: mapFamilies(getFamiliesByRoutingStatus("DEFERRED_SPECIALTY_ONLY")),
    unmappedTemplateIds: coverage.unmappedTemplateIds,
    productionUsesFamilyResolver: false,
    rows,
  };
}

export type CoverageGapClosureRow = {
  templateId: string;
  proposedFamily: string;
  status: ClinicalConditionFamilyRoutingStatus;
  icdMapping: string;
  guardrails: string;
  rationale: string;
  coverageImpact: string;
};

export type CoverageGapClosureReport = {
  rows: CoverageGapClosureRow[];
  coverageBeforePercent: number;
  coverageAfterPercent: number;
  targetMet: boolean;
};

export function buildCoverageGapClosureReport(): CoverageGapClosureReport {
  const before = 91.3;
  const after = buildClinicalFamilyCoverageReport().coveragePercent;

  const gapFamilies = CLINICAL_CONDITION_FAMILY_DEFINITIONS.filter((f) =>
    [
      "urology_foley_catheter",
      "dialysis_return_precautions",
      "diabetes_hyperglycemia_followup",
      "diabetes_hypoglycemia_followup",
      "diabetes_dka_return_precautions",
      "diabetes_insulin_management",
      "endocrine_thyroid_followup",
      "metabolic_dehydration_followup",
      "metabolic_nausea_weakness_followup",
      "metabolic_electrolyte_followup",
      "endocrine_polyuria_polydipsia",
    ].includes(f.id)
  );

  const rows: CoverageGapClosureRow[] = gapFamilies.map((f) => {
    const icdParts: string[] = [];
    if (f.icdExact?.length) icdParts.push(`exact: ${f.icdExact.join(", ")}`);
    if (f.icdPrefixes?.length) icdParts.push(`prefix: ${f.icdPrefixes.join(", ")}`);
    if (f.keywords?.length) icdParts.push(`keyword: ${f.keywords.slice(0, 2).join(", ")}`);

    const guardParts: string[] = [];
    if (f.guardrails?.age?.maxAgeYears !== undefined) guardParts.push(`age<${f.guardrails.age.maxAgeYears}`);
    if (f.guardrails?.age?.minAgeYears !== undefined) guardParts.push(`age>=${f.guardrails.age.minAgeYears}`);
    if (f.guardrails?.sex?.sex) guardParts.push(`sex=${f.guardrails.sex.sex}`);
    if (f.guardrails?.safety?.highRiskEscalation) guardParts.push("highRiskEscalation");
    if (f.guardrails?.safety?.requiresEdReturnPrecautions) guardParts.push("edReturnPrecautions");
    if (f.guardrails?.safety?.requiresSpecialistFollowUp) guardParts.push("specialistFollowUp");

    return {
      templateId: f.templateId,
      proposedFamily: f.id,
      status: f.routingStatus,
      icdMapping: icdParts.join("; ") || "keyword-only",
      guardrails: guardParts.join(", ") || "none",
      rationale: f.clinicalRationale,
      coverageImpact: "+1 template assigned",
    };
  });

  return {
    rows,
    coverageBeforePercent: before,
    coverageAfterPercent: after,
    targetMet: after >= 95,
  };
}
