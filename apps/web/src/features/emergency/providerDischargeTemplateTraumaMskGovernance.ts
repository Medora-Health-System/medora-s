/**
 * Phase 19Y.13 — trauma & musculoskeletal discharge template governance.
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

export type ProviderDischargeTemplateTraumaMskSafety = {
  imagingSensitive?: boolean;
  requiresFracturePrecautions?: boolean;
  requiresNeurovascularPrecautions?: boolean;
  requiresCompartmentSyndromePrecautions?: boolean;
  requiresReturnActivityRestrictions?: boolean;
  requiresSplintCastPrecautions?: boolean;
  requiresHeadNeckSpineEscalation?: boolean;
  requiresOrthopedicFollowUp?: boolean;
};

const ORTHOPEDIC_FOLLOW_UP_SPECIALTIES = new Set([
  "ORTHOPEDICS",
  "SPORTS_MEDICINE",
  "TRAUMA_CLINIC",
  "PRIMARY_CARE",
]);

export function isTraumaMskProviderDischargeTemplateCandidate(
  template: Pick<ProviderDischargeTemplate, "id" | "specialtyCategory">
): boolean {
  if (template.id.startsWith("trauma_msk_") || template.id.startsWith("msk_")) return true;
  return false;
}

export const PROVIDER_DISCHARGE_TRAUMA_MSK_FORBIDDEN_PHRASES: readonly { id: string; pattern: RegExp }[] = [
  { id: "fracture-ruled-out", pattern: /\bfracture ruled out\b/i },
  { id: "no-fracture", pattern: /\bno fracture\b/i },
  { id: "x-ray-normal", pattern: /\bx-ray normal\b/i },
  { id: "imaging-normal", pattern: /\bimaging normal\b/i },
  { id: "ct-normal", pattern: /\bct normal\b/i },
  { id: "mri-normal", pattern: /\bmri normal\b/i },
  { id: "neurovascularly-intact", pattern: /\bneurovascularly intact\b/i },
  { id: "compartment-ruled-out", pattern: /\bcompartment syndrome ruled out\b/i },
  { id: "safe-return-sports", pattern: /\bsafe to return to sports\b/i },
  { id: "cleared-for-work", pattern: /\bcleared for work\b/i },
  { id: "cleared-for-activity", pattern: /\bcleared for activity\b/i },
  { id: "cleared-for-sports", pattern: /\bcleared for sports\b/i },
  { id: "no-spinal-injury", pattern: /\bno spinal injury\b/i },
  { id: "cervical-spine-cleared", pattern: /\bcervical spine cleared\b/i },
  { id: "no-internal-injury", pattern: /\bno internal injury\b/i },
  { id: "medically-cleared", pattern: /\bmedically cleared\b/i },
];

export const PROVIDER_DISCHARGE_TRAUMA_MSK_RETURN_ACTIVITY_FORBIDDEN_PHRASES: readonly {
  id: string;
  pattern: RegExp;
}[] = [
  { id: "cleared-to-return", pattern: /\bcleared to return\b/i },
  { id: "resume-all-activities", pattern: /\bmay resume all activities\b/i },
  { id: "unrestricted-activity", pattern: /\bunrestricted activity\b/i },
  { id: "sports-clearance", pattern: /\bsports clearance\b/i },
  { id: "work-clearance", pattern: /\bwork clearance\b/i },
];

export const PROVIDER_DISCHARGE_TRAUMA_MSK_EN_ESCALATION_MARKERS = [
  "worsening pain",
  "numbness",
  "weakness",
  "swelling",
  "discoloration",
  "inability to move",
  "severe headache",
  "vomiting",
  "confusion",
  "difficulty breathing",
  "worsening symptoms",
  "return immediately",
] as const;

export const PROVIDER_DISCHARGE_TRAUMA_MSK_FR_ESCALATION_MARKERS = [
  "aggravation de la douleur",
  "engourdissement",
  "faiblesse",
  "enflure",
  "changement de couleur",
  "incapacité à bouger",
  "mal de tête sévère",
  "vomissements",
  "confusion",
  "difficulté à respirer",
  "aggravation",
  "retournez immédiatement",
] as const;

export const PROVIDER_DISCHARGE_TRAUMA_MSK_EN_SPLINT_CAST_MARKERS = [
  "swelling",
  "numbness",
  "discoloration",
  "color change",
  "worsening pain",
] as const;

export const PROVIDER_DISCHARGE_TRAUMA_MSK_FR_SPLINT_CAST_MARKERS = [
  "enflure",
  "engourdissement",
  "changement de couleur",
  "aggravation de la douleur",
] as const;

export const PROVIDER_DISCHARGE_TRAUMA_MSK_EN_COMPARTMENT_MARKERS = [
  "severe pain",
  "swelling",
  "numbness",
] as const;

export const PROVIDER_DISCHARGE_TRAUMA_MSK_FR_COMPARTMENT_MARKERS = [
  "douleur intense",
  "enflure",
  "engourdissement",
] as const;

export const PROVIDER_DISCHARGE_TRAUMA_MSK_EN_HEAD_NECK_SPINE_MARKERS = [
  "weakness",
  "numbness",
  "confusion",
  "vomiting",
  "severe headache",
  "worsening symptoms",
] as const;

export const PROVIDER_DISCHARGE_TRAUMA_MSK_FR_HEAD_NECK_SPINE_MARKERS = [
  "faiblesse",
  "engourdissement",
  "confusion",
  "vomissements",
  "mal de tête sévère",
  "aggravation",
] as const;

function scanMarkersMissing(blob: string, markers: readonly string[]): boolean {
  return !markers.some((marker) => blob.includes(marker.toLowerCase()));
}

function followUpSpecialtyMatchesOrthopedic(row: ProviderDischargeFollowUpRow): boolean {
  return ORTHOPEDIC_FOLLOW_UP_SPECIALTIES.has(row.specialty.trim().toUpperCase());
}

function validateTraumaMskSafetyMetadata(template: ProviderDischargeTemplate): string[] {
  const prefix = `[${template.id}]`;
  const errors: string[] = [];
  const safety = template.traumaMskSafety;

  if (!safety || typeof safety !== "object") {
    errors.push(`${prefix} trauma/MSK template must define traumaMskSafety`);
    return errors;
  }

  if (template.id.includes("imaging") && safety.imagingSensitive !== true) {
    errors.push(`${prefix} imaging-sensitive template must set imagingSensitive: true`);
  }

  if (template.id.includes("fracture") && safety.requiresFracturePrecautions !== true) {
    errors.push(`${prefix} fracture-sensitive template must set requiresFracturePrecautions: true`);
  }

  if (template.id.includes("neurovascular") && safety.requiresNeurovascularPrecautions !== true) {
    errors.push(
      `${prefix} neurovascular-sensitive template must set requiresNeurovascularPrecautions: true`
    );
  }

  if (template.id.includes("compartment") && safety.requiresCompartmentSyndromePrecautions !== true) {
    errors.push(
      `${prefix} compartment-sensitive template must set requiresCompartmentSyndromePrecautions: true`
    );
  }

  if (
    (template.id.includes("splint") || template.id.includes("cast")) &&
    safety.requiresSplintCastPrecautions !== true
  ) {
    errors.push(`${prefix} splint/cast-sensitive template must set requiresSplintCastPrecautions: true`);
  }

  if (
    (template.id.includes("head") || template.id.includes("neck") || template.id.includes("spine")) &&
    safety.requiresHeadNeckSpineEscalation !== true
  ) {
    errors.push(`${prefix} head/neck/spine template must set requiresHeadNeckSpineEscalation: true`);
  }

  if (safety.requiresOrthopedicFollowUp === true) {
    const rows = template.defaultFollowUps ?? [];
    const hasOrthoFollowUp = rows.some((row) => followUpSpecialtyMatchesOrthopedic(row));
    if (!hasOrthoFollowUp) {
      errors.push(
        `${prefix} requiresOrthopedicFollowUp but no orthopedic follow-up defaultFollowUps row`
      );
    }
  }

  return errors;
}

export function scanProviderDischargeTraumaMskForbiddenPhrases(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body);
  const hits: string[] = [];
  for (const rule of PROVIDER_DISCHARGE_TRAUMA_MSK_FORBIDDEN_PHRASES) {
    if (rule.pattern.test(blob)) {
      hits.push(`${templateId}: trauma/MSK forbidden phrase (${rule.id}) in ${locale}`);
    }
  }
  return hits;
}

export function scanProviderDischargeTraumaMskReturnActivityForbiddenPhrases(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body);
  const hits: string[] = [];
  for (const rule of PROVIDER_DISCHARGE_TRAUMA_MSK_RETURN_ACTIVITY_FORBIDDEN_PHRASES) {
    if (rule.pattern.test(blob)) {
      hits.push(`${templateId}: trauma/MSK return-activity violation (${rule.id}) in ${locale}`);
    }
  }
  return hits;
}

export function scanProviderDischargeTraumaMskEscalationLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_TRAUMA_MSK_EN_ESCALATION_MARKERS
    : PROVIDER_DISCHARGE_TRAUMA_MSK_FR_ESCALATION_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: trauma/MSK ${locale} body missing escalation language (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeTraumaMskSplintCastPrecautions(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_TRAUMA_MSK_EN_SPLINT_CAST_MARKERS
    : PROVIDER_DISCHARGE_TRAUMA_MSK_FR_SPLINT_CAST_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: trauma/MSK ${locale} body missing splint/cast precaution wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeTraumaMskCompartmentPrecautions(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_TRAUMA_MSK_EN_COMPARTMENT_MARKERS
    : PROVIDER_DISCHARGE_TRAUMA_MSK_FR_COMPARTMENT_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: trauma/MSK ${locale} body missing compartment syndrome precaution wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeTraumaMskHeadNeckSpineEscalation(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_TRAUMA_MSK_EN_HEAD_NECK_SPINE_MARKERS
    : PROVIDER_DISCHARGE_TRAUMA_MSK_FR_HEAD_NECK_SPINE_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: trauma/MSK ${locale} body missing head/neck/spine escalation wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function validateProviderDischargeTraumaMskTemplateGovernance(
  template: ProviderDischargeTemplate
): string[] {
  if (!isTraumaMskProviderDischargeTemplateCandidate(template)) return [];

  const errors: string[] = [...validateTraumaMskSafetyMetadata(template)];
  const prefix = `[${template.id}]`;
  const safety = template.traumaMskSafety;
  if (!safety) return errors;

  for (const locale of ["en", "fr"] as const) {
    let body: ProviderDischargeTemplateSuggestedTextBody;
    try {
      body = getProviderDischargeSuggestedTextBody(template, locale);
    } catch (err) {
      errors.push(`${prefix} cannot validate trauma/MSK governance for ${locale}: ${String(err)}`);
      continue;
    }

    errors.push(...scanProviderDischargeTraumaMskEscalationLanguage(template.id, locale, body));
    errors.push(...scanProviderDischargeTraumaMskForbiddenPhrases(template.id, locale, body));

    if (safety.requiresSplintCastPrecautions === true) {
      errors.push(...scanProviderDischargeTraumaMskSplintCastPrecautions(template.id, locale, body));
    }

    if (safety.requiresCompartmentSyndromePrecautions === true) {
      errors.push(...scanProviderDischargeTraumaMskCompartmentPrecautions(template.id, locale, body));
    }

    if (safety.requiresHeadNeckSpineEscalation === true) {
      errors.push(...scanProviderDischargeTraumaMskHeadNeckSpineEscalation(template.id, locale, body));
    }

    if (safety.requiresReturnActivityRestrictions === true) {
      errors.push(
        ...scanProviderDischargeTraumaMskReturnActivityForbiddenPhrases(template.id, locale, body)
      );
    }
  }

  return errors;
}

export function normalizeTraumaMskSafetyForHash(
  safety: ProviderDischargeTemplateTraumaMskSafety | undefined
): Record<string, boolean> | null {
  if (!safety) return null;
  const keys = [
    "imagingSensitive",
    "requiresFracturePrecautions",
    "requiresNeurovascularPrecautions",
    "requiresCompartmentSyndromePrecautions",
    "requiresReturnActivityRestrictions",
    "requiresSplintCastPrecautions",
    "requiresHeadNeckSpineEscalation",
    "requiresOrthopedicFollowUp",
  ] as const satisfies readonly (keyof ProviderDischargeTemplateTraumaMskSafety)[];
  const out: Record<string, boolean> = {};
  for (const key of keys) {
    if (safety[key] === true) out[key] = true;
  }
  return Object.keys(out).length ? out : null;
}
