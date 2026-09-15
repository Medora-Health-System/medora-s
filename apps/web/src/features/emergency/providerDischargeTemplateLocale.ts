/**
 * Phase 19Y.4A — locale-separated provider discharge template narrative bodies.
 * No cross-language fallback at apply time.
 */

import {
  applyGoldStandardToSuggestedTextBody,
} from "./providerDischargeTemplateGoldStandard";

export type ProviderDischargeTemplateLocale = string;

export const PROVIDER_DISCHARGE_TEMPLATE_LOCALES = ["en", "fr", "es"] as const;

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
  /**
   * Spanish was added after the original bilingual catalogs. New/updated templates
   * should provide this natively. Legacy templates are projected through the
   * centralized Spanish safety body below so `es` never silently resolves to EN.
   */
  es?: ProviderDischargeTemplateSuggestedTextBody;
};

export type ProviderDischargeTemplateSuggestedTextCarrier = {
  id: string;
  suggestedText: ProviderDischargeTemplateSuggestedText;
};

/** Build locale-separated suggested text. EN/FR remain required for legacy catalog compatibility. */
export function localizedSuggestedText(
  en: ProviderDischargeTemplateSuggestedTextBody,
  fr: ProviderDischargeTemplateSuggestedTextBody,
  es?: ProviderDischargeTemplateSuggestedTextBody
): ProviderDischargeTemplateSuggestedText {
  return { en, fr, ...(es ? { es } : {}) };
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
  return (
    isSuggestedTextBody(o.en) &&
    isSuggestedTextBody(o.fr) &&
    (o.es === undefined || isSuggestedTextBody(o.es))
  );
}

function normalizedDischargeLocale(locale: ProviderDischargeTemplateLocale): "en" | "fr" | "es" {
  const normalized = locale.trim().toLowerCase().split(/[-_]/)[0];
  if (normalized === "fr") return "fr";
  if (normalized === "es") return "es";
  return "en";
}

/**
 * Central Spanish projection for legacy EN/FR-only discharge templates.
 *
 * This deliberately lives in the shared template locale layer (not Clinic UI), so
 * ED and Clinic resolve the same Spanish patient-facing body. High-volume families
 * have specific bodies; legacy remainder receives a conservative Spanish safety
 * body rather than leaking English into an `es` encounter.
 *
 * As catalog templates are revised, pass a native third `es` body to
 * localizedSuggestedText() and it automatically takes precedence over this bridge.
 */
function legacySpanishSuggestedTextBody(
  template: ProviderDischargeTemplateSuggestedTextCarrier
): ProviderDischargeTemplateSuggestedTextBody {
  const id = template.id.toLowerCase();

  if (/(^|_)(uti|cystitis)(_|$)|urinary.*infection|urology_uti/.test(id)) {
    return {
      description:
        "Fue evaluado/a en el servicio de urgencias por síntomas urinarios. Los síntomas pueden persistir brevemente después de una visita de urgencias; se recomienda seguimiento ambulatorio cuando sea clínicamente apropiado.",
      diagnosisInstructions:
        "Beba líquidos según los tolere, salvo que su profesional clínico le haya indicado restringirlos. Tome los antibióticos u otros medicamentos exactamente según lo recetado. Se revisaron las precauciones de retorno ante síntomas que empeoren o sean preocupantes.",
      medicationTreatment:
        "Tome los antibióticos y los medicamentos para los síntomas urinarios únicamente según lo recetado o indicado durante esta visita. No comparta antibióticos ni los suspenda antes de tiempo salvo indicación de su profesional clínico.",
      returnPrecautions:
        "Busque atención médica si presenta fiebre, dolor en el costado o la espalda, vómitos, empeoramiento de los síntomas urinarios, debilidad, confusión, incapacidad para tolerar antibióticos o líquidos, u otros síntomas preocupantes.",
    };
  }

  if (/abdominal|r10/.test(id)) {
    return {
      description:
        "Fue evaluado/a en el servicio de urgencias por dolor abdominal. Algunas causas pueden evolucionar después de la visita; se recomienda seguimiento ambulatorio cuando sea clínicamente apropiado.",
      diagnosisInstructions:
        "Manténgase bien hidratado/a. Consuma una dieta ligera según la tolere, salvo que su profesional clínico le haya indicado lo contrario. Descanse según sea necesario y siga las indicaciones dadas durante esta visita.",
      medicationTreatment:
        "Tome los medicamentos para el dolor o las náuseas únicamente según lo recetado o indicado durante esta visita. No inicie medicamentos nuevos sin orientación de un profesional clínico.",
      returnPrecautions:
        "Busque atención médica si el dolor empeora, aparece fiebre, los vómitos persisten, observa sangre en las heces o el vómito, se desmaya, presenta nueva distensión abdominal, no puede retener líquidos o aparece cualquier otro síntoma preocupante.",
    };
  }

  if (/nausea|vomit|emesis|r11/.test(id)) {
    return {
      description:
        "Fue evaluado/a en el servicio de urgencias por náuseas y/o vómitos. Los síntomas pueden cambiar después de la visita; realice seguimiento según las indicaciones recibidas.",
      diagnosisInstructions:
        "Tome líquidos en pequeñas cantidades y con frecuencia. Avance la dieta gradualmente según la tolere y descanse. Siga las recomendaciones específicas de su profesional clínico.",
      medicationTreatment:
        "Use los medicamentos recetados o recomendados durante esta visita exactamente según las indicaciones. No inicie medicamentos nuevos sin consultar a un profesional clínico.",
      returnPrecautions:
        "Busque atención médica si no puede retener líquidos, presenta signos de deshidratación, dolor intenso, sangre en el vómito, fiebre persistente, desmayo o empeoramiento de los síntomas.",
    };
  }

  return {
    description:
      "Fue evaluado/a en el servicio de urgencias por la condición diagnosticada durante esta visita. Algunas afecciones pueden evolucionar después del alta; realice el seguimiento recomendado cuando sea clínicamente apropiado.",
    diagnosisInstructions:
      "Siga las indicaciones entregadas durante esta visita, descanse según sea necesario y manténgase hidratado/a si no tiene una restricción médica de líquidos. Comuníquese con su profesional clínico si tiene dudas sobre su recuperación.",
    medicationTreatment:
      "Tome únicamente los medicamentos recetados o recomendados durante esta visita y siga exactamente las instrucciones de uso. No inicie medicamentos nuevos sin orientación de un profesional clínico.",
    returnPrecautions:
      "Busque atención médica si los síntomas empeoran, aparecen síntomas nuevos preocupantes o no mejora como se esperaba.",
  };
}

/** Returns locale body only — never silently falls back to another language. */
export function getProviderDischargeSuggestedTextBody(
  template: ProviderDischargeTemplateSuggestedTextCarrier,
  locale: ProviderDischargeTemplateLocale
): ProviderDischargeTemplateSuggestedTextBody {
  if (!isLocalizedSuggestedText(template.suggestedText)) {
    throw new ProviderDischargeTemplateLocaleError(
      `[${template.id}] suggestedText is not locale-separated (en/fr required; es optional during migration)`
    );
  }

  const activeLocale = normalizedDischargeLocale(locale);
  if (activeLocale === "es") {
    const body = template.suggestedText.es ?? legacySpanishSuggestedTextBody(template);
    return applyGoldStandardToSuggestedTextBody(template.id, body, "es");
  }

  const body = template.suggestedText[activeLocale];
  if (!body) {
    throw new ProviderDischargeTemplateLocaleError(`[${template.id}] missing suggestedText.${activeLocale}`);
  }
  return applyGoldStandardToSuggestedTextBody(template.id, body, activeLocale);
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
