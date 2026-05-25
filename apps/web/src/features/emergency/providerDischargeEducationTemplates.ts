/**
 * Phase 19Y — backward-compatible adapter to the centralized template registry (19Y.2).
 * @deprecated Import from providerDischargeTemplateRegistry instead.
 */

import {
  PROVIDER_DISCHARGE_TEMPLATE_REGISTRY,
  resolveProviderDischargeTemplateForDiagnosis,
  getProviderDischargeSuggestedTextBody,
  type ProviderDischargeTemplate,
} from "./providerDischargeTemplateRegistry";

export type ProviderDischargeEducationSource = {
  id: string;
  title: string;
  url: string;
  publisher: string;
};

export type ProviderDischargeEducationTemplate = {
  id: string;
  match: { icdPrefixes?: string[]; keywords?: string[] };
  description: string;
  instructions: string;
  returnPrecautions: string;
  woundCare?: string;
  sources: ProviderDischargeEducationSource[];
};

/** @deprecated Use PROVIDER_DISCHARGE_TEMPLATE_REGISTRY */
export const PROVIDER_DISCHARGE_EDUCATION_TEMPLATES: readonly ProviderDischargeEducationTemplate[] =
  PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.filter((t) => t.id !== "generic_ed_discharge_v1").map((t) => {
    const text = getProviderDischargeSuggestedTextBody(t, "en");
    return {
      id: t.id,
      match: {
        icdPrefixes: t.diagnosisMappings.icdFamily,
        keywords: t.diagnosisMappings.keyword,
      },
      description: text.description,
      instructions: text.diagnosisInstructions,
      returnPrecautions: text.returnPrecautions,
      sources: t.sourceReferences.map((s, i) => ({
        id: `${t.id}-source-${i}`,
        title: s.label,
        url: s.url ?? "",
        publisher: s.publisher ?? "",
      })),
    };
  });

export function normalizeEducationMatchToken(value: string): string {
  return value.trim().toLowerCase();
}

/** @deprecated Use resolveProviderDischargeTemplateForDiagnosis */
export function matchProviderDischargeEducationTemplate(input: {
  code?: string;
  label?: string;
}): ProviderDischargeEducationTemplate | null {
  const resolved = resolveProviderDischargeTemplateForDiagnosis({
    code: input.code,
    displayName: input.label,
    label: input.label,
  });
  if (resolved.matchLevel === "generic") return null;
  const legacy = PROVIDER_DISCHARGE_EDUCATION_TEMPLATES.find((t) => t.id === resolved.template.id);
  return legacy ?? null;
}

/** @deprecated Use applyProviderDischargeTemplateToCard */
export function buildEducationSuggestionFromTemplate(
  template: ProviderDischargeEducationTemplate
): { description: string; instructions: string; returnPrecautions: string } {
  return {
    description: template.description,
    instructions: template.woundCare ? `${template.instructions}\n${template.woundCare}` : template.instructions,
    returnPrecautions: template.returnPrecautions,
  };
}

export type { ProviderDischargeTemplate };
