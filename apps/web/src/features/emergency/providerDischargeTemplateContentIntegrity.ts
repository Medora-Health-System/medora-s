/**
 * Phase 19Y.5A — template body content integrity markers (registry governance + card stale detection).
 */

import { getProviderDischargeSuggestedTextBody } from "./providerDischargeTemplateLocale";
import {
  GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
  type ProviderDischargeTemplate,
} from "./providerDischargeTemplateRegistry";
import type { ProviderDischargeDiagnosisCard } from "./providerDischargeDocumentationModel";

export type ProviderDischargeTemplateContentIntegrityRule = {
  /** At least one marker (case-insensitive) must appear in the locale body blob. */
  mustIncludeAny: { en: readonly string[]; fr: readonly string[] };
  /** None of these markers may appear in the locale body blob. */
  forbiddenCrossTemplateMarkers: { en: readonly string[]; fr: readonly string[] };
};

const WOUND_FORBIDDEN_EN = ["wound", "laceration", "dressing"] as const;
const WOUND_FORBIDDEN_FR = ["plaie", "lacération", "pansement"] as const;

const RESPIRATORY_FORBIDDEN_ON_WOUND_EN = ["asthma", "wheezing", "bronchitis"] as const;
const RESPIRATORY_FORBIDDEN_ON_WOUND_FR = ["asthme", "sifflement", "bronchite"] as const;

/** Per-template integrity rules — prevents catalog/registry copy-paste mismatches. */
export const PROVIDER_DISCHARGE_TEMPLATE_CONTENT_INTEGRITY: Record<
  string,
  ProviderDischargeTemplateContentIntegrityRule
> = {
  chest_pain_v1: {
    mustIncludeAny: { en: ["chest pain"], fr: ["douleur thoracique"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  abdominal_pain_v1: {
    mustIncludeAny: { en: ["abdominal pain"], fr: ["douleur abdominale"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  headache_v1: {
    mustIncludeAny: { en: ["headache"], fr: ["céphalées", "cephalées"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  uri_cough_v1: {
    mustIncludeAny: { en: ["cough", "respiratory"], fr: ["toux", "respiratoires"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  uti_v1: {
    mustIncludeAny: { en: ["urinary"], fr: ["urinaires", "urinaire"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  wound_laceration_v1: {
    mustIncludeAny: { en: ["wound", "laceration"], fr: ["plaie", "lacération", "laceration"] },
    forbiddenCrossTemplateMarkers: {
      en: RESPIRATORY_FORBIDDEN_ON_WOUND_EN,
      fr: RESPIRATORY_FORBIDDEN_ON_WOUND_FR,
    },
  },
  nausea_vomiting_v1: {
    mustIncludeAny: { en: ["nausea", "vomiting"], fr: ["nausées", "vomissements"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  gastroenteritis_v1: {
    mustIncludeAny: { en: ["diarrhea", "gastroenteritis"], fr: ["diarrhée", "gastro-entérite"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  back_pain_v1: {
    mustIncludeAny: { en: ["back pain"], fr: ["douleur du dos", "lombaire"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  dental_pain_v1: {
    mustIncludeAny: { en: ["dental", "tooth pain"], fr: ["dentaire"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  otitis_pharyngitis_v1: {
    mustIncludeAny: { en: ["ear pain", "sore throat"], fr: ["otalgie", "mal de gorge"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  hypertension_v1: {
    mustIncludeAny: { en: ["blood pressure", "hypertension"], fr: ["pression artérielle", "hypertension"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  cellulitis_v1: {
    mustIncludeAny: { en: ["cellulitis", "skin infection"], fr: ["cellulite", "infection cutanée"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  dehydration_v1: {
    mustIncludeAny: { en: ["dehydration"], fr: ["déshydratation"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  asthma_exacerbation_v1: {
    mustIncludeAny: { en: ["asthma", "wheezing", "breathing"], fr: ["asthme", "respiratoires"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  copd_exacerbation_v1: {
    mustIncludeAny: { en: ["copd", "breathing"], fr: ["bpco", "respiratoires"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  bronchitis_v1: {
    mustIncludeAny: { en: ["bronchitis", "cough", "breathing"], fr: ["bronchite", "toux"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pneumonia_v1: {
    mustIncludeAny: { en: ["pneumonia", "breathing"], fr: ["pneumonie"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  syncope_v1: {
    mustIncludeAny: { en: ["syncope", "fainting"], fr: ["syncope", "malaise"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  vertigo_dizziness_v1: {
    mustIncludeAny: { en: ["dizziness", "vertigo"], fr: ["vertiges", "étourdissements"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  kidney_stone_v1: {
    mustIncludeAny: { en: ["kidney stone", "flank"], fr: ["calcul rénal", "flanc"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  constipation_v1: {
    mustIncludeAny: { en: ["constipation"], fr: ["constipation"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  allergic_reaction_v1: {
    mustIncludeAny: { en: ["allergic reaction"], fr: ["réaction allergique"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  minor_head_injury_v1: {
    mustIncludeAny: { en: ["head injury", "concussion"], fr: ["traumatisme crânien", "commotion"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  tia_stroke_like_v1: {
    mustIncludeAny: { en: ["tia", "stroke"], fr: ["ait", "vasculaire cérébral"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  seizure_v1: {
    mustIncludeAny: { en: ["seizure"], fr: ["convulsive", "crise"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  palpitations_v1: {
    mustIncludeAny: { en: ["palpitations"], fr: ["palpitations"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  shortness_of_breath_v1: {
    mustIncludeAny: { en: ["shortness of breath", "breathing"], fr: ["essoufflement"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  chest_wall_pain_v1: {
    mustIncludeAny: { en: ["chest wall pain"], fr: ["pariétale thoracique", "parietale thoracique"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  epistaxis_v1: {
    mustIncludeAny: { en: ["epistaxis", "nosebleed"], fr: ["épistaxis", "saignement de nez"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  hypoglycemia_v1: {
    mustIncludeAny: { en: ["hypoglycemia", "low blood sugar"], fr: ["hypoglycémie"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  hyperglycemia_v1: {
    mustIncludeAny: { en: ["hyperglycemia", "high blood sugar"], fr: ["hyperglycémie"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  alcohol_intoxication_v1: {
    mustIncludeAny: { en: ["alcohol intoxication"], fr: ["intoxication alcoolique"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  anxiety_panic_v1: {
    mustIncludeAny: { en: ["anxiety", "panic"], fr: ["anxiété", "angoisse"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_fever_v1: {
    mustIncludeAny: { en: ["fever", "child"], fr: ["fièvre", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_viral_syndrome_v1: {
    mustIncludeAny: { en: ["viral", "child"], fr: ["virale", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_uri_v1: {
    mustIncludeAny: { en: ["respiratory", "child"], fr: ["respiratoires", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_otitis_media_v1: {
    mustIncludeAny: { en: ["ear pain", "otitis"], fr: ["otalgie", "otite"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_gastroenteritis_v1: {
    mustIncludeAny: { en: ["vomiting", "diarrhea"], fr: ["vomissements", "diarrhée"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_mild_dehydration_v1: {
    mustIncludeAny: { en: ["dehydration", "child"], fr: ["déshydratation", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_constipation_v1: {
    mustIncludeAny: { en: ["constipation", "child"], fr: ["constipation", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_asthma_exacerbation_v1: {
    mustIncludeAny: { en: ["asthma", "wheezing", "breathing"], fr: ["asthme", "respiratoires"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_rash_v1: {
    mustIncludeAny: { en: ["rash", "child"], fr: ["éruption", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_minor_head_injury_v1: {
    mustIncludeAny: { en: ["head injury", "child"], fr: ["traumatisme crânien", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_febrile_seizure_v1: {
    mustIncludeAny: { en: ["febrile seizure", "seizure"], fr: ["convulsive fébrile", "crise"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_abdominal_pain_v1: {
    mustIncludeAny: { en: ["abdominal pain", "child"], fr: ["douleur abdominale", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_vomiting_v1: {
    mustIncludeAny: { en: ["vomiting", "child"], fr: ["vomissements", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_dehydration_escalation_v1: {
    mustIncludeAny: { en: ["dehydration", "child"], fr: ["déshydratation", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_rsv_bronchiolitis_v1: {
    mustIncludeAny: { en: ["bronchiolitis", "rsv", "breathing"], fr: ["bronchiolite", "vrs", "respiratoire"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_croup_v1: {
    mustIncludeAny: { en: ["croup", "child"], fr: ["croup", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_allergic_reaction_v1: {
    mustIncludeAny: { en: ["allergic reaction", "child"], fr: ["réaction allergique", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_concussion_v1: {
    mustIncludeAny: { en: ["concussion", "child"], fr: ["commotion", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_wheezing_v1: {
    mustIncludeAny: { en: ["wheezing", "breathing"], fr: ["sifflante", "respiratoires"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
  pediatric_influenza_like_illness_v1: {
    mustIncludeAny: { en: ["influenza", "child"], fr: ["grippal", "enfant"] },
    forbiddenCrossTemplateMarkers: { en: WOUND_FORBIDDEN_EN, fr: WOUND_FORBIDDEN_FR },
  },
};

function suggestedTextBlob(body: {
  description: string;
  diagnosisInstructions: string;
  medicationTreatment: string;
  treatment?: string;
  returnPrecautions?: string;
  returnWorkSchool?: string;
}): string {
  return [
    body.description,
    body.diagnosisInstructions,
    body.medicationTreatment,
    body.treatment ?? "",
    body.returnPrecautions ?? "",
    body.returnWorkSchool ?? "",
  ]
    .join("\n")
    .toLowerCase();
}

function cardFieldsBlob(card: ProviderDischargeDiagnosisCard): string {
  return [card.description, card.diagnosisInstructions, card.medicationTreatment, card.treatment ?? ""]
    .join("\n")
    .toLowerCase();
}

function markersMissing(blob: string, markers: readonly string[]): string[] {
  if (markers.length === 0) return [];
  const hit = markers.some((marker) => blob.includes(marker.toLowerCase()));
  return hit ? [] : [...markers];
}

function forbiddenPresent(blob: string, markers: readonly string[]): string[] {
  return markers.filter((marker) => blob.includes(marker.toLowerCase()));
}

export function validateProviderDischargeTemplateContentIntegrity(
  template: ProviderDischargeTemplate
): string[] {
  if (template.id === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID) return [];

  const rule = PROVIDER_DISCHARGE_TEMPLATE_CONTENT_INTEGRITY[template.id];
  if (!rule) return [];

  const errors: string[] = [];
  for (const locale of ["en", "fr"] as const) {
    let body;
    try {
      body = getProviderDischargeSuggestedTextBody(template, locale);
    } catch (err) {
      errors.push(`[${template.id}] cannot validate content integrity for ${locale}: ${String(err)}`);
      continue;
    }
    const blob = suggestedTextBlob(body);
    const missing = markersMissing(blob, rule.mustIncludeAny[locale]);
    if (missing.length === rule.mustIncludeAny[locale].length) {
      errors.push(
        `[${template.id}] suggestedText.${locale} missing required content markers (expected one of: ${rule.mustIncludeAny[locale].join(", ")})`
      );
    }
    const forbidden = forbiddenPresent(blob, rule.forbiddenCrossTemplateMarkers[locale]);
    if (forbidden.length > 0) {
      errors.push(
        `[${template.id}] suggestedText.${locale} contains forbidden cross-template markers: ${forbidden.join(", ")}`
      );
    }
  }
  return errors;
}

export function cardTextViolatesExpectedTemplateIntegrity(
  card: ProviderDischargeDiagnosisCard,
  expectedTemplateId: string
): boolean {
  const rule = PROVIDER_DISCHARGE_TEMPLATE_CONTENT_INTEGRITY[expectedTemplateId];
  if (!rule) return false;
  const blob = cardFieldsBlob(card);
  const forbiddenEn = forbiddenPresent(blob, rule.forbiddenCrossTemplateMarkers.en);
  const forbiddenFr = forbiddenPresent(blob, rule.forbiddenCrossTemplateMarkers.fr);
  return forbiddenEn.length > 0 || forbiddenFr.length > 0;
}

/** Synthetic negative test — would a foreign template body fail this template's integrity rule? */
export function foreignTemplateBodyFailsIntegrityRule(
  foreignTemplate: ProviderDischargeTemplate,
  targetTemplateId: string
): boolean {
  const rule = PROVIDER_DISCHARGE_TEMPLATE_CONTENT_INTEGRITY[targetTemplateId];
  if (!rule) return false;
  for (const locale of ["en", "fr"] as const) {
    const body = getProviderDischargeSuggestedTextBody(foreignTemplate, locale);
    const blob = suggestedTextBlob(body);
    const missing = markersMissing(blob, rule.mustIncludeAny[locale]);
    if (missing.length === rule.mustIncludeAny[locale].length) return true;
    const forbidden = forbiddenPresent(blob, rule.forbiddenCrossTemplateMarkers[locale]);
    if (forbidden.length > 0) return true;
  }
  return false;
}
