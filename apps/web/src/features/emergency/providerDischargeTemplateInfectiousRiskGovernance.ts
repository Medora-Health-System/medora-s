/**
 * Phase 19Y.17 — infectious disease & sepsis-risk discharge template governance.
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

export type ProviderDischargeTemplateInfectiousRiskSafety = {
  sepsisSensitive?: boolean;
  meningitisSensitive?: boolean;
  pneumoniaSensitive?: boolean;
  dehydrationSensitive?: boolean;
  immunocompromisedSensitive?: boolean;
  pediatricFeverSensitive?: boolean;
  elderlySensitive?: boolean;
  rashSensitive?: boolean;
  giInfectiousSensitive?: boolean;
  respiratoryInfectiousSensitive?: boolean;
  requiresFeverEscalation?: boolean;
  requiresHydrationEscalation?: boolean;
  requiresRespiratoryEscalation?: boolean;
  requiresNeurologicEscalation?: boolean;
  requiresRashEscalation?: boolean;
  requiresReturnIfWorsening?: boolean;
  requiresPrimaryCareFollowUp?: boolean;
  requiresInfectiousDiseaseFollowUp?: boolean;
  requiresResultInterpretationCaution?: boolean;
};

const PRIMARY_CARE_FOLLOW_UP_SPECIALTIES = new Set(["PRIMARY_CARE", "EMERGENCY_MEDICINE"]);
const INFECTIOUS_DISEASE_FOLLOW_UP_SPECIALTIES = new Set(["INFECTIOUS_DISEASE", "PRIMARY_CARE"]);

export function isInfectiousRiskProviderDischargeTemplateCandidate(
  template: Pick<ProviderDischargeTemplate, "id" | "specialtyCategory">
): boolean {
  if (
    template.id.startsWith("infectious_") ||
    template.id.startsWith("sepsis_") ||
    template.id.startsWith("respiratory_infectious_") ||
    template.id.startsWith("gi_infectious_")
  ) {
    return true;
  }
  return template.specialtyCategory?.trim().toLowerCase() === "infectious_disease";
}

export const PROVIDER_DISCHARGE_INFECTIOUS_RISK_FORBIDDEN_PHRASES: readonly {
  id: string;
  pattern: RegExp;
}[] = [
  { id: "sepsis-ruled-out", pattern: /\bsepsis ruled out\b/i },
  { id: "no-sepsis", pattern: /\bno sepsis\b/i },
  { id: "bacteremia-ruled-out", pattern: /\bbacteremia ruled out\b/i },
  { id: "meningitis-ruled-out", pattern: /\bmeningitis ruled out\b/i },
  { id: "pneumonia-ruled-out", pattern: /\bpneumonia ruled out\b/i },
  { id: "cultures-negative", pattern: /\bcultures negative\b/i },
  { id: "blood-cultures-negative", pattern: /\bblood cultures negative\b/i },
  { id: "viral-illness-confirmed", pattern: /\bviral illness confirmed\b/i },
  { id: "bacterial-infection-confirmed", pattern: /\bbacterial infection confirmed\b/i },
  { id: "antibiotics-not-needed", pattern: /\bantibiotics not needed\b/i },
  { id: "infection-resolved", pattern: /\binfection resolved\b/i },
  { id: "safe-from-infection", pattern: /\bsafe from infection\b/i },
  { id: "medically-cleared", pattern: /\bmedically cleared\b/i },
  { id: "dehydration-resolved", pattern: /\bdehydration resolved\b/i },
  { id: "no-serious-infection", pattern: /\bno serious infection\b/i },
  { id: "lungs-clear", pattern: /\blungs clear\b/i },
  { id: "chest-x-ray-normal", pattern: /\bchest x-?ray normal\b/i },
  { id: "urine-culture-negative", pattern: /\burine culture negative\b/i },
  { id: "no-meningitis", pattern: /\bno meningitis\b/i },
  { id: "no-bloodstream-infection", pattern: /\bno bloodstream infection\b/i },
  { id: "you-do-not-have", pattern: /\byou do not have\b/i },
  { id: "definitely-viral", pattern: /\bdefinitely viral\b/i },
  { id: "definitely-bacterial", pattern: /\bdefinitely bacterial\b/i },
];

export const PROVIDER_DISCHARGE_INFECTIOUS_RESULT_INTERPRETATION_FORBIDDEN_PHRASES: readonly {
  id: string;
  pattern: RegExp;
}[] = [
  { id: "labs-normal", pattern: /\blabs normal\b/i },
  { id: "imaging-normal", pattern: /\bimaging normal\b/i },
  { id: "x-ray-normal", pattern: /\bx-?ray normal\b/i },
  { id: "cultures-negative", pattern: /\bcultures negative\b/i },
  { id: "reassuring-labs", pattern: /\breassuring labs\b/i },
  { id: "infection-excluded", pattern: /\binfection excluded\b/i },
  { id: "pneumonia-excluded", pattern: /\bpneumonia excluded\b/i },
  { id: "viral-confirmed", pattern: /\bviral confirmed\b/i },
  { id: "bacterial-confirmed", pattern: /\bbacterial confirmed\b/i },
];

export const PROVIDER_DISCHARGE_INFECTIOUS_EN_FEVER_MARKERS = [
  "fever",
  "worsening fever",
  "shaking chills",
] as const;

export const PROVIDER_DISCHARGE_INFECTIOUS_EN_FEVER_URGENCY_MARKERS = [
  "return immediately",
  "call 911",
] as const;

export const PROVIDER_DISCHARGE_INFECTIOUS_FR_FEVER_MARKERS = [
  "fièvre",
  "aggravation de la fièvre",
  "frissons",
] as const;

export const PROVIDER_DISCHARGE_INFECTIOUS_FR_FEVER_URGENCY_MARKERS = [
  "retournez immédiatement",
  "appelez le 911",
] as const;

export const PROVIDER_DISCHARGE_INFECTIOUS_EN_HYDRATION_MARKERS = [
  "unable to drink",
  "worsening vomiting",
  "worsening diarrhea",
  "dehydration",
  "decreased urination",
  "dizziness",
  "weakness",
] as const;

export const PROVIDER_DISCHARGE_INFECTIOUS_FR_HYDRATION_MARKERS = [
  "incapable de boire",
  "vomissements",
  "diarrhée",
  "déshydratation",
  "diminution des urines",
  "étourdissements",
  "faiblesse",
] as const;

export const PROVIDER_DISCHARGE_INFECTIOUS_EN_RESPIRATORY_MARKERS = [
  "trouble breathing",
  "worsening cough",
  "chest pain",
  "blue lips",
  "return immediately",
] as const;

export const PROVIDER_DISCHARGE_INFECTIOUS_FR_RESPIRATORY_MARKERS = [
  "difficulté à respirer",
  "aggravation de la toux",
  "douleur thoracique",
  "lèvres bleues",
  "retournez immédiatement",
] as const;

export const PROVIDER_DISCHARGE_INFECTIOUS_EN_NEURO_MARKERS = [
  "confusion",
  "severe headache",
  "stiff neck",
  "weakness",
  "seizures",
  "trouble waking up",
] as const;

export const PROVIDER_DISCHARGE_INFECTIOUS_FR_NEURO_MARKERS = [
  "confusion",
  "mal de tête sévère",
  "raideur du cou",
  "faiblesse",
  "convulsions",
  "difficulté à réveiller",
] as const;

export const PROVIDER_DISCHARGE_INFECTIOUS_EN_RASH_MARKERS = [
  "spreading rash",
  "skin peeling",
  "swelling",
  "breathing difficulty",
  "facial swelling",
] as const;

export const PROVIDER_DISCHARGE_INFECTIOUS_FR_RASH_MARKERS = [
  "éruption qui s'aggrave",
  "éruption qui s’aggrave",
  "peau qui pèle",
  "enflure",
  "difficulté à respirer",
  "enflure du visage",
] as const;

export const PROVIDER_DISCHARGE_INFECTIOUS_EN_RETURN_IF_WORSENING_MARKERS = [
  "symptoms may worsen",
  "seek urgent care",
  "return immediately",
] as const;

export const PROVIDER_DISCHARGE_INFECTIOUS_FR_RETURN_IF_WORSENING_MARKERS = [
  "les symptômes peuvent s'aggraver",
  "les symptômes peuvent s’aggraver",
  "consultez en urgence",
  "retournez immédiatement",
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
      hits.push(`${templateId}: infectious-risk ${category} forbidden phrase (${rule.id}) in ${locale}`);
    }
  }
  return hits;
}

function validateInfectiousRiskSafetyMetadata(template: ProviderDischargeTemplate): string[] {
  const prefix = `[${template.id}]`;
  const errors: string[] = [];
  const safety = template.infectiousRiskSafety;

  if (!safety || typeof safety !== "object") {
    errors.push(`${prefix} infectious-risk template must define infectiousRiskSafety`);
    return errors;
  }

  if (template.id.includes("sepsis") && safety.sepsisSensitive !== true) {
    errors.push(`${prefix} sepsis-sensitive template must set sepsisSensitive: true`);
  }

  if (template.id.includes("meningitis") && safety.meningitisSensitive !== true) {
    errors.push(`${prefix} meningitis-sensitive template must set meningitisSensitive: true`);
  }

  if (template.id.includes("pneumonia") && safety.pneumoniaSensitive !== true) {
    errors.push(`${prefix} pneumonia-sensitive template must set pneumoniaSensitive: true`);
  }

  if (template.id.includes("dehydration") && safety.dehydrationSensitive !== true) {
    errors.push(`${prefix} dehydration-sensitive template must set dehydrationSensitive: true`);
  }

  if (template.id.includes("rash") && safety.rashSensitive !== true) {
    errors.push(`${prefix} rash-sensitive template must set rashSensitive: true`);
  }

  if (safety.meningitisSensitive === true && safety.requiresNeurologicEscalation !== true) {
    errors.push(`${prefix} meningitisSensitive template must set requiresNeurologicEscalation: true`);
  }

  if (safety.pneumoniaSensitive === true && safety.requiresRespiratoryEscalation !== true) {
    errors.push(`${prefix} pneumoniaSensitive template must set requiresRespiratoryEscalation: true`);
  }

  if (safety.dehydrationSensitive === true && safety.requiresHydrationEscalation !== true) {
    errors.push(`${prefix} dehydrationSensitive template must set requiresHydrationEscalation: true`);
  }

  if (safety.rashSensitive === true && safety.requiresRashEscalation !== true) {
    errors.push(`${prefix} rashSensitive template must set requiresRashEscalation: true`);
  }

  if (safety.requiresPrimaryCareFollowUp === true) {
    const rows = template.defaultFollowUps ?? [];
    const hasFollowUp = rows.some((row) => followUpSpecialtyInSet(row, PRIMARY_CARE_FOLLOW_UP_SPECIALTIES));
    if (!hasFollowUp) {
      errors.push(`${prefix} requiresPrimaryCareFollowUp but no primary care/appropriate follow-up row`);
    }
  }

  if (safety.requiresInfectiousDiseaseFollowUp === true) {
    const rows = template.defaultFollowUps ?? [];
    const hasFollowUp = rows.some((row) => followUpSpecialtyInSet(row, INFECTIOUS_DISEASE_FOLLOW_UP_SPECIALTIES));
    if (!hasFollowUp) {
      errors.push(`${prefix} requiresInfectiousDiseaseFollowUp but no infectious disease/appropriate follow-up row`);
    }
  }

  return errors;
}

export function scanProviderDischargeInfectiousRiskForbiddenPhrases(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  return scanForbiddenPhrases(
    templateId,
    locale,
    suggestedTextBodyBlob(body),
    PROVIDER_DISCHARGE_INFECTIOUS_RISK_FORBIDDEN_PHRASES,
    "general"
  );
}

export function scanProviderDischargeInfectiousResultInterpretationForbiddenPhrases(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  return scanForbiddenPhrases(
    templateId,
    locale,
    suggestedTextBodyBlob(body),
    PROVIDER_DISCHARGE_INFECTIOUS_RESULT_INTERPRETATION_FORBIDDEN_PHRASES,
    "result interpretation"
  );
}

export function scanProviderDischargeInfectiousFeverEscalationLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  if (locale === "en") {
    if (scanMarkersMissing(blob, PROVIDER_DISCHARGE_INFECTIOUS_EN_FEVER_MARKERS)) {
      return [`${templateId}: infectious-risk en body missing fever escalation wording`];
    }
    if (scanMarkersMissing(blob, PROVIDER_DISCHARGE_INFECTIOUS_EN_FEVER_URGENCY_MARKERS)) {
      return [`${templateId}: infectious-risk en body missing fever urgency (return immediately or call 911)`];
    }
    return [];
  }

  if (scanMarkersMissing(blob, PROVIDER_DISCHARGE_INFECTIOUS_FR_FEVER_MARKERS)) {
    return [`${templateId}: infectious-risk fr body missing fever escalation wording`];
  }
  if (scanMarkersMissing(blob, PROVIDER_DISCHARGE_INFECTIOUS_FR_FEVER_URGENCY_MARKERS)) {
    return [`${templateId}: infectious-risk fr body missing fever urgency (retournez immédiatement or appelez le 911)`];
  }
  return [];
}

export function scanProviderDischargeInfectiousHydrationEscalationLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_INFECTIOUS_EN_HYDRATION_MARKERS
    : PROVIDER_DISCHARGE_INFECTIOUS_FR_HYDRATION_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: infectious-risk ${locale} body missing hydration escalation wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeInfectiousRespiratoryEscalationLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_INFECTIOUS_EN_RESPIRATORY_MARKERS
    : PROVIDER_DISCHARGE_INFECTIOUS_FR_RESPIRATORY_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: infectious-risk ${locale} body missing respiratory escalation wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeInfectiousNeurologicEscalationLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_INFECTIOUS_EN_NEURO_MARKERS
    : PROVIDER_DISCHARGE_INFECTIOUS_FR_NEURO_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: infectious-risk ${locale} body missing neurologic escalation wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeInfectiousRashEscalationLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_INFECTIOUS_EN_RASH_MARKERS
    : PROVIDER_DISCHARGE_INFECTIOUS_FR_RASH_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: infectious-risk ${locale} body missing rash escalation wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeInfectiousReturnIfWorseningLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_INFECTIOUS_EN_RETURN_IF_WORSENING_MARKERS
    : PROVIDER_DISCHARGE_INFECTIOUS_FR_RETURN_IF_WORSENING_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: infectious-risk ${locale} body missing return-if-worsening wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function validateProviderDischargeInfectiousRiskTemplateGovernance(
  template: ProviderDischargeTemplate
): string[] {
  if (!isInfectiousRiskProviderDischargeTemplateCandidate(template)) return [];

  const errors: string[] = [...validateInfectiousRiskSafetyMetadata(template)];
  const prefix = `[${template.id}]`;
  const safety = template.infectiousRiskSafety;
  if (!safety) return errors;

  for (const locale of ["en", "fr"] as const) {
    let body: ProviderDischargeTemplateSuggestedTextBody;
    try {
      body = getProviderDischargeSuggestedTextBody(template, locale);
    } catch (err) {
      errors.push(`${prefix} cannot validate infectious-risk governance for ${locale}: ${String(err)}`);
      continue;
    }

    errors.push(...scanProviderDischargeInfectiousRiskForbiddenPhrases(template.id, locale, body));

    if (safety.requiresResultInterpretationCaution === true) {
      errors.push(...scanProviderDischargeInfectiousResultInterpretationForbiddenPhrases(template.id, locale, body));
    }

    if (safety.requiresFeverEscalation === true) {
      errors.push(...scanProviderDischargeInfectiousFeverEscalationLanguage(template.id, locale, body));
    }

    if (safety.requiresHydrationEscalation === true) {
      errors.push(...scanProviderDischargeInfectiousHydrationEscalationLanguage(template.id, locale, body));
    }

    if (safety.requiresRespiratoryEscalation === true) {
      errors.push(...scanProviderDischargeInfectiousRespiratoryEscalationLanguage(template.id, locale, body));
    }

    if (safety.requiresNeurologicEscalation === true) {
      errors.push(...scanProviderDischargeInfectiousNeurologicEscalationLanguage(template.id, locale, body));
    }

    if (safety.requiresRashEscalation === true) {
      errors.push(...scanProviderDischargeInfectiousRashEscalationLanguage(template.id, locale, body));
    }

    if (safety.requiresReturnIfWorsening === true) {
      errors.push(...scanProviderDischargeInfectiousReturnIfWorseningLanguage(template.id, locale, body));
    }
  }

  return errors;
}

export function normalizeInfectiousRiskSafetyForHash(
  safety: ProviderDischargeTemplateInfectiousRiskSafety | undefined
): Record<string, boolean> | null {
  if (!safety) return null;
  const keys = [
    "sepsisSensitive",
    "meningitisSensitive",
    "pneumoniaSensitive",
    "dehydrationSensitive",
    "immunocompromisedSensitive",
    "pediatricFeverSensitive",
    "elderlySensitive",
    "rashSensitive",
    "giInfectiousSensitive",
    "respiratoryInfectiousSensitive",
    "requiresFeverEscalation",
    "requiresHydrationEscalation",
    "requiresRespiratoryEscalation",
    "requiresNeurologicEscalation",
    "requiresRashEscalation",
    "requiresReturnIfWorsening",
    "requiresPrimaryCareFollowUp",
    "requiresInfectiousDiseaseFollowUp",
    "requiresResultInterpretationCaution",
  ] as const satisfies readonly (keyof ProviderDischargeTemplateInfectiousRiskSafety)[];
  const out: Record<string, boolean> = {};
  for (const key of [...keys].sort()) {
    if (safety[key] === true) out[key] = true;
  }
  return Object.keys(out).length ? out : null;
}
