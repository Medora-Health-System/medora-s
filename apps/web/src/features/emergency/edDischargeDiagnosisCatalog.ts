/**
 * MEDUI.ED.DISCHARGE.DIAGNOSIS_INSTRUCTIONS.2
 * Authoritative ED diagnosis catalog for discharge-instruction coverage audits.
 *
 * Source: diagnosis-tab quick picks (`COMMON_DIAGNOSES`) plus canonical ICD codes
 * representing each non-generic provider discharge template in the registry.
 */

import { COMMON_DIAGNOSES } from "@/constants/clinicalTemplates";
import {
  GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
  PROVIDER_DISCHARGE_TEMPLATE_REGISTRY,
  resolveProviderDischargeTemplateForDiagnosis,
  type ProviderDischargeTemplateMatchLevel,
} from "./providerDischargeTemplateRegistry";
import { getProviderDischargeSuggestedTextBody } from "./providerDischargeTemplateLocale";
import {
  bodyIncludesGoldStandardMedicationSafety,
  bodyIncludesGoldStandardReturnSuffix,
  followUpTimingUsesOneToTwoDays,
} from "./providerDischargeTemplateGoldStandard";

export type EdDischargeDiagnosisCatalogEntry = {
  code: string;
  label: string;
  source: "common_diagnosis" | "template_canonical";
  expectedTemplateId?: string;
};

export type EdDischargeDiagnosisAuditStatus =
  | "SPECIFIC_COMPLETE"
  | "GENERIC_FALLBACK_ONLY"
  | "PARTIAL"
  | "MISSING";

export type EdDischargeDiagnosisAuditRow = {
  icd10: string;
  diagnosis: string;
  templateId: string;
  templateMatch: ProviderDischargeTemplateMatchLevel;
  hasDiagnosisSpecificTemplate: boolean;
  hasDescription: boolean;
  hasInstructions: boolean;
  hasMedicationTreatment: boolean;
  hasReturnPrecautions: boolean;
  hasFollowUp: boolean;
  status: EdDischargeDiagnosisAuditStatus;
};

function canonicalCodeForTemplate(templateId: string): { code: string; label: string } | null {
  const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === templateId);
  if (!template || template.id === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID) return null;
  const exact = template.diagnosisMappings.icdExact?.[0];
  if (exact) {
    return { code: exact, label: template.title };
  }
  const family = template.diagnosisMappings.icdFamily?.[0];
  if (family) {
    const prefix = family.replace(/\.\*$/, "").replace(/\*$/, "");
    const code = prefix.includes(".") ? `${prefix}9` : `${prefix}.9`;
    return { code, label: template.title };
  }
  const keyword = template.diagnosisMappings.keyword?.[0];
  if (keyword) {
    return { code: "Z00.00", label: keyword };
  }
  return null;
}

export function buildTemplateCanonicalCatalogEntries(): EdDischargeDiagnosisCatalogEntry[] {
  const entries: EdDischargeDiagnosisCatalogEntry[] = [];
  for (const t of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
    if (t.id === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID) continue;
    const canonical = canonicalCodeForTemplate(t.id);
    if (!canonical) continue;
    entries.push({
      code: canonical.code,
      label: canonical.label,
      source: "template_canonical",
      expectedTemplateId: t.id,
    });
  }
  return entries;
}

/** Diagnosis-tab quick picks + one canonical code per non-generic template. */
export function buildEdDischargeDiagnosisCatalog(): EdDischargeDiagnosisCatalogEntry[] {
  const common: EdDischargeDiagnosisCatalogEntry[] = COMMON_DIAGNOSES.map((d) => ({
    code: d.code,
    label: d.label,
    source: "common_diagnosis" as const,
  }));
  const canonical = buildTemplateCanonicalCatalogEntries();
  const seen = new Set<string>();
  const merged: EdDischargeDiagnosisCatalogEntry[] = [];
  for (const entry of [...common, ...canonical]) {
    const key = entry.code.trim().toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(entry);
  }
  return merged;
}

export function auditEdDischargeDiagnosisCoverage(
  catalog: readonly EdDischargeDiagnosisCatalogEntry[] = buildEdDischargeDiagnosisCatalog()
): EdDischargeDiagnosisAuditRow[] {
  return catalog.map((entry) => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: entry.code,
      displayName: entry.label,
    });
    const body = getProviderDischargeSuggestedTextBody(resolved.template, "en");
    const hasDescription = Boolean(body.description.trim());
    const hasInstructions = Boolean(body.diagnosisInstructions.trim());
    const hasMedicationTreatment = Boolean(body.medicationTreatment.trim());
    const hasReturnPrecautions = Boolean(body.returnPrecautions.trim());
    const hasFollowUp = (resolved.template.defaultFollowUps?.length ?? 0) > 0;
    const specific = resolved.template.id !== GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID;
    const fieldCount = [hasDescription, hasInstructions, hasMedicationTreatment, hasReturnPrecautions, hasFollowUp].filter(
      Boolean
    ).length;

    let status: EdDischargeDiagnosisAuditStatus;
    if (!specific) {
      status = fieldCount === 5 ? "GENERIC_FALLBACK_ONLY" : fieldCount === 0 ? "MISSING" : "PARTIAL";
    } else if (fieldCount === 5) {
      status = "SPECIFIC_COMPLETE";
    } else if (fieldCount === 0) {
      status = "MISSING";
    } else {
      status = "PARTIAL";
    }

    return {
      icd10: entry.code,
      diagnosis: entry.label,
      templateId: resolved.template.id,
      templateMatch: resolved.matchLevel,
      hasDiagnosisSpecificTemplate: specific,
      hasDescription,
      hasInstructions,
      hasMedicationTreatment,
      hasReturnPrecautions,
      hasFollowUp,
      status,
    };
  });
}

export function catalogEntriesStillOnGenericFallback(
  catalog: readonly EdDischargeDiagnosisCatalogEntry[] = buildEdDischargeDiagnosisCatalog()
): EdDischargeDiagnosisAuditRow[] {
  return auditEdDischargeDiagnosisCoverage(catalog).filter((row) => !row.hasDiagnosisSpecificTemplate);
}

export function isTemplateGoldStandardComplete(templateId: string, locale: "en" | "fr" = "en"): boolean {
  const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === templateId);
  if (!template || template.id === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID) return false;
  const body = getProviderDischargeSuggestedTextBody(template, locale);
  if (!body.description.trim() || !body.diagnosisInstructions.trim() || !body.medicationTreatment.trim()) {
    return false;
  }
  if (!body.returnPrecautions.trim()) return false;
  if (!(template.defaultFollowUps?.length ?? 0)) return false;
  if (!bodyIncludesGoldStandardMedicationSafety(body.medicationTreatment)) return false;
  if (!bodyIncludesGoldStandardReturnSuffix(body.returnPrecautions)) return false;
  return (template.defaultFollowUps ?? []).every((row) => followUpTimingUsesOneToTwoDays(row.timing));
}
