/**
 * MEDUI.ED.DISCHARGE.DIAGNOSIS_INSTRUCTIONS.2 — gold-standard discharge instruction language.
 * MEDUI.D4C.7 — care-setting-aware return suffixes via typed DischargeInstructionCareSettingContext.
 */

import type { DischargeInstructionCareSettingContext } from "@medora/shared";
import { resolveDischargeVisitFramingPhrases } from "@medora/shared";
import type {
  ProviderDischargeTemplateLocale,
  ProviderDischargeTemplateSuggestedTextBody,
} from "./providerDischargeTemplateLocale";
import { resolveProviderDischargeFollowUpTimingCanonicalKey } from "./providerDischargeFollowUpTimingLocale";

export const ED_DISCHARGE_MEDICATION_SAFETY_EN =
  "Use only medications prescribed or specifically recommended during this visit. Do not start new medications without clinician guidance.";

export const ED_DISCHARGE_MEDICATION_SAFETY_FR =
  "Utilisez uniquement les médicaments prescrits ou recommandés spécifiquement lors de cette visite. N'introduisez pas de nouveaux médicaments sans l'avis d'un clinicien.";

export const ED_DISCHARGE_UNIVERSAL_RETURN_SUFFIX_EN =
  "Return to the emergency department immediately if symptoms worsen, new concerning symptoms develop, or you feel unsafe at home.";

export const ED_DISCHARGE_UNIVERSAL_RETURN_SUFFIX_FR =
  "Retournez aux urgences immédiatement si les symptômes s'aggravent, si de nouveaux signes inquiétants apparaissent ou si vous ne vous sentez pas en sécurité à domicile.";

/** Resolve universal return suffix for the active care setting (typed context — not string-replace). */
export function resolveUniversalReturnSuffixForCareSetting(
  locale: "en" | "fr",
  careSettingContext?: DischargeInstructionCareSettingContext | null
): string {
  if (!careSettingContext || careSettingContext.careSetting === "ED") {
    return locale === "fr" ? ED_DISCHARGE_UNIVERSAL_RETURN_SUFFIX_FR : ED_DISCHARGE_UNIVERSAL_RETURN_SUFFIX_EN;
  }
  return resolveDischargeVisitFramingPhrases({
    ...careSettingContext,
    locale,
  }).returnImmediatelySuffix;
}
export const ED_DISCHARGE_PCP_FOLLOW_UP_PHRASE_EN =
  "Follow up with your primary care provider or the recommended specialist within 1–2 days.";

export const ED_DISCHARGE_PCP_FOLLOW_UP_PHRASE_FR =
  "Suivez avec votre médecin de soins primaires ou le spécialiste recommandé dans un délai de 1 à 2 jours.";

/** Marker substrings used by governance tests — must appear in EN template bodies. */
export const ED_DISCHARGE_GOLD_STANDARD_MARKERS_EN = {
  medicationSafety: "without clinician guidance",
  universalReturnSuffix: "Return to the emergency department immediately if symptoms worsen",
  followUpWindow: "within 1–2 days",
} as const;

export function bodyIncludesGoldStandardMedicationSafety(text: string): boolean {
  const blob = text.toLowerCase();
  return (
    blob.includes("do not start, stop, or change medications without clinician guidance") ||
    blob.includes("do not start new medications without clinician guidance") ||
    blob.includes("only as prescribed or directed") ||
    blob.includes("only as prescribed or specifically recommended")
  );
}

export const GENERIC_ED_DISCHARGE_DIAGNOSIS_PLACEHOLDER = "[diagnosis]";

const GENERIC_DISCHARGE_EMPTY_DIAGNOSIS_LABEL: Record<ProviderDischargeTemplateLocale, string> = {
  en: "your condition",
  fr: "votre état",
};

export function genericDischargeEmptyDiagnosisLabel(locale: ProviderDischargeTemplateLocale): string {
  return GENERIC_DISCHARGE_EMPTY_DIAGNOSIS_LABEL[locale];
}

/** Substitute diagnosis label into generic ED fallback scaffold at apply time. */
export function personalizeGenericDischargeTemplateBody(
  body: ProviderDischargeTemplateSuggestedTextBody,
  diagnosisLabel: string,
  locale: ProviderDischargeTemplateLocale
): ProviderDischargeTemplateSuggestedTextBody {
  const label = diagnosisLabel.trim() || genericDischargeEmptyDiagnosisLabel(locale);
  const replace = (s: string) =>
    s.replace(/\{diagnosis\}/gi, label).replace(/\[diagnosis\]/gi, label);
  return {
    ...body,
    description: replace(body.description),
    diagnosisInstructions: replace(body.diagnosisInstructions),
    medicationTreatment: replace(body.medicationTreatment),
    returnPrecautions: replace(body.returnPrecautions),
    ...(body.returnWorkSchool ? { returnWorkSchool: replace(body.returnWorkSchool) } : {}),
    ...(body.caregiverInstructions ?
      { caregiverInstructions: replace(body.caregiverInstructions) }
    : {}),
  };
}

export function bodyIncludesGoldStandardReturnSuffix(text: string): boolean {
  const blob = text.toLowerCase();
  return (
    blob.includes("return to the emergency department immediately if symptoms worsen") ||
    blob.includes("return immediately") ||
    blob.includes("retournez aux urgences immédiatement")
  );
}

export function followUpTimingUsesOneToTwoDays(timing: string): boolean {
  const canonical =
    resolveProviderDischargeFollowUpTimingCanonicalKey(timing)?.toLowerCase() ?? timing.toLowerCase();
  const t = canonical;
  if (t.includes("1–2 week") || t.includes("1-2 week")) return false;
  if (t.includes("within 1–2 days") || t.includes("within 1-2 days")) return true;
  if (t.includes("within 1–3 days") || t.includes("3–5 days")) return true;
  if (t.includes("as directed") || t.includes("as clinically appropriate") || t.includes("as appropriate")) return true;
  if (t.startsWith("if ") || t.startsWith("for ") || t.includes(" if ")) return true;
  if (t === "as directed") return true;
  return false;
}

function includesUniversalReturnSuffix(text: string, locale: "en" | "fr"): boolean {
  const blob = text.toLowerCase();
  if (locale === "fr") {
    return (
      blob.includes("retournez aux urgences immédiatement si les symptômes s'aggravent") ||
      blob.includes("retournez immédiatement")
    );
  }
  return (
    blob.includes("return to the emergency department immediately if symptoms worsen") ||
    blob.includes("return immediately")
  );
}

/** Append universal return language when template-specific red flags omit it (care-setting aware). */
export function ensureGoldStandardReturnPrecautions(
  text: string,
  locale: "en" | "fr",
  careSettingContext?: DischargeInstructionCareSettingContext | null
): string {
  const trimmed = text.trim();
  const suffix = resolveUniversalReturnSuffixForCareSetting(locale, careSettingContext);
  if (!trimmed) return suffix;
  if (careSettingContext?.careSetting === "ED" || !careSettingContext) {
    if (includesUniversalReturnSuffix(trimmed, locale)) return trimmed;
  } else {
    // Clinic / UC: treat either ED or facility-aware return language as already present.
    if (includesUniversalReturnSuffix(trimmed, locale)) return trimmed;
    const facility = careSettingContext.facilityDisplayName.trim().toLowerCase();
    if (facility && trimmed.toLowerCase().includes(facility) && /immédiatement|immediately/i.test(trimmed)) {
      return trimmed;
    }
  }
  return `${trimmed} ${suffix}`;
}

/** Normalize medication/treatment instructions to gold-standard safety wording when close but not exact. */
export function ensureGoldStandardMedicationTreatment(text: string, locale: "en" | "fr"): string {
  const trimmed = text.trim();
  const safety = locale === "fr" ? ED_DISCHARGE_MEDICATION_SAFETY_FR : ED_DISCHARGE_MEDICATION_SAFETY_EN;
  if (!trimmed) return safety;
  if (bodyIncludesGoldStandardMedicationSafety(trimmed)) return trimmed;
  return `${trimmed} ${safety}`;
}

export function applyGoldStandardToSuggestedTextBody(
  templateId: string,
  body: ProviderDischargeTemplateSuggestedTextBody,
  locale: ProviderDischargeTemplateLocale,
  careSettingContext?: DischargeInstructionCareSettingContext | null
): ProviderDischargeTemplateSuggestedTextBody {
  if (templateId === "generic_ed_discharge_v1") return body;
  return {
    ...body,
    medicationTreatment: ensureGoldStandardMedicationTreatment(body.medicationTreatment, locale),
    returnPrecautions: ensureGoldStandardReturnPrecautions(
      body.returnPrecautions,
      locale,
      careSettingContext
    ),
  };
}
