/**
 * Phase 19Y.21 — endocrine/diabetes/metabolic-risk discharge template governance.
 */

import type {
  ProviderDischargeTemplateLocale,
  ProviderDischargeTemplateSuggestedTextBody,
} from "./providerDischargeTemplateLocale";
import {
  getProviderDischargeSuggestedTextBody,
  suggestedTextBodyBlob,
} from "./providerDischargeTemplateLocale";
import type { ProviderDischargeTemplate } from "./providerDischargeTemplateRegistry";
import type { ProviderDischargeFollowUpRow } from "./providerDischargeDocumentationModel";

export type ProviderDischargeTemplateEndocrineMetabolicSafety = {
  diabetesSensitive?: boolean;
  dkaSensitive?: boolean;
  hhsSensitive?: boolean;
  hypoglycemiaSensitive?: boolean;
  hyperglycemiaSensitive?: boolean;
  dehydrationSensitive?: boolean;
  insulinSensitive?: boolean;
  metabolicSensitive?: boolean;
  endocrineSensitive?: boolean;
  requiresGlucoseEscalation?: boolean;
  requiresHydrationEscalation?: boolean;
  requiresInsulinPrecautions?: boolean;
  requiresNeurologicEscalation?: boolean;
  requiresDiabetesFollowUp?: boolean;
  requiresEndocrinologyFollowUp?: boolean;
  requiresResultInterpretationCaution?: boolean;
};

const DIABETES_FOLLOW_UP_SPECIALTIES = new Set(["PRIMARY_CARE", "ENDOCRINOLOGY"]);
const ENDOCRINOLOGY_FOLLOW_UP_SPECIALTIES = new Set(["ENDOCRINOLOGY"]);

export function isEndocrineMetabolicProviderDischargeTemplateCandidate(
  template: Pick<ProviderDischargeTemplate, "id">
): boolean {
  return (
    template.id.startsWith("endocrine_") ||
    template.id.startsWith("diabetes_") ||
    template.id.startsWith("metabolic_")
  );
}

export const PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_FORBIDDEN_PHRASES: readonly {
  id: string;
  pattern: RegExp;
}[] = [
  { id: "dka-ruled-out", pattern: /\bdka ruled out\b/i },
  { id: "hhs-ruled-out", pattern: /\bhhs ruled out\b/i },
  { id: "no-diabetic-emergency", pattern: /\bno diabetic emergency\b/i },
  { id: "glucose-normal", pattern: /\bglucose normal\b/i },
  { id: "blood-sugar-normal", pattern: /\bblood sugar normal\b/i },
  { id: "sugars-stable", pattern: /\bsugars stable\b/i },
  { id: "ketones-negative", pattern: /\bketones negative\b/i },
  { id: "no-ketones", pattern: /\bno ketones\b/i },
  { id: "diabetes-controlled", pattern: /\bdiabetes controlled\b/i },
  { id: "diabetic-crisis-resolved", pattern: /\bdiabetic crisis resolved\b/i },
  { id: "insulin-not-needed", pattern: /\binsulin not needed\b/i },
  { id: "dehydration-resolved", pattern: /\bdehydration resolved\b/i },
  { id: "labs-normal", pattern: /\blabs normal\b/i },
  { id: "electrolytes-normal", pattern: /\belectrolytes normal\b/i },
  { id: "anion-gap-normal", pattern: /\banion gap normal\b/i },
  { id: "bicarbonate-normal", pattern: /\bbicarbonate normal\b/i },
  { id: "metabolic-issue-resolved", pattern: /\bmetabolic issue resolved\b/i },
  { id: "medically-cleared", pattern: /\bmedically cleared\b/i },
  { id: "safe-for-discharge", pattern: /\bsafe for discharge\b/i },
  { id: "low-risk", pattern: /\blow risk\b/i },
  { id: "you-are-stable", pattern: /\byou are stable\b/i },
  { id: "diabetes-is-stable", pattern: /\byour diabetes is stable\b/i },
  { id: "sugars-are-controlled", pattern: /\byour sugars are controlled\b/i },
  { id: "glucose-controlled", pattern: /\bglucose controlled\b/i },
  { id: "a1c-normal", pattern: /\ba1c normal\b/i },
  { id: "hypoglycemia-resolved", pattern: /\bhypoglycemia resolved\b/i },
  { id: "hyperglycemia-resolved", pattern: /\bhyperglycemia resolved\b/i },
];

export const PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_RESULT_INTERPRETATION_FORBIDDEN_PHRASES: readonly {
  id: string;
  pattern: RegExp;
}[] = [
  { id: "glucose-reassuring", pattern: /\bglucose reassuring\b/i },
  { id: "labs-reassuring", pattern: /\blabs reassuring\b/i },
  { id: "ketones-negative", pattern: /\bketones negative\b/i },
  { id: "metabolic-panel-normal", pattern: /\bmetabolic panel normal\b/i },
  { id: "no-acute-metabolic-findings", pattern: /\bno acute metabolic findings\b/i },
  { id: "insulin-unnecessary", pattern: /\binsulin unnecessary\b/i },
  { id: "dka-excluded", pattern: /\bdka excluded\b/i },
  { id: "hhs-excluded", pattern: /\bhhs excluded\b/i },
  { id: "sugars-controlled", pattern: /\bsugars controlled\b/i },
  { id: "diabetic-emergency-excluded", pattern: /\bdiabetic emergency excluded\b/i },
];

export const PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_EN_GLUCOSE_MARKERS = [
  "worsening weakness",
  "confusion",
  "vomiting",
  "excessive thirst",
  "excessive urination",
  "fainting",
  "return immediately",
] as const;

export const PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_FR_GLUCOSE_MARKERS = [
  "faiblesse qui s'aggrave",
  "confusion",
  "vomissements",
  "soif excessive",
  "urination fréquente",
  "évanouissement",
  "retournez immédiatement",
] as const;

export const PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_EN_HYDRATION_MARKERS = [
  "unable to keep fluids down",
  "worsening vomiting",
  "dehydration",
  "dizziness",
] as const;

export const PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_FR_HYDRATION_MARKERS = [
  "incapable de garder les liquides",
  "vomissements",
  "déshydratation",
  "étourdissements",
] as const;

export const PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_EN_INSULIN_MARKERS = [
  "take insulin exactly as directed",
  "do not skip insulin",
  "seek care for worsening symptoms",
] as const;

export const PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_FR_INSULIN_MARKERS = [
  "prenez l'insuline exactement comme prescrite",
  "ne sautez pas l'insuline",
  "consultez pour aggravation des symptômes",
] as const;

export const PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_EN_NEUROLOGIC_MARKERS = [
  "confusion",
  "seizures",
  "trouble waking up",
  "weakness",
] as const;

export const PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_FR_NEUROLOGIC_MARKERS = [
  "confusion",
  "convulsions",
  "difficulté à réveiller",
  "faiblesse",
] as const;

function blobIncludesAny(blob: string, markers: readonly string[]): boolean {
  const lower = blob.toLowerCase();
  return markers.some((marker) => lower.includes(marker.toLowerCase()));
}

function scanMarkersMissing(blob: string, markers: readonly string[]): boolean {
  return !blobIncludesAny(blob, markers);
}

function followUpSpecialtyInSet(row: ProviderDischargeFollowUpRow, allowed: Set<string>): boolean {
  return allowed.has(row.specialty.trim().toUpperCase());
}

function scanForbiddenPhrases(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  blob: string,
  rules: readonly { id: string; pattern: RegExp }[],
  category: string
): string[] {
  const hits: string[] = [];
  for (const rule of rules) {
    if (rule.pattern.test(blob)) {
      hits.push(`${templateId}: endocrine-metabolic ${category} forbidden phrase (${rule.id}) in ${locale}`);
    }
  }
  return hits;
}

function idRequiresSensitiveFlag(templateId: string): Array<{
  needle: string;
  flag: keyof ProviderDischargeTemplateEndocrineMetabolicSafety;
  label: string;
}> {
  const id = templateId.toLowerCase();
  const rules: Array<{
    needle: string;
    flag: keyof ProviderDischargeTemplateEndocrineMetabolicSafety;
    label: string;
  }> = [];
  if (id.includes("dka")) rules.push({ needle: "dka", flag: "dkaSensitive", label: "dkaSensitive" });
  if (id.includes("hhs")) rules.push({ needle: "hhs", flag: "hhsSensitive", label: "hhsSensitive" });
  if (id.includes("hypoglycemia")) {
    rules.push({ needle: "hypoglycemia", flag: "hypoglycemiaSensitive", label: "hypoglycemiaSensitive" });
  }
  if (id.includes("hyperglycemia")) {
    rules.push({ needle: "hyperglycemia", flag: "hyperglycemiaSensitive", label: "hyperglycemiaSensitive" });
  }
  if (id.includes("diabetes") || id.includes("diabetic")) {
    rules.push({ needle: "diabetes", flag: "diabetesSensitive", label: "diabetesSensitive" });
  }
  if (id.includes("insulin")) {
    rules.push({ needle: "insulin", flag: "insulinSensitive", label: "insulinSensitive" });
  }
  if (id.includes("metabolic")) {
    rules.push({ needle: "metabolic", flag: "metabolicSensitive", label: "metabolicSensitive" });
  }
  if (id.includes("endocrine")) {
    rules.push({ needle: "endocrine", flag: "endocrineSensitive", label: "endocrineSensitive" });
  }
  return rules;
}

function validateEndocrineMetabolicSafetyMetadata(template: ProviderDischargeTemplate): string[] {
  const prefix = `[${template.id}]`;
  const errors: string[] = [];
  const safety = template.endocrineMetabolicSafety;

  if (!safety || typeof safety !== "object") {
    errors.push(`${prefix} endocrine-metabolic template must define endocrineMetabolicSafety`);
    return errors;
  }

  for (const rule of idRequiresSensitiveFlag(template.id)) {
    if (safety[rule.flag] !== true) {
      errors.push(`${prefix} id contains "${rule.needle}" and must set ${rule.label}: true`);
    }
  }

  if (safety.requiresDiabetesFollowUp === true) {
    const rows = template.defaultFollowUps ?? [];
    const hasFollowUp = rows.some((row) => followUpSpecialtyInSet(row, DIABETES_FOLLOW_UP_SPECIALTIES));
    if (!hasFollowUp) {
      errors.push(`${prefix} requiresDiabetesFollowUp but no primary care/endocrinology follow-up row`);
    }
  }

  if (safety.requiresEndocrinologyFollowUp === true) {
    const rows = template.defaultFollowUps ?? [];
    const hasFollowUp = rows.some((row) => followUpSpecialtyInSet(row, ENDOCRINOLOGY_FOLLOW_UP_SPECIALTIES));
    if (!hasFollowUp) {
      errors.push(`${prefix} requiresEndocrinologyFollowUp but no endocrinology follow-up row`);
    }
  }

  return errors;
}

export function scanProviderDischargeEndocrineMetabolicForbiddenPhrases(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  return scanForbiddenPhrases(
    templateId,
    locale,
    suggestedTextBodyBlob(body),
    PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_FORBIDDEN_PHRASES,
    "general"
  );
}

export function scanProviderDischargeEndocrineMetabolicResultInterpretationForbiddenPhrases(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  return scanForbiddenPhrases(
    templateId,
    locale,
    suggestedTextBodyBlob(body),
    PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_RESULT_INTERPRETATION_FORBIDDEN_PHRASES,
    "result interpretation"
  );
}

export function scanProviderDischargeEndocrineMetabolicGlucoseEscalationLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_EN_GLUCOSE_MARKERS
    : PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_FR_GLUCOSE_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: endocrine-metabolic ${locale} body missing glucose escalation wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeEndocrineMetabolicHydrationEscalationLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_EN_HYDRATION_MARKERS
    : PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_FR_HYDRATION_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: endocrine-metabolic ${locale} body missing hydration escalation wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeEndocrineMetabolicInsulinPrecautionsLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_EN_INSULIN_MARKERS
    : PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_FR_INSULIN_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: endocrine-metabolic ${locale} body missing insulin precaution wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeEndocrineMetabolicNeurologicEscalationLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_EN_NEUROLOGIC_MARKERS
    : PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_FR_NEUROLOGIC_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: endocrine-metabolic ${locale} body missing neurologic escalation wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function validateProviderDischargeEndocrineMetabolicTemplateGovernance(
  template: ProviderDischargeTemplate
): string[] {
  if (!isEndocrineMetabolicProviderDischargeTemplateCandidate(template)) return [];

  const errors: string[] = [...validateEndocrineMetabolicSafetyMetadata(template)];
  const prefix = `[${template.id}]`;
  const safety = template.endocrineMetabolicSafety;
  if (!safety) return errors;

  for (const locale of ["en", "fr"] as const) {
    let body: ProviderDischargeTemplateSuggestedTextBody;
    try {
      body = getProviderDischargeSuggestedTextBody(template, locale);
    } catch (err) {
      errors.push(`${prefix} cannot validate endocrine-metabolic governance for ${locale}: ${String(err)}`);
      continue;
    }

    errors.push(...scanProviderDischargeEndocrineMetabolicForbiddenPhrases(template.id, locale, body));

    if (safety.requiresResultInterpretationCaution === true) {
      errors.push(
        ...scanProviderDischargeEndocrineMetabolicResultInterpretationForbiddenPhrases(template.id, locale, body)
      );
    }

    if (safety.requiresGlucoseEscalation === true) {
      errors.push(...scanProviderDischargeEndocrineMetabolicGlucoseEscalationLanguage(template.id, locale, body));
    }

    if (safety.requiresHydrationEscalation === true) {
      errors.push(...scanProviderDischargeEndocrineMetabolicHydrationEscalationLanguage(template.id, locale, body));
    }

    if (safety.requiresInsulinPrecautions === true) {
      errors.push(...scanProviderDischargeEndocrineMetabolicInsulinPrecautionsLanguage(template.id, locale, body));
    }

    if (safety.requiresNeurologicEscalation === true) {
      errors.push(...scanProviderDischargeEndocrineMetabolicNeurologicEscalationLanguage(template.id, locale, body));
    }
  }

  return errors;
}

export function normalizeEndocrineMetabolicSafetyForHash(
  safety: ProviderDischargeTemplateEndocrineMetabolicSafety | undefined
): Record<string, boolean> | null {
  if (!safety) return null;
  const keys = [
    "diabetesSensitive",
    "dkaSensitive",
    "hhsSensitive",
    "hypoglycemiaSensitive",
    "hyperglycemiaSensitive",
    "dehydrationSensitive",
    "insulinSensitive",
    "metabolicSensitive",
    "endocrineSensitive",
    "requiresGlucoseEscalation",
    "requiresHydrationEscalation",
    "requiresInsulinPrecautions",
    "requiresNeurologicEscalation",
    "requiresDiabetesFollowUp",
    "requiresEndocrinologyFollowUp",
    "requiresResultInterpretationCaution",
  ] as const satisfies readonly (keyof ProviderDischargeTemplateEndocrineMetabolicSafety)[];
  const out: Record<string, boolean> = {};
  for (const key of [...keys].sort()) {
    if (safety[key] === true) out[key] = true;
  }
  return Object.keys(out).length ? out : null;
}
