/**
 * Phase 19Y.6A / 19Y.7 / 19Y.7A — pediatric discharge template governance (metadata + validators).
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
  ProviderDischargeEscalationSeverity,
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

const ESCALATION_LEVEL_RANK: Record<ProviderDischargeEscalationSeverity, number> = {
  routine: 0,
  urgent: 1,
  emergency: 2,
};

export const PROVIDER_DISCHARGE_PEDIATRIC_DANGER_SIGN_CATEGORIES = [
  "breathing_difficulty",
  "lethargy",
  "dehydration",
  "seizure",
  "confusion_behavior",
  "persistent_vomiting",
  "trouble_waking",
  "blue_lips",
  "poor_intake",
  "worsening_symptoms",
] as const;

export type ProviderDischargePediatricDangerSignCategory =
  (typeof PROVIDER_DISCHARGE_PEDIATRIC_DANGER_SIGN_CATEGORIES)[number];

export const PROVIDER_DISCHARGE_PEDIATRIC_DANGER_SIGN_PHRASES: Record<
  ProviderDischargePediatricDangerSignCategory,
  { en: readonly string[]; fr: readonly string[] }
> = {
  breathing_difficulty: {
    en: ["trouble breathing", "difficulty breathing", "breathing worsens", "work of breathing"],
    fr: ["mal à respirer", "difficulté respiratoire", "respiration s'aggrave", "difficulté à respirer"],
  },
  lethargy: {
    en: ["lethargic", "very lethargic", "lethargy", "decreased alertness"],
    fr: ["léthargique", "très léthargique", "léthargie", "baisse de vigilance"],
  },
  dehydration: {
    en: ["dehydration", "signs of dehydration", "decreased urination", "urine output", "dry mouth"],
    fr: ["déshydratation", "signes de déshydratation", "diurèse diminue", "bouche sèche"],
  },
  seizure: {
    en: ["seizure", "convulsion"],
    fr: ["crise convulsive", "convulsion"],
  },
  confusion_behavior: {
    en: ["confusion", "unusual behavior", "behavior change", "confused"],
    fr: ["confusion", "comportement inhabituel", "changement de comportement"],
  },
  persistent_vomiting: {
    en: ["persistent vomiting", "repeated vomiting", "vomiting prevents"],
    fr: ["vomissements persistants", "vomissements répétés", "vomissements empêchent"],
  },
  trouble_waking: {
    en: ["difficult to wake", "trouble waking", "cannot wake"],
    fr: ["difficile à réveiller", "difficulté à réveiller"],
  },
  blue_lips: {
    en: ["blue lips", "lips turn blue"],
    fr: ["lèvres bleutées", "lèvres deviennent bleues"],
  },
  poor_intake: {
    en: ["poor fluid intake", "poor intake", "cannot keep fluids down", "feeding"],
    fr: ["boit mal", "apports hydriques insuffisants", "ne peut pas boire", "alimentation"],
  },
  worsening_symptoms: {
    en: ["worsening symptoms", "symptoms worsen", "worsening"],
    fr: ["signes s'aggravent", "aggravation des signes", "s'aggravent", "s'aggrave"],
  },
};

/** Templates subject to dehydration danger-sign scanning (Part D). */
export const PROVIDER_DISCHARGE_PEDIATRIC_DEHYDRATION_DANGER_TEMPLATE_IDS = new Set<string>([
  "pediatric_fever_v1",
  "pediatric_viral_syndrome_v1",
  "pediatric_uri_v1",
  "pediatric_gastroenteritis_v1",
  "pediatric_mild_dehydration_v1",
]);

export const PROVIDER_DISCHARGE_PEDIATRIC_DEHYDRATION_DANGER_EN_PHRASES = [
  "poor intake",
  "decreased urination",
  "lethargic",
  "persistent vomiting",
  "inability to tolerate fluids",
  "signs of dehydration",
  "cannot keep fluids down",
  "urine output",
  "dry mouth",
] as const;

export const PROVIDER_DISCHARGE_PEDIATRIC_DEHYDRATION_DANGER_FR_PHRASES = [
  "apports diminués",
  "diurèse diminue",
  "léthargie",
  "vomissements persistants",
  "ne peut pas boire",
  "signes de déshydratation",
  "hydratation",
  "bouche sèche",
] as const;

/** Templates subject to neurologic warning scanning (Part C). */
export const PROVIDER_DISCHARGE_PEDIATRIC_NEUROLOGIC_WARNING_TEMPLATE_IDS = new Set<string>([
  "pediatric_minor_head_injury_v1",
  "pediatric_fever_v1",
  "pediatric_mild_dehydration_v1",
  "pediatric_gastroenteritis_v1",
]);

export const PROVIDER_DISCHARGE_PEDIATRIC_NEUROLOGIC_SEIZURE_EN = ["seizure", "convulsion"] as const;
export const PROVIDER_DISCHARGE_PEDIATRIC_NEUROLOGIC_SEIZURE_FR = ["crise convulsive", "convulsion"] as const;
export const PROVIDER_DISCHARGE_PEDIATRIC_NEUROLOGIC_CONFUSION_LETHARGY_EN = [
  "confusion",
  "lethargic",
  "lethargy",
] as const;
export const PROVIDER_DISCHARGE_PEDIATRIC_NEUROLOGIC_CONFUSION_LETHARGY_FR = [
  "confusion",
  "léthargique",
  "léthargie",
] as const;
export const PROVIDER_DISCHARGE_PEDIATRIC_NEUROLOGIC_BEHAVIOR_EN = [
  "behavior change",
  "unusual behavior",
  "behavior",
] as const;
export const PROVIDER_DISCHARGE_PEDIATRIC_NEUROLOGIC_BEHAVIOR_FR = [
  "comportement inhabituel",
  "changement de comportement",
  "comportement",
] as const;

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

function validatePediatricRiskSemantics(template: ProviderDischargeTemplate): string[] {
  const prefix = `[${template.id}]`;
  const errors: string[] = [];

  if (template.minimumEscalationLevel !== undefined) {
    if (
      template.minimumEscalationLevel !== "routine" &&
      template.minimumEscalationLevel !== "urgent" &&
      template.minimumEscalationLevel !== "emergency"
    ) {
      errors.push(`${prefix} invalid minimumEscalationLevel: ${String(template.minimumEscalationLevel)}`);
    }
  }

  if (
    template.escalationSeverity === "emergency" &&
    template.minimumEscalationLevel === "routine"
  ) {
    errors.push(
      `${prefix} emergency escalation template cannot set minimumEscalationLevel to routine`
    );
  }

  if (template.requiresCaregiverObservationWindow === true) {
    const hours = template.caregiverObservationWindowHours;
    if (hours === undefined || !Number.isFinite(hours) || hours <= 0) {
      errors.push(
        `${prefix} requiresCaregiverObservationWindow requires caregiverObservationWindowHours > 0`
      );
    }
  } else if (template.caregiverObservationWindowHours !== undefined) {
    errors.push(
      `${prefix} caregiverObservationWindowHours requires requiresCaregiverObservationWindow = true`
    );
  }

  if (template.requiredDangerSignCategories !== undefined) {
    for (const category of template.requiredDangerSignCategories) {
      if (!PROVIDER_DISCHARGE_PEDIATRIC_DANGER_SIGN_CATEGORIES.includes(category)) {
        errors.push(`${prefix} invalid requiredDangerSignCategory: ${String(category)}`);
      }
    }
  }

  if (
    template.minimumEscalationLevel &&
    template.escalationSeverity &&
    ESCALATION_LEVEL_RANK[template.minimumEscalationLevel] >
      ESCALATION_LEVEL_RANK[template.escalationSeverity]
  ) {
    errors.push(
      `${prefix} minimumEscalationLevel cannot exceed escalationSeverity`
    );
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
  "do not delay care",
  "return immediately",
  "call 911",
  "emergency care",
] as const;

export const PROVIDER_DISCHARGE_PEDIATRIC_FR_ESCALATION_MARKERS = [
  "consultez immédiatement",
  "n'attendez pas",
  "n’attendez pas",
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

function categoryPresentInBlob(
  blob: string,
  category: ProviderDischargePediatricDangerSignCategory,
  locale: ProviderDischargeTemplateLocale
): boolean {
  const phrases = PROVIDER_DISCHARGE_PEDIATRIC_DANGER_SIGN_PHRASES[category][locale];
  return phrases.some((phrase) => blob.includes(phrase.toLowerCase()));
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
      `${templateId}: pediatric ${locale} body missing urgent escalation language (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargePediatricRequiredDangerSignCategories(
  template: Pick<ProviderDischargeTemplate, "id" | "requiredDangerSignCategories">,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const categories = template.requiredDangerSignCategories;
  if (!categories?.length) return [];

  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const errors: string[] = [];
  for (const category of categories) {
    if (!categoryPresentInBlob(blob, category, locale)) {
      errors.push(
        `${template.id}: pediatric ${locale} body missing required danger-sign category "${category}"`
      );
    }
  }
  return errors;
}

export function scanProviderDischargePediatricDehydrationDangerSigns(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  if (!PROVIDER_DISCHARGE_PEDIATRIC_DEHYDRATION_DANGER_TEMPLATE_IDS.has(templateId)) return [];

  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_PEDIATRIC_DEHYDRATION_DANGER_EN_PHRASES
    : PROVIDER_DISCHARGE_PEDIATRIC_DEHYDRATION_DANGER_FR_PHRASES;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: pediatric ${locale} body missing dehydration danger-sign wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargePediatricNeurologicWarnings(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  if (!PROVIDER_DISCHARGE_PEDIATRIC_NEUROLOGIC_WARNING_TEMPLATE_IDS.has(templateId)) return [];

  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const warnings: string[] = [];

  const seizureMarkers =
    locale === "en" ?
      PROVIDER_DISCHARGE_PEDIATRIC_NEUROLOGIC_SEIZURE_EN
    : PROVIDER_DISCHARGE_PEDIATRIC_NEUROLOGIC_SEIZURE_FR;
  const confusionMarkers =
    locale === "en" ?
      PROVIDER_DISCHARGE_PEDIATRIC_NEUROLOGIC_CONFUSION_LETHARGY_EN
    : PROVIDER_DISCHARGE_PEDIATRIC_NEUROLOGIC_CONFUSION_LETHARGY_FR;
  const behaviorMarkers =
    locale === "en" ?
      PROVIDER_DISCHARGE_PEDIATRIC_NEUROLOGIC_BEHAVIOR_EN
    : PROVIDER_DISCHARGE_PEDIATRIC_NEUROLOGIC_BEHAVIOR_FR;

  if (scanMarkersMissing(blob, seizureMarkers)) {
    warnings.push(
      `${templateId}: pediatric ${locale} neurologic warning — missing seizure return precaution wording`
    );
  }
  if (scanMarkersMissing(blob, confusionMarkers)) {
    warnings.push(
      `${templateId}: pediatric ${locale} neurologic warning — missing confusion/lethargy wording`
    );
  }
  if (scanMarkersMissing(blob, behaviorMarkers)) {
    warnings.push(
      `${templateId}: pediatric ${locale} neurologic warning — missing behavior-change wording`
    );
  }

  return warnings;
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

  const errors: string[] = [
    ...validateProviderDischargeTemplateAgeRange(template),
    ...validatePediatricRiskSemantics(template),
  ];
  const prefix = `[${template.id}]`;

  if (!isPediatricProviderDischargeAgeLabel(template.ageRange?.label)) {
    if (template.id.startsWith("pediatric_")) {
      errors.push(`${prefix} pediatric template must set ageRange.label to pediatric or adolescent`);
    }
    return errors;
  }

  if (!template.escalationSeverity) {
    errors.push(`${prefix} pediatric template missing escalationSeverity`);
  } else if (
    template.escalationSeverity !== "routine" &&
    template.escalationSeverity !== "urgent" &&
    template.escalationSeverity !== "emergency"
  ) {
    errors.push(`${prefix} invalid escalationSeverity: ${String(template.escalationSeverity)}`);
  }

  if (
    template.requiresCaregiverObservationWindow === true &&
    (template.caregiverObservationWindowHours === undefined ||
      template.caregiverObservationWindowHours <= 0)
  ) {
    errors.push(
      `${prefix} requiresCaregiverObservationWindow requires caregiverObservationWindowHours > 0`
    );
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
    errors.push(...scanProviderDischargePediatricRequiredDangerSignCategories(template, locale, body));
    errors.push(...scanProviderDischargePediatricDehydrationDangerSigns(template.id, locale, body));
    errors.push(...scanProviderDischargePediatricUnsafePhrases(template.id, locale, body));
    errors.push(...scanProviderDischargePediatricForbiddenDosing(template.id, locale, body));
  }

  return errors;
}

export function scanProviderDischargePediatricTemplateGovernanceWarnings(
  template: ProviderDischargeTemplate
): string[] {
  if (!isPediatricProviderDischargeTemplateCandidate(template)) return [];
  if (!isPediatricProviderDischargeAgeLabel(template.ageRange?.label)) return [];

  const warnings: string[] = [];
  for (const locale of ["en", "fr"] as const) {
    try {
      const body = getProviderDischargeSuggestedTextBody(template, locale);
      warnings.push(...scanProviderDischargePediatricNeurologicWarnings(template.id, locale, body));
    } catch {
      // Body errors are handled by validateProviderDischargePediatricTemplateGovernance.
    }
  }
  return warnings;
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
