/**
 * Phase 19Y.15 / 19Y.15A — cardiology & high-risk medical discharge template governance.
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

export type ProviderDischargeTemplateCardioHighRiskSafety = {
  acsSensitive?: boolean;
  peSensitive?: boolean;
  strokeTiaSensitive?: boolean;
  ekgSensitive?: boolean;
  troponinLabSensitive?: boolean;
  anticoagulationSensitive?: boolean;
  syncopeSensitive?: boolean;
  dyspneaSensitive?: boolean;
  requiresCardiologyFollowUp?: boolean;
  requiresEmergencyEscalation?: boolean;
  requiresResultInterpretationCaution?: boolean;
  /** Phase 19Y.15A */
  requiresDrivingRestrictionCaution?: boolean;
  requiresAnticoagulationPrecautions?: boolean;
  requiresFluidStatusPrecautions?: boolean;
  requiresNeurologicEscalation?: boolean;
  requiresChestPainEscalation?: boolean;
};

const CARDIOLOGY_FOLLOW_UP_SPECIALTIES = new Set(["CARDIOLOGY", "PRIMARY_CARE", "EMERGENCY_MEDICINE"]);
const STROKE_TIA_FOLLOW_UP_SPECIALTIES = new Set(["NEUROLOGY", "PRIMARY_CARE", "EMERGENCY_MEDICINE"]);
const PE_DYSPNEA_FOLLOW_UP_SPECIALTIES = new Set([
  "PRIMARY_CARE",
  "PULMONOLOGY",
  "CARDIOLOGY",
  "EMERGENCY_MEDICINE",
]);

export function isCardioHighRiskProviderDischargeTemplateCandidate(
  template: Pick<ProviderDischargeTemplate, "id" | "specialtyCategory" | "riskCategory">
): boolean {
  if (template.id.startsWith("cardio_") || template.id.startsWith("high_risk_medical_")) return true;
  // Legacy *_v1 templates without cardio_/high_risk_medical_ prefix are not forced (Phase 19Y.15).
  return false;
}

export const PROVIDER_DISCHARGE_CARDIO_HIGH_RISK_FORBIDDEN_PHRASES: readonly {
  id: string;
  pattern: RegExp;
}[] = [
  { id: "acs-ruled-out", pattern: /\bacs ruled out\b/i },
  { id: "mi-ruled-out", pattern: /\bmi ruled out\b/i },
  { id: "heart-attack-ruled-out", pattern: /\bheart attack ruled out\b/i },
  { id: "pe-ruled-out", pattern: /\bpe ruled out\b/i },
  { id: "pulmonary-embolism-ruled-out", pattern: /\bpulmonary embolism ruled out\b/i },
  { id: "stroke-ruled-out", pattern: /\bstroke ruled out\b/i },
  { id: "tia-ruled-out", pattern: /\btia ruled out\b/i },
  { id: "ekg-normal", pattern: /\bekg normal\b/i },
  { id: "ecg-normal", pattern: /\becg normal\b/i },
  { id: "troponin-negative", pattern: /\btroponins? negative\b/i },
  { id: "labs-normal", pattern: /\blabs normal\b/i },
  { id: "ct-normal", pattern: /\bct normal\b/i },
  { id: "d-dimer-negative", pattern: /\bd-?dimer negative\b/i },
  { id: "low-cardiac-risk", pattern: /\blow cardiac risk\b/i },
  { id: "low-risk-chest-pain", pattern: /\blow risk chest pain\b/i },
  { id: "medically-cleared", pattern: /\bmedically cleared\b/i },
  { id: "cleared-by-cardiology", pattern: /\bcleared by cardiology\b/i },
  { id: "no-blood-clot", pattern: /\bno blood clot\b/i },
  { id: "no-heart-problem", pattern: /\bno heart problem\b/i },
  { id: "no-neurologic-event", pattern: /\bno neurologic event\b/i },
  { id: "safe-for-discharge", pattern: /\bsafe for discharge\b/i },
];

export const PROVIDER_DISCHARGE_CARDIO_PE_FORBIDDEN_PHRASES: readonly {
  id: string;
  pattern: RegExp;
}[] = [
  { id: "no-blood-clot", pattern: /\bno blood clot\b/i },
  { id: "dvt-ruled-out", pattern: /\bdvt ruled out\b/i },
  { id: "pe-ruled-out", pattern: /\bpe ruled out\b/i },
  { id: "pulmonary-embolism-ruled-out", pattern: /\bpulmonary embolism ruled out\b/i },
];

export const PROVIDER_DISCHARGE_CARDIO_ANTICOAG_FORBIDDEN_PHRASES: readonly {
  id: string;
  pattern: RegExp;
}[] = [
  { id: "anticoagulation-not-needed", pattern: /\banticoagulation not needed\b/i },
  { id: "bleeding-risk-low", pattern: /\bbleeding risk low\b/i },
  { id: "safe-to-stop-blood-thinner", pattern: /\bsafe to stop blood thinner\b/i },
];

export const PROVIDER_DISCHARGE_CARDIO_DRIVING_FORBIDDEN_PHRASES: readonly {
  id: string;
  pattern: RegExp;
}[] = [{ id: "cleared-to-drive", pattern: /\bcleared to drive\b/i }];

export const PROVIDER_DISCHARGE_CARDIO_RESULT_INTERPRETATION_FORBIDDEN_PHRASES: readonly {
  id: string;
  pattern: RegExp;
}[] = [
  { id: "imaging-normal", pattern: /\bimaging normal\b/i },
  { id: "ultrasound-normal", pattern: /\bultrasound normal\b/i },
  { id: "vitals-normal", pattern: /\bvitals normal\b/i },
  { id: "results-normal", pattern: /\bresults normal\b/i },
  { id: "xray-normal", pattern: /\bx-?ray normal\b/i },
  { id: "negative-troponin", pattern: /\bnegative troponin\b/i },
  { id: "normal-ekg", pattern: /\bnormal ekg\b/i },
  { id: "normal-ecg", pattern: /\bnormal ecg\b/i },
  { id: "cleared-on-imaging", pattern: /\bcleared on imaging\b/i },
];

export const PROVIDER_DISCHARGE_CARDIO_EN_ESCALATION_MARKERS = [
  "chest pain",
  "shortness of breath",
  "fainting",
  "severe weakness",
  "new neurologic symptoms",
  "one-sided weakness",
  "trouble speaking",
  "severe headache",
  "palpitations with dizziness",
  "coughing blood",
  "leg swelling",
  "return immediately",
  "call 911",
] as const;

export const PROVIDER_DISCHARGE_CARDIO_FR_ESCALATION_MARKERS = [
  "douleur thoracique",
  "essoufflement",
  "évanouissement",
  "faiblesse importante",
  "nouveaux symptômes neurologiques",
  "faiblesse d'un côté",
  "faiblesse d’un côté",
  "difficulté à parler",
  "mal de tête sévère",
  "palpitations avec étourdissements",
  "cracher du sang",
  "enflure d'une jambe",
  "enflure d’une jambe",
  "retournez immédiatement",
  "appelez le 911",
] as const;

export const PROVIDER_DISCHARGE_CARDIO_EN_CHEST_PAIN_ESCALATION_URGENCY = [
  "return immediately",
  "call 911",
] as const;

export const PROVIDER_DISCHARGE_CARDIO_FR_CHEST_PAIN_ESCALATION_URGENCY = [
  "retournez immédiatement",
  "appelez le 911",
] as const;

export const PROVIDER_DISCHARGE_CARDIO_EN_SYNCOPE_RECURRENCE_MARKERS = [
  "recurrent fainting",
  "fainting again",
  "recurrent syncope",
  "syncope again",
  "faint again",
] as const;

export const PROVIDER_DISCHARGE_CARDIO_EN_SYNCOPE_FALL_RISK_MARKERS = [
  "fall risk",
  "fall-risk",
  "injury from a fall",
  "injury after a fall",
  "head injury from a fall",
] as const;

export const PROVIDER_DISCHARGE_CARDIO_FR_SYNCOPE_RECURRENCE_MARKERS = [
  "évanouissement récurrent",
  "nouvel évanouissement",
  "évanouissement de nouveau",
  "syncope récidivante",
  "syncope de nouveau",
] as const;

export const PROVIDER_DISCHARGE_CARDIO_FR_SYNCOPE_FALL_RISK_MARKERS = [
  "risque de chute",
  "chute",
  "blessure après une chute",
  "blessure liée à une chute",
] as const;

export const PROVIDER_DISCHARGE_CARDIO_EN_FLUID_STATUS_MARKERS = [
  "worsening shortness of breath",
  "swelling",
  "weight gain",
] as const;

export const PROVIDER_DISCHARGE_CARDIO_FR_FLUID_STATUS_MARKERS = [
  "essoufflement",
  "enflure",
  "prise de poids",
] as const;

export const PROVIDER_DISCHARGE_CARDIO_EN_PE_ESCALATION_MARKERS = [
  "shortness of breath",
  "chest pain",
  "coughing blood",
  "one-sided leg swelling",
  "leg swelling",
] as const;

export const PROVIDER_DISCHARGE_CARDIO_FR_PE_ESCALATION_MARKERS = [
  "essoufflement",
  "douleur thoracique",
  "cracher du sang",
  "enflure d'une jambe",
  "enflure d’une jambe",
  "enflure d'une jambe d'un côté",
] as const;

export const PROVIDER_DISCHARGE_CARDIO_EN_NEURO_ESCALATION_MARKERS = [
  "weakness",
  "numbness",
  "trouble speaking",
  "severe headache",
  "confusion",
  "one-sided weakness",
  "one-sided numbness",
  "one-sided symptoms",
] as const;

export const PROVIDER_DISCHARGE_CARDIO_FR_NEURO_ESCALATION_MARKERS = [
  "faiblesse",
  "engourdissement",
  "difficulté à parler",
  "mal de tête sévère",
  "confusion",
  "d'un côté",
  "d’un côté",
  "un côté",
] as const;

export const PROVIDER_DISCHARGE_CARDIO_EN_ANTICOAG_REQUIRED_MARKERS = [
  "follow up",
  "follow-up",
  "as directed",
  "medication",
  "medications",
] as const;

export const PROVIDER_DISCHARGE_CARDIO_FR_ANTICOAG_REQUIRED_MARKERS = [
  "suivi",
  "selon les directives",
  "médicament",
  "médicaments",
] as const;

export const PROVIDER_DISCHARGE_CARDIO_EN_DRIVING_CAUTION_MARKERS = [
  "avoid driving",
  "operating machinery",
  "as directed",
] as const;

export const PROVIDER_DISCHARGE_CARDIO_FR_DRIVING_CAUTION_MARKERS = [
  "éviter de conduire",
  "évitez de conduire",
  "machines",
  "engins",
  "selon les directives",
] as const;

export const PROVIDER_DISCHARGE_CARDIO_LEG_SWELLING_TERMS = [
  "leg swelling",
  "one-sided leg swelling",
  "lower leg swelling",
  "enflure d'une jambe",
  "enflure d’une jambe",
  "jambe enflée",
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

function templateIdIncludesPe(id: string): boolean {
  return id.includes("_pe_") || id.includes("_pe_v") || id.endsWith("_pe") || id.includes("pulmonary_embolism");
}

function bodyHasLegSwellingTerms(body: ProviderDischargeTemplateSuggestedTextBody): boolean {
  return blobIncludesAny(suggestedTextBodyBlob(body), PROVIDER_DISCHARGE_CARDIO_LEG_SWELLING_TERMS);
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
      hits.push(`${templateId}: cardio/high-risk ${category} forbidden phrase (${rule.id}) in ${locale}`);
    }
  }
  return hits;
}

function validateCardioHighRiskSafetyMetadata(template: ProviderDischargeTemplate): string[] {
  const prefix = `[${template.id}]`;
  const errors: string[] = [];
  const safety = template.cardioHighRiskSafety;

  if (!safety || typeof safety !== "object") {
    errors.push(`${prefix} cardio/high-risk template must define cardioHighRiskSafety`);
    return errors;
  }

  if (template.id.includes("acs") && safety.acsSensitive !== true) {
    errors.push(`${prefix} ACS-sensitive template must set acsSensitive: true`);
  }

  if (templateIdIncludesPe(template.id) && safety.peSensitive !== true) {
    errors.push(`${prefix} PE-sensitive template must set peSensitive: true`);
  }

  if (
    (template.id.includes("stroke") || template.id.includes("tia")) &&
    safety.strokeTiaSensitive !== true
  ) {
    errors.push(`${prefix} stroke/TIA-sensitive template must set strokeTiaSensitive: true`);
  }

  if (
    (template.id.includes("ekg") || template.id.includes("ecg")) &&
    safety.ekgSensitive !== true
  ) {
    errors.push(`${prefix} EKG-sensitive template must set ekgSensitive: true`);
  }

  if (
    (template.id.includes("troponin") || template.id.includes("_lab_")) &&
    safety.troponinLabSensitive !== true
  ) {
    errors.push(`${prefix} troponin/lab-sensitive template must set troponinLabSensitive: true`);
  }

  if (template.id.includes("anticoagulation") && safety.anticoagulationSensitive !== true) {
    errors.push(`${prefix} anticoagulation-sensitive template must set anticoagulationSensitive: true`);
  }

  if (template.id.includes("syncope") && safety.syncopeSensitive !== true) {
    errors.push(`${prefix} syncope-sensitive template must set syncopeSensitive: true`);
  }

  if (
    (template.id.includes("dyspnea") || template.id.includes("shortness_of_breath")) &&
    safety.dyspneaSensitive !== true
  ) {
    errors.push(`${prefix} dyspnea-sensitive template must set dyspneaSensitive: true`);
  }

  if (safety.requiresCardiologyFollowUp === true) {
    const rows = template.defaultFollowUps ?? [];
    const hasFollowUp = rows.some((row) => followUpSpecialtyInSet(row, CARDIOLOGY_FOLLOW_UP_SPECIALTIES));
    if (!hasFollowUp) {
      errors.push(
        `${prefix} requiresCardiologyFollowUp but no cardiology/appropriate defaultFollowUps row`
      );
    }
  }

  if (safety.strokeTiaSensitive === true) {
    const rows = template.defaultFollowUps ?? [];
    const hasFollowUp = rows.some((row) => followUpSpecialtyInSet(row, STROKE_TIA_FOLLOW_UP_SPECIALTIES));
    if (!hasFollowUp) {
      errors.push(
        `${prefix} strokeTiaSensitive but no neurology/appropriate defaultFollowUps row`
      );
    }
  }

  if (safety.peSensitive === true || safety.dyspneaSensitive === true) {
    const rows = template.defaultFollowUps ?? [];
    const hasFollowUp = rows.some((row) => followUpSpecialtyInSet(row, PE_DYSPNEA_FOLLOW_UP_SPECIALTIES));
    if (!hasFollowUp) {
      errors.push(
        `${prefix} PE/dyspnea-sensitive template missing pulmonology/cardiology/appropriate follow-up row`
      );
    }
  }

  return errors;
}

export function scanProviderDischargeCardioHighRiskForbiddenPhrases(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  return scanForbiddenPhrases(
    templateId,
    locale,
    suggestedTextBodyBlob(body),
    PROVIDER_DISCHARGE_CARDIO_HIGH_RISK_FORBIDDEN_PHRASES,
    "general"
  );
}

export function scanProviderDischargeCardioPeForbiddenPhrases(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  return scanForbiddenPhrases(
    templateId,
    locale,
    suggestedTextBodyBlob(body),
    PROVIDER_DISCHARGE_CARDIO_PE_FORBIDDEN_PHRASES,
    "PE/DVT"
  );
}

export function scanProviderDischargeCardioAnticoagForbiddenPhrases(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  return scanForbiddenPhrases(
    templateId,
    locale,
    suggestedTextBodyBlob(body),
    PROVIDER_DISCHARGE_CARDIO_ANTICOAG_FORBIDDEN_PHRASES,
    "anticoagulation"
  );
}

export function scanProviderDischargeCardioDrivingForbiddenPhrases(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  return scanForbiddenPhrases(
    templateId,
    locale,
    suggestedTextBodyBlob(body),
    PROVIDER_DISCHARGE_CARDIO_DRIVING_FORBIDDEN_PHRASES,
    "driving"
  );
}

export function scanProviderDischargeCardioResultInterpretationForbiddenPhrases(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  return scanForbiddenPhrases(
    templateId,
    locale,
    suggestedTextBodyBlob(body),
    PROVIDER_DISCHARGE_CARDIO_RESULT_INTERPRETATION_FORBIDDEN_PHRASES,
    "result interpretation"
  );
}

export function scanProviderDischargeCardioHighRiskEscalationLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_CARDIO_EN_ESCALATION_MARKERS
    : PROVIDER_DISCHARGE_CARDIO_FR_ESCALATION_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: cardio/high-risk ${locale} body missing escalation language (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeCardioChestPainEscalationLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  if (locale === "en") {
    if (!blob.includes("chest pain")) {
      return [`${templateId}: cardio/high-risk en body missing chest pain escalation (chest pain)`];
    }
    if (scanMarkersMissing(blob, PROVIDER_DISCHARGE_CARDIO_EN_CHEST_PAIN_ESCALATION_URGENCY)) {
      return [
        `${templateId}: cardio/high-risk en body missing chest pain urgency (return immediately or call 911)`,
      ];
    }
    return [];
  }

  if (!blob.includes("douleur thoracique")) {
    return [`${templateId}: cardio/high-risk fr body missing chest pain escalation (douleur thoracique)`];
  }
  if (scanMarkersMissing(blob, PROVIDER_DISCHARGE_CARDIO_FR_CHEST_PAIN_ESCALATION_URGENCY)) {
    return [
      `${templateId}: cardio/high-risk fr body missing chest pain urgency (retournez immédiatement or appelez le 911)`,
    ];
  }
  return [];
}

export function scanProviderDischargeCardioSyncopePrecautions(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const recurrenceMarkers =
    locale === "en" ?
      PROVIDER_DISCHARGE_CARDIO_EN_SYNCOPE_RECURRENCE_MARKERS
    : PROVIDER_DISCHARGE_CARDIO_FR_SYNCOPE_RECURRENCE_MARKERS;
  const fallRiskMarkers =
    locale === "en" ?
      PROVIDER_DISCHARGE_CARDIO_EN_SYNCOPE_FALL_RISK_MARKERS
    : PROVIDER_DISCHARGE_CARDIO_FR_SYNCOPE_FALL_RISK_MARKERS;

  const errors: string[] = [];
  if (scanMarkersMissing(blob, recurrenceMarkers)) {
    errors.push(
      `${templateId}: cardio/high-risk ${locale} body missing syncope recurrence wording (expected one of: ${recurrenceMarkers.join(", ")})`
    );
  }
  if (scanMarkersMissing(blob, fallRiskMarkers)) {
    errors.push(
      `${templateId}: cardio/high-risk ${locale} body missing syncope fall-risk/injury escalation (expected one of: ${fallRiskMarkers.join(", ")})`
    );
  }
  return errors;
}

export function scanProviderDischargeCardioFluidStatusPrecautions(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_CARDIO_EN_FLUID_STATUS_MARKERS
    : PROVIDER_DISCHARGE_CARDIO_FR_FLUID_STATUS_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: cardio/high-risk ${locale} body missing fluid-status precaution wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeCardioPeEscalationLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_CARDIO_EN_PE_ESCALATION_MARKERS
    : PROVIDER_DISCHARGE_CARDIO_FR_PE_ESCALATION_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: cardio/high-risk ${locale} body missing PE/DVT escalation wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeCardioNeurologicEscalationLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_CARDIO_EN_NEURO_ESCALATION_MARKERS
    : PROVIDER_DISCHARGE_CARDIO_FR_NEURO_ESCALATION_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: cardio/high-risk ${locale} body missing neurologic escalation wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeCardioAnticoagPrecautions(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_CARDIO_EN_ANTICOAG_REQUIRED_MARKERS
    : PROVIDER_DISCHARGE_CARDIO_FR_ANTICOAG_REQUIRED_MARKERS;
  const hasFollowUp = blobIncludesAny(blob, ["follow up", "follow-up", "suivi"]);
  const hasDirected = blob.includes("as directed") || blob.includes("selon les directives");
  const hasMedication = blobIncludesAny(blob, ["medication", "medications", "médicament", "médicaments"]);
  if (!(hasFollowUp && hasDirected) && !(hasMedication && hasDirected)) {
    if (scanMarkersMissing(blob, markers)) {
      return [
        `${templateId}: cardio/high-risk ${locale} body missing anticoagulation follow-up/medication-as-directed wording`,
      ];
    }
  }
  return [];
}

export function scanProviderDischargeCardioDrivingRestrictionCaution(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  if (locale === "en") {
    const hasDriving = blob.includes("avoid driving");
    const hasMachinery = blob.includes("operating machinery");
    const hasDirected = blob.includes("as directed");
    if (!(hasDriving && hasMachinery && hasDirected)) {
      return [
        `${templateId}: cardio/high-risk en body missing driving restriction caution (avoid driving or operating machinery as directed)`,
      ];
    }
    return [];
  }

  const hasDriving = blobIncludesAny(blob, ["éviter de conduire", "évitez de conduire"]);
  const hasMachinery = blobIncludesAny(blob, ["machines", "engins"]);
  const hasDirected = blob.includes("selon les directives");
  if (!(hasDriving && (hasMachinery || hasDirected))) {
    return [
      `${templateId}: cardio/high-risk fr body missing driving restriction caution (éviter de conduire or equivalent)`,
    ];
  }
  return [];
}

export function validateProviderDischargeCardioHighRiskTemplateGovernance(
  template: ProviderDischargeTemplate
): string[] {
  if (!isCardioHighRiskProviderDischargeTemplateCandidate(template)) return [];

  const errors: string[] = [...validateCardioHighRiskSafetyMetadata(template)];
  const prefix = `[${template.id}]`;
  const safety = template.cardioHighRiskSafety;
  if (!safety) return errors;

  for (const locale of ["en", "fr"] as const) {
    let body: ProviderDischargeTemplateSuggestedTextBody;
    try {
      body = getProviderDischargeSuggestedTextBody(template, locale);
    } catch (err) {
      errors.push(`${prefix} cannot validate cardio/high-risk governance for ${locale}: ${String(err)}`);
      continue;
    }

    errors.push(...scanProviderDischargeCardioHighRiskEscalationLanguage(template.id, locale, body));
    errors.push(...scanProviderDischargeCardioHighRiskForbiddenPhrases(template.id, locale, body));

    if (safety.requiresResultInterpretationCaution === true) {
      errors.push(...scanProviderDischargeCardioResultInterpretationForbiddenPhrases(template.id, locale, body));
    }

    if (safety.requiresChestPainEscalation === true) {
      errors.push(...scanProviderDischargeCardioChestPainEscalationLanguage(template.id, locale, body));
    }

    if (safety.syncopeSensitive === true) {
      errors.push(...scanProviderDischargeCardioSyncopePrecautions(template.id, locale, body));
    }

    if (safety.requiresFluidStatusPrecautions === true) {
      errors.push(...scanProviderDischargeCardioFluidStatusPrecautions(template.id, locale, body));
    }

    const peContextActive = safety.peSensitive === true || bodyHasLegSwellingTerms(body);
    if (peContextActive) {
      errors.push(...scanProviderDischargeCardioPeForbiddenPhrases(template.id, locale, body));
      errors.push(...scanProviderDischargeCardioPeEscalationLanguage(template.id, locale, body));
    }

    if (safety.requiresNeurologicEscalation === true) {
      errors.push(...scanProviderDischargeCardioNeurologicEscalationLanguage(template.id, locale, body));
    }

    if (safety.anticoagulationSensitive === true || safety.requiresAnticoagulationPrecautions === true) {
      errors.push(...scanProviderDischargeCardioAnticoagForbiddenPhrases(template.id, locale, body));
      errors.push(...scanProviderDischargeCardioAnticoagPrecautions(template.id, locale, body));
    }

    if (safety.requiresDrivingRestrictionCaution === true) {
      errors.push(...scanProviderDischargeCardioDrivingForbiddenPhrases(template.id, locale, body));
      errors.push(...scanProviderDischargeCardioDrivingRestrictionCaution(template.id, locale, body));
    }
  }

  return errors;
}

export function normalizeCardioHighRiskSafetyForHash(
  safety: ProviderDischargeTemplateCardioHighRiskSafety | undefined
): Record<string, boolean> | null {
  if (!safety) return null;
  const keys = [
    "acsSensitive",
    "peSensitive",
    "strokeTiaSensitive",
    "ekgSensitive",
    "troponinLabSensitive",
    "anticoagulationSensitive",
    "syncopeSensitive",
    "dyspneaSensitive",
    "requiresCardiologyFollowUp",
    "requiresEmergencyEscalation",
    "requiresResultInterpretationCaution",
    "requiresDrivingRestrictionCaution",
    "requiresAnticoagulationPrecautions",
    "requiresFluidStatusPrecautions",
    "requiresNeurologicEscalation",
    "requiresChestPainEscalation",
  ] as const satisfies readonly (keyof ProviderDischargeTemplateCardioHighRiskSafety)[];
  const out: Record<string, boolean> = {};
  for (const key of [...keys].sort()) {
    if (safety[key] === true) out[key] = true;
  }
  return Object.keys(out).length ? out : null;
}
