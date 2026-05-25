/**
 * Phase 19Y.6A — pediatric discharge template governance (metadata + validators only).
 * No pediatric diagnosis templates in registry yet.
 */

import type {
  ProviderDischargeTemplateLocale,
  ProviderDischargeTemplateSuggestedTextBody,
} from "./providerDischargeTemplateLocale";
import {
  getProviderDischargeSuggestedTextBody,
  suggestedTextBodyBlob,
} from "./providerDischargeTemplateLocale";
import type {
  ProviderDischargeTemplate,
  ProviderDischargeTemplateAgeRange,
  ProviderDischargeTemplateAgeRangeLabel,
} from "./providerDischargeTemplateRegistry";

export const PROVIDER_DISCHARGE_TEMPLATE_AGE_RANGE_LABELS = [
  "pediatric",
  "adolescent",
  "adult",
  "all_ages",
] as const satisfies readonly ProviderDischargeTemplateAgeRangeLabel[];

/** Approximate 18 years — used for pediatric vs adult-only range checks. */
export const PROVIDER_DISCHARGE_ADULT_MIN_AGE_DAYS = 18 * 365;

const PEDIATRIC_AGE_LABELS = new Set<ProviderDischargeTemplateAgeRangeLabel>(["pediatric", "adolescent"]);

export function isPediatricProviderDischargeAgeLabel(
  label: ProviderDischargeTemplateAgeRangeLabel | undefined
): boolean {
  return label != null && PEDIATRIC_AGE_LABELS.has(label);
}

/** Template subject to pediatric governance rules (label or reserved id prefix). */
export function isPediatricProviderDischargeTemplateCandidate(
  template: Pick<ProviderDischargeTemplate, "id" | "ageRange">
): boolean {
  if (isPediatricProviderDischargeAgeLabel(template.ageRange?.label)) return true;
  return template.id.startsWith("pediatric_");
}

export function validateProviderDischargeTemplateAgeRange(
  template: Pick<ProviderDischargeTemplate, "id" | "ageRange">
): string[] {
  const prefix = `[${template.id}]`;
  const errors: string[] = [];

  if (isPediatricProviderDischargeTemplateCandidate(template) && !template.ageRange) {
    errors.push(`${prefix} pediatric template must define ageRange`);
    return errors;
  }

  const ageRange = template.ageRange;
  if (!ageRange) return errors;

  if (!PROVIDER_DISCHARGE_TEMPLATE_AGE_RANGE_LABELS.includes(ageRange.label)) {
    errors.push(`${prefix} invalid ageRange.label: ${String(ageRange.label)}`);
  }

  if (ageRange.minAgeDays !== undefined) {
    if (!Number.isFinite(ageRange.minAgeDays) || ageRange.minAgeDays < 0) {
      errors.push(`${prefix} ageRange.minAgeDays must be a non-negative number`);
    }
  }

  if (ageRange.maxAgeDays !== undefined) {
    if (!Number.isFinite(ageRange.maxAgeDays) || ageRange.maxAgeDays < 0) {
      errors.push(`${prefix} ageRange.maxAgeDays must be a non-negative number`);
    }
  }

  if (
    ageRange.minAgeDays !== undefined &&
    ageRange.maxAgeDays !== undefined &&
    ageRange.maxAgeDays < ageRange.minAgeDays
  ) {
    errors.push(`${prefix} ageRange.maxAgeDays is before ageRange.minAgeDays`);
  }

  if (ageRange.label === "pediatric") {
    if (
      ageRange.minAgeDays !== undefined &&
      ageRange.minAgeDays >= PROVIDER_DISCHARGE_ADULT_MIN_AGE_DAYS
    ) {
      errors.push(`${prefix} pediatric ageRange.minAgeDays is clearly adult-only`);
    }
    if (
      ageRange.maxAgeDays !== undefined &&
      ageRange.minAgeDays === undefined &&
      ageRange.maxAgeDays >= PROVIDER_DISCHARGE_ADULT_MIN_AGE_DAYS
    ) {
      errors.push(`${prefix} pediatric ageRange.maxAgeDays is clearly adult-only`);
    }
  }

  return errors;
}

/** EN caregiver wording must appear in instructions, return precautions, or caregiverInstructions. */
export const PROVIDER_DISCHARGE_PEDIATRIC_EN_CAREGIVER_MARKERS = [
  "caregiver",
  "parent",
  "guardian",
] as const;

/** FR caregiver wording markers. */
export const PROVIDER_DISCHARGE_PEDIATRIC_FR_CAREGIVER_MARKERS = [
  "parent",
  "tuteur",
  "responsable",
  "accompagnant",
] as const;

export const PROVIDER_DISCHARGE_PEDIATRIC_EN_ESCALATION_MARKERS = [
  "seek immediate care",
  "return immediately",
  "call 911",
  "emergency care",
] as const;

export const PROVIDER_DISCHARGE_PEDIATRIC_FR_ESCALATION_MARKERS = [
  "consultez immédiatement",
  "retournez immédiatement",
  "appelez le 911",
  "soins urgents",
] as const;

export const PROVIDER_DISCHARGE_PEDIATRIC_UNSAFE_PHRASES: readonly { id: string; pattern: RegExp }[] = [
  { id: "adult-dose", pattern: /\badult dose\b/i },
  { id: "standard-adult-dose", pattern: /\bstandard adult dose\b/i },
  { id: "without-supervision", pattern: /\btake as needed without supervision\b/i },
  { id: "return-school-immediately", pattern: /\breturn to school immediately\b/i },
  { id: "no-follow-up", pattern: /\bno follow-up needed\b/i },
  { id: "benign", pattern: /\bbenign\b/i },
  { id: "nothing-serious", pattern: /\bnothing serious\b/i },
  { id: "safe-for-discharge", pattern: /\bsafe for discharge\b/i },
];

export const PROVIDER_DISCHARGE_PEDIATRIC_FORBIDDEN_DOSING_PHRASES: readonly { id: string; pattern: RegExp }[] = [
  { id: "mg-per-kg", pattern: /\bmg\s*\/\s*kg\b/i },
  { id: "milligrams-per-kilogram", pattern: /\bmilligrams per kilogram\b/i },
  { id: "weight-based-dose", pattern: /\bweight-based dose\b/i },
  { id: "dose-by-weight", pattern: /\bdose by weight\b/i },
  { id: "pediatric-dose", pattern: /\bpediatric dose\b/i },
  { id: "give-x-mg", pattern: /\bgive\s+\d+\s*mg\b/i },
  { id: "give-ml", pattern: /\bgive\s+\d+\s*mL\b/i },
  { id: "every-n-hours", pattern: /\bevery\s+\d+\s+hours\b/i },
  { id: "dosing-table", pattern: /\bdosing table\b/i },
  { id: "calculate-dose", pattern: /\bcalculate dose\b/i },
];

function pediatricInstructionBlob(body: ProviderDischargeTemplateSuggestedTextBody): string {
  return [body.diagnosisInstructions, body.returnPrecautions, body.caregiverInstructions ?? ""]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function scanMarkersMissing(blob: string, markers: readonly string[]): boolean {
  return !markers.some((marker) => blob.includes(marker.toLowerCase()));
}

export function scanProviderDischargePediatricCaregiverWording(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = pediatricInstructionBlob(body);
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_PEDIATRIC_EN_CAREGIVER_MARKERS
    : PROVIDER_DISCHARGE_PEDIATRIC_FR_CAREGIVER_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: pediatric ${locale} body missing caregiver wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargePediatricEscalationLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_PEDIATRIC_EN_ESCALATION_MARKERS
    : PROVIDER_DISCHARGE_PEDIATRIC_FR_ESCALATION_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: pediatric ${locale} body missing escalation language (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargePediatricUnsafePhrases(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body);
  const hits: string[] = [];
  for (const rule of PROVIDER_DISCHARGE_PEDIATRIC_UNSAFE_PHRASES) {
    if (rule.pattern.test(blob)) {
      hits.push(`${templateId}: pediatric unsafe phrase (${rule.id}) in ${locale}`);
    }
  }
  return hits;
}

export function scanProviderDischargePediatricForbiddenDosing(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body);
  const hits: string[] = [];
  for (const rule of PROVIDER_DISCHARGE_PEDIATRIC_FORBIDDEN_DOSING_PHRASES) {
    if (rule.pattern.test(blob)) {
      hits.push(`${templateId}: pediatric forbidden dosing phrase (${rule.id}) in ${locale}`);
    }
  }
  return hits;
}

export function validateProviderDischargePediatricTemplateGovernance(
  template: ProviderDischargeTemplate
): string[] {
  if (!isPediatricProviderDischargeTemplateCandidate(template)) return [];

  const errors: string[] = [...validateProviderDischargeTemplateAgeRange(template)];
  const prefix = `[${template.id}]`;

  if (!isPediatricProviderDischargeAgeLabel(template.ageRange?.label)) {
    if (template.id.startsWith("pediatric_")) {
      errors.push(`${prefix} pediatric template must set ageRange.label to pediatric or adolescent`);
    }
    return errors;
  }

  for (const locale of ["en", "fr"] as const) {
    let body: ProviderDischargeTemplateSuggestedTextBody;
    try {
      body = getProviderDischargeSuggestedTextBody(template, locale);
    } catch (err) {
      errors.push(`${prefix} cannot validate pediatric governance for ${locale}: ${String(err)}`);
      continue;
    }

    if (!(body.caregiverInstructions ?? "").trim()) {
      errors.push(`${prefix} pediatric template missing suggestedText.${locale}.caregiverInstructions`);
    }

    errors.push(...scanProviderDischargePediatricCaregiverWording(template.id, locale, body));
    errors.push(...scanProviderDischargePediatricEscalationLanguage(template.id, locale, body));
    errors.push(...scanProviderDischargePediatricUnsafePhrases(template.id, locale, body));
    errors.push(...scanProviderDischargePediatricForbiddenDosing(template.id, locale, body));
  }

  return errors;
}

/** Append caregiverInstructions to diagnosisInstructions when present at apply time. */
export function buildAppliedDiagnosisInstructionsFromTemplateBody(
  body: ProviderDischargeTemplateSuggestedTextBody
): string {
  const base = body.diagnosisInstructions.trim();
  const caregiver = (body.caregiverInstructions ?? "").trim();
  if (!caregiver) return body.diagnosisInstructions;
  if (!base) return caregiver;
  if (base.includes(caregiver)) return body.diagnosisInstructions;
  return `${base}\n\n${caregiver}`;
}
