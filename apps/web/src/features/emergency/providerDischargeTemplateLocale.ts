/**
 * Phase 19Y.4A — locale-separated provider discharge template narrative bodies.
 * No cross-language fallback at apply time.
 */

import {
  applyGoldStandardToSuggestedTextBody,
} from "./providerDischargeTemplateGoldStandard";

export type ProviderDischargeTemplateLocale = "en" | "fr";

export const PROVIDER_DISCHARGE_TEMPLATE_LOCALES = ["en", "fr"] as const satisfies readonly ProviderDischargeTemplateLocale[];

export type ProviderDischargeTemplateSuggestedTextBody = {
  description: string;
  diagnosisInstructions: string;
  medicationTreatment: string;
  returnPrecautions: string;
  returnWorkSchool?: string;
  treatment?: string;
  /** Phase 19Y.6A — required for pediatric templates; appended to diagnosisInstructions on apply. */
  caregiverInstructions?: string;
};

export type ProviderDischargeTemplateSuggestedText = {
  en: ProviderDischargeTemplateSuggestedTextBody;
  fr: ProviderDischargeTemplateSuggestedTextBody;
};

export type ProviderDischargeTemplateSuggestedTextCarrier = {
  id: string;
  suggestedText: ProviderDischargeTemplateSuggestedText;
};

/** Build locale-separated suggested text — both locales required. */
export function localizedSuggestedText(
  en: ProviderDischargeTemplateSuggestedTextBody,
  fr: ProviderDischargeTemplateSuggestedTextBody
): ProviderDischargeTemplateSuggestedText {
  return { en, fr };
}

export class ProviderDischargeTemplateLocaleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderDischargeTemplateLocaleError";
  }
}

function isSuggestedTextBody(value: unknown): value is ProviderDischargeTemplateSuggestedTextBody {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.description === "string" &&
    typeof o.diagnosisInstructions === "string" &&
    typeof o.medicationTreatment === "string" &&
    typeof o.returnPrecautions === "string"
  );
}

function isLocalizedSuggestedText(value: unknown): value is ProviderDischargeTemplateSuggestedText {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const o = value as Record<string, unknown>;
  return isSuggestedTextBody(o.en) && isSuggestedTextBody(o.fr);
}

/** Returns locale body only — never falls back to another locale. */
export function getProviderDischargeSuggestedTextBody(
  template: ProviderDischargeTemplateSuggestedTextCarrier,
  locale: ProviderDischargeTemplateLocale
): ProviderDischargeTemplateSuggestedTextBody {
  if (!isLocalizedSuggestedText(template.suggestedText)) {
    throw new ProviderDischargeTemplateLocaleError(
      `[${template.id}] suggestedText is not locale-separated (en/fr required)`
    );
  }
  const body = template.suggestedText[locale];
  if (!body) {
    throw new ProviderDischargeTemplateLocaleError(`[${template.id}] missing suggestedText.${locale}`);
  }
  return applyGoldStandardToSuggestedTextBody(template.id, body, locale);
}

export function suggestedTextBodyBlob(body: ProviderDischargeTemplateSuggestedTextBody): string {
  return [
    body.description,
    body.diagnosisInstructions,
    body.medicationTreatment,
    body.returnPrecautions,
    body.returnWorkSchool ?? "",
    body.treatment ?? "",
    body.caregiverInstructions ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Forbidden French UI/content tokens in EN template narrative bodies (unambiguous French; not English cognates). */
export const PROVIDER_DISCHARGE_FORBIDDEN_FRENCH_TOKENS_IN_EN: readonly string[] = [
  "douleur",
  "fièvre",
  "vomissements",
  "diarrhée",
  "essoufflement",
  "médicaments",
  "ordonnance",
  "retournez",
  "consultez",
  "urgence",
  "médecin",
  "suivi",
  "symptômes",
  "plaie",
  "gonflement",
];

/** Obvious English template phrases forbidden in FR narrative bodies (not abbreviations). */
export const PROVIDER_DISCHARGE_FORBIDDEN_ENGLISH_PHRASES_IN_FR: readonly { id: string; pattern: RegExp }[] = [
  { id: "emergency-department", pattern: /\bemergency department\b/i },
  { id: "return-precautions", pattern: /\breturn precautions\b/i },
  { id: "follow-up-recommended", pattern: /\bfollow-up is recommended\b/i },
  { id: "take-medications", pattern: /\btake medications\b/i },
  { id: "symptoms-may-evolve", pattern: /\bsymptoms may evolve\b/i },
  { id: "chest-pain", pattern: /\bchest pain\b/i },
  { id: "abdominal-pain", pattern: /\babdominal pain\b/i },
  { id: "seek-care", pattern: /\bseek care\b/i },
  { id: "provider", pattern: /\bprovider\b/i },
  { id: "wound-care", pattern: /\bwound care\b/i },
  { id: "urinary-symptoms", pattern: /\burinary symptoms\b/i },
];

export function scanProviderDischargeSuggestedTextFrenchContaminationInEn(
  templateId: string,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const hits: string[] = [];
  for (const token of PROVIDER_DISCHARGE_FORBIDDEN_FRENCH_TOKENS_IN_EN) {
    if (blob.includes(token.toLowerCase())) {
      hits.push(`${templateId}: EN body contains forbidden French token "${token}"`);
    }
  }
  return hits;
}

export function scanProviderDischargeSuggestedTextEnglishContaminationInFr(
  templateId: string,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body);
  const hits: string[] = [];
  for (const rule of PROVIDER_DISCHARGE_FORBIDDEN_ENGLISH_PHRASES_IN_FR) {
    if (rule.pattern.test(blob)) {
      hits.push(`${templateId}: FR body contains forbidden English phrase (${rule.id})`);
    }
  }
  return hits;
}

export function isNonEmptySuggestedTextBody(body: ProviderDischargeTemplateSuggestedTextBody): boolean {
  return Boolean(
    body.description.trim() ||
      body.diagnosisInstructions.trim() ||
      body.medicationTreatment.trim() ||
      body.returnPrecautions.trim() ||
      (body.returnWorkSchool ?? "").trim() ||
      (body.treatment ?? "").trim() ||
      (body.caregiverInstructions ?? "").trim()
  );
}
