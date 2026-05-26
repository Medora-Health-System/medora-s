/**
 * Phase 19Y.23 — neurology / seizure / stroke-risk discharge template governance.
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

export type ProviderDischargeTemplateNeurologySafety = {
  seizureSensitive?: boolean;
  strokeSensitive?: boolean;
  tiaSensitive?: boolean;
  headacheSensitive?: boolean;
  concussionSensitive?: boolean;
  syncopeSensitive?: boolean;
  alteredMentalStatusSensitive?: boolean;
  anticoagulationSensitive?: boolean;
  neurologicDeficitSensitive?: boolean;

  requiresNeurologicEscalation?: boolean;
  requiresDrivingRestrictionPrecautions?: boolean;
  requiresAnticoagulationPrecautions?: boolean;
  requiresHeadInjuryEscalation?: boolean;
  requiresSeizurePrecautions?: boolean;
  requiresStrokeEscalation?: boolean;

  requiresNeurologyFollowUp?: boolean;
  requiresResultInterpretationCaution?: boolean;
};

const NEUROLOGY_FOLLOW_UP_SPECIALTIES = new Set(["PRIMARY_CARE", "NEUROLOGY"]);

/** Pre-governance batch templates that share future family prefixes but remain exempt until batch migration. */
export const NEUROLOGY_GOVERNANCE_LEGACY_EXEMPT_TEMPLATE_IDS = new Set([
  "seizure_v1",
  "tia_stroke_like_v1",
]);

export function isNeurologyProviderDischargeTemplateCandidate(
  template: Pick<ProviderDischargeTemplate, "id">
): boolean {
  if (NEUROLOGY_GOVERNANCE_LEGACY_EXEMPT_TEMPLATE_IDS.has(template.id)) return false;
  return (
    template.id.startsWith("neuro_") ||
    template.id.startsWith("seizure_") ||
    template.id.startsWith("stroke_") ||
    template.id.startsWith("tia_")
  );
}

export const PROVIDER_DISCHARGE_NEUROLOGY_FORBIDDEN_PHRASES: readonly {
  id: string;
  pattern: RegExp;
}[] = [
  { id: "stroke-ruled-out", pattern: /\bstroke ruled out\b/i },
  { id: "tia-ruled-out", pattern: /\btia ruled out\b/i },
  { id: "low-stroke-risk", pattern: /\blow stroke risk\b/i },
  { id: "no-neurologic-emergency", pattern: /\bno neurologic emergency\b/i },
  { id: "no-brain-bleed", pattern: /\bno brain bleed\b/i },
  { id: "bleeding-ruled-out", pattern: /\bbleeding ruled out\b/i },
  { id: "no-intracranial-abnormality", pattern: /\bno intracranial abnormality\b/i },
  { id: "seizure-ruled-out", pattern: /\bseizure ruled out\b/i },
  { id: "no-seizure-activity", pattern: /\bno seizure activity\b/i },
  { id: "seizure-unlikely-recur", pattern: /\bseizure unlikely to recur\b/i },
  { id: "safe-to-drive", pattern: /\bsafe to drive\b/i },
  { id: "cleared-to-drive", pattern: /\bcleared to drive\b/i },
  { id: "concussion-resolved", pattern: /\bconcussion resolved\b/i },
  { id: "no-concussion", pattern: /\bno concussion\b/i },
  { id: "head-ct-normal", pattern: /\bhead ct normal\b/i },
  { id: "mri-normal", pattern: /\bmri normal\b/i },
  { id: "imaging-normal", pattern: /\bimaging normal\b/i },
  { id: "ct-normal", pattern: /\bct normal\b/i },
  { id: "neurologically-intact", pattern: /\bneurologically intact\b/i },
  { id: "symptoms-fully-resolved", pattern: /\bsymptoms fully resolved\b/i },
  { id: "stable-neurologically", pattern: /\bstable neurologically\b/i },
  { id: "medically-cleared", pattern: /\bmedically cleared\b/i },
  { id: "safe-for-discharge", pattern: /\bsafe for discharge\b/i },
  { id: "return-to-sports", pattern: /\breturn to sports\b/i },
  { id: "return-to-driving", pattern: /\breturn to driving\b/i },
  { id: "safe-to-work", pattern: /\bsafe to work\b/i },
  { id: "cleared-for-activity", pattern: /\bcleared for activity\b/i },
  { id: "head-bleed-ruled-out", pattern: /\bhead bleed ruled out\b/i },
  { id: "no-bleeding", pattern: /\bno bleeding\b/i },
];

export const PROVIDER_DISCHARGE_NEUROLOGY_RESULT_INTERPRETATION_FORBIDDEN_PHRASES: readonly {
  id: string;
  pattern: RegExp;
}[] = [
  { id: "ct-reassuring", pattern: /\bct reassuring\b/i },
  { id: "mri-reassuring", pattern: /\bmri reassuring\b/i },
  { id: "eeg-normal", pattern: /\beeg normal\b/i },
  { id: "imaging-negative", pattern: /\bimaging negative\b/i },
  { id: "no-acute-findings", pattern: /\bno acute findings\b/i },
  { id: "no-acute-intracranial-process", pattern: /\bno acute intracranial process\b/i },
  { id: "neurologic-workup-negative", pattern: /\bneurologic workup negative\b/i },
  { id: "stroke-excluded", pattern: /\bstroke excluded\b/i },
  { id: "seizure-excluded", pattern: /\bseizure excluded\b/i },
];

export const PROVIDER_DISCHARGE_NEUROLOGY_DRIVING_FORBIDDEN_PHRASES: readonly {
  id: string;
  pattern: RegExp;
}[] = [
  { id: "safe-to-drive", pattern: /\bsafe to drive\b/i },
  { id: "cleared-to-drive", pattern: /\bcleared to drive\b/i },
];

export const PROVIDER_DISCHARGE_NEUROLOGY_EN_NEUROLOGIC_MARKERS = [
  "worsening weakness",
  "numbness",
  "confusion",
  "trouble speaking",
  "severe headache",
  "return immediately",
] as const;

export const PROVIDER_DISCHARGE_NEUROLOGY_FR_NEUROLOGIC_MARKERS = [
  "faiblesse qui s'aggrave",
  "engourdissement",
  "confusion",
  "difficulté à parler",
  "mal de tête sévère",
  "retournez immédiatement",
] as const;

export const PROVIDER_DISCHARGE_NEUROLOGY_EN_DRIVING_MARKERS = [
  "avoid driving",
  "avoid operating machinery",
  "follow local driving restrictions",
] as const;

export const PROVIDER_DISCHARGE_NEUROLOGY_FR_DRIVING_MARKERS = [
  "évitez de conduire",
  "évitez les machines",
  "respectez les restrictions de conduite",
] as const;

export const PROVIDER_DISCHARGE_NEUROLOGY_EN_ANTICOAGULATION_MARKERS = [
  "blood thinner",
  "bleeding",
  "head injury",
  "seek immediate care",
] as const;

export const PROVIDER_DISCHARGE_NEUROLOGY_FR_ANTICOAGULATION_MARKERS = [
  "anticoagulant",
  "saignement",
  "blessure à la tête",
  "consultez immédiatement",
] as const;

export const PROVIDER_DISCHARGE_NEUROLOGY_EN_HEAD_INJURY_MARKERS = [
  "worsening headache",
  "vomiting",
  "confusion",
  "difficulty waking up",
  "seizures",
] as const;

export const PROVIDER_DISCHARGE_NEUROLOGY_FR_HEAD_INJURY_MARKERS = [
  "aggravation du mal de tête",
  "vomissements",
  "confusion",
  "difficulté à réveiller",
  "convulsions",
] as const;

export const PROVIDER_DISCHARGE_NEUROLOGY_EN_SEIZURE_MARKERS = [
  "seizure recurrence",
  "avoid swimming alone",
  "avoid heights",
  "seek emergency care",
] as const;

export const PROVIDER_DISCHARGE_NEUROLOGY_FR_SEIZURE_MARKERS = [
  "récidive de convulsions",
  "évitez de nager seul",
  "évitez les hauteurs",
  "consultez en urgence",
] as const;

export const PROVIDER_DISCHARGE_NEUROLOGY_EN_STROKE_MARKERS = [
  "facial droop",
  "weakness",
  "numbness",
  "trouble speaking",
  "call 911",
] as const;

export const PROVIDER_DISCHARGE_NEUROLOGY_FR_STROKE_MARKERS = [
  "affaissement du visage",
  "faiblesse",
  "engourdissement",
  "difficulté à parler",
  "appelez le 911",
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
      hits.push(`${templateId}: neurology ${category} forbidden phrase (${rule.id}) in ${locale}`);
    }
  }
  return hits;
}

function idRequiresSensitiveFlag(templateId: string): Array<{
  needle: string;
  flag: keyof ProviderDischargeTemplateNeurologySafety;
  label: string;
}> {
  const id = templateId.toLowerCase();
  const rules: Array<{
    needle: string;
    flag: keyof ProviderDischargeTemplateNeurologySafety;
    label: string;
  }> = [];
  if (id.includes("seizure")) {
    rules.push({ needle: "seizure", flag: "seizureSensitive", label: "seizureSensitive" });
  }
  if (id.includes("stroke")) {
    rules.push({ needle: "stroke", flag: "strokeSensitive", label: "strokeSensitive" });
  }
  if (id.includes("tia")) {
    rules.push({ needle: "tia", flag: "tiaSensitive", label: "tiaSensitive" });
  }
  if (id.includes("headache") || id.includes("migraine")) {
    rules.push({ needle: "headache", flag: "headacheSensitive", label: "headacheSensitive" });
  }
  if (id.includes("concussion") || id.includes("head_injury")) {
    rules.push({ needle: "concussion", flag: "concussionSensitive", label: "concussionSensitive" });
  }
  if (id.includes("syncope")) {
    rules.push({ needle: "syncope", flag: "syncopeSensitive", label: "syncopeSensitive" });
  }
  if (id.includes("altered_mental_status") || id.includes("confusion")) {
    rules.push({
      needle: "altered mental status",
      flag: "alteredMentalStatusSensitive",
      label: "alteredMentalStatusSensitive",
    });
  }
  if (id.includes("anticoag")) {
    rules.push({
      needle: "anticoag",
      flag: "anticoagulationSensitive",
      label: "anticoagulationSensitive",
    });
  }
  if (id.includes("weakness") || id.includes("numbness") || id.includes("neuro")) {
    rules.push({
      needle: "neurologic deficit",
      flag: "neurologicDeficitSensitive",
      label: "neurologicDeficitSensitive",
    });
  }
  return rules;
}

function validateNeurologySafetyMetadata(template: ProviderDischargeTemplate): string[] {
  const prefix = `[${template.id}]`;
  const errors: string[] = [];
  const safety = template.neurologySafety;

  if (!safety || typeof safety !== "object") {
    errors.push(`${prefix} neurology template must define neurologySafety`);
    return errors;
  }

  for (const rule of idRequiresSensitiveFlag(template.id)) {
    if (safety[rule.flag] !== true) {
      errors.push(`${prefix} id contains "${rule.needle}" and must set ${rule.label}: true`);
    }
  }

  if (safety.requiresNeurologyFollowUp === true) {
    const rows = template.defaultFollowUps ?? [];
    const hasFollowUp = rows.some((row) => followUpSpecialtyInSet(row, NEUROLOGY_FOLLOW_UP_SPECIALTIES));
    if (!hasFollowUp) {
      errors.push(`${prefix} requiresNeurologyFollowUp but no neurology or primary care follow-up row`);
    }
  }

  return errors;
}

export function scanProviderDischargeNeurologyForbiddenPhrases(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  return scanForbiddenPhrases(
    templateId,
    locale,
    suggestedTextBodyBlob(body),
    PROVIDER_DISCHARGE_NEUROLOGY_FORBIDDEN_PHRASES,
    "general"
  );
}

export function scanProviderDischargeNeurologyResultInterpretationForbiddenPhrases(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  return scanForbiddenPhrases(
    templateId,
    locale,
    suggestedTextBodyBlob(body),
    PROVIDER_DISCHARGE_NEUROLOGY_RESULT_INTERPRETATION_FORBIDDEN_PHRASES,
    "result interpretation"
  );
}

export function scanProviderDischargeNeurologyDrivingForbiddenPhrases(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  return scanForbiddenPhrases(
    templateId,
    locale,
    suggestedTextBodyBlob(body),
    PROVIDER_DISCHARGE_NEUROLOGY_DRIVING_FORBIDDEN_PHRASES,
    "driving clearance"
  );
}

export function scanProviderDischargeNeurologyNeurologicEscalationLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_NEUROLOGY_EN_NEUROLOGIC_MARKERS
    : PROVIDER_DISCHARGE_NEUROLOGY_FR_NEUROLOGIC_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: neurology ${locale} body missing neurologic escalation wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeNeurologyDrivingRestrictionPrecautionsLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_NEUROLOGY_EN_DRIVING_MARKERS
    : PROVIDER_DISCHARGE_NEUROLOGY_FR_DRIVING_MARKERS;
  const hits: string[] = [];
  if (scanMarkersMissing(blob, markers)) {
    hits.push(
      `${templateId}: neurology ${locale} body missing driving restriction precaution wording (expected one of: ${markers.join(", ")})`
    );
  }
  hits.push(...scanProviderDischargeNeurologyDrivingForbiddenPhrases(templateId, locale, body));
  return hits;
}

export function scanProviderDischargeNeurologyAnticoagulationPrecautionsLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_NEUROLOGY_EN_ANTICOAGULATION_MARKERS
    : PROVIDER_DISCHARGE_NEUROLOGY_FR_ANTICOAGULATION_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: neurology ${locale} body missing anticoagulation precaution wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeNeurologyHeadInjuryEscalationLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_NEUROLOGY_EN_HEAD_INJURY_MARKERS
    : PROVIDER_DISCHARGE_NEUROLOGY_FR_HEAD_INJURY_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: neurology ${locale} body missing head injury escalation wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeNeurologySeizurePrecautionsLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_NEUROLOGY_EN_SEIZURE_MARKERS
    : PROVIDER_DISCHARGE_NEUROLOGY_FR_SEIZURE_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: neurology ${locale} body missing seizure precaution wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeNeurologyStrokeEscalationLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_NEUROLOGY_EN_STROKE_MARKERS
    : PROVIDER_DISCHARGE_NEUROLOGY_FR_STROKE_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: neurology ${locale} body missing stroke escalation wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function validateProviderDischargeNeurologyTemplateGovernance(
  template: ProviderDischargeTemplate
): string[] {
  if (!isNeurologyProviderDischargeTemplateCandidate(template)) return [];

  const errors: string[] = [...validateNeurologySafetyMetadata(template)];
  const prefix = `[${template.id}]`;
  const safety = template.neurologySafety;
  if (!safety) return errors;

  for (const locale of ["en", "fr"] as const) {
    let body: ProviderDischargeTemplateSuggestedTextBody;
    try {
      body = getProviderDischargeSuggestedTextBody(template, locale);
    } catch (err) {
      errors.push(`${prefix} cannot validate neurology governance for ${locale}: ${String(err)}`);
      continue;
    }

    errors.push(...scanProviderDischargeNeurologyForbiddenPhrases(template.id, locale, body));

    if (safety.requiresResultInterpretationCaution === true) {
      errors.push(
        ...scanProviderDischargeNeurologyResultInterpretationForbiddenPhrases(template.id, locale, body)
      );
    }

    if (safety.requiresNeurologicEscalation === true) {
      errors.push(...scanProviderDischargeNeurologyNeurologicEscalationLanguage(template.id, locale, body));
    }

    if (safety.requiresDrivingRestrictionPrecautions === true) {
      errors.push(
        ...scanProviderDischargeNeurologyDrivingRestrictionPrecautionsLanguage(template.id, locale, body)
      );
    }

    if (safety.requiresAnticoagulationPrecautions === true) {
      errors.push(...scanProviderDischargeNeurologyAnticoagulationPrecautionsLanguage(template.id, locale, body));
    }

    if (safety.requiresHeadInjuryEscalation === true) {
      errors.push(...scanProviderDischargeNeurologyHeadInjuryEscalationLanguage(template.id, locale, body));
    }

    if (safety.requiresSeizurePrecautions === true) {
      errors.push(...scanProviderDischargeNeurologySeizurePrecautionsLanguage(template.id, locale, body));
    }

    if (safety.requiresStrokeEscalation === true) {
      errors.push(...scanProviderDischargeNeurologyStrokeEscalationLanguage(template.id, locale, body));
    }
  }

  return errors;
}

export function normalizeNeurologySafetyForHash(
  safety: ProviderDischargeTemplateNeurologySafety | undefined
): Record<string, boolean> | null {
  if (!safety) return null;
  const keys = [
    "seizureSensitive",
    "strokeSensitive",
    "tiaSensitive",
    "headacheSensitive",
    "concussionSensitive",
    "syncopeSensitive",
    "alteredMentalStatusSensitive",
    "anticoagulationSensitive",
    "neurologicDeficitSensitive",
    "requiresNeurologicEscalation",
    "requiresDrivingRestrictionPrecautions",
    "requiresAnticoagulationPrecautions",
    "requiresHeadInjuryEscalation",
    "requiresSeizurePrecautions",
    "requiresStrokeEscalation",
    "requiresNeurologyFollowUp",
    "requiresResultInterpretationCaution",
  ] as const satisfies readonly (keyof ProviderDischargeTemplateNeurologySafety)[];
  const out: Record<string, boolean> = {};
  for (const key of [...keys].sort()) {
    if (safety[key] === true) out[key] = true;
  }
  return Object.keys(out).length ? out : null;
}
