import {
  isUnlocalizedPublicUiValue,
  publicUiLastResortCopy,
  reportPublicUiLocalizationGap,
  resolveProductUiLanguageOrDefault,
  type ProductUiLanguage,
} from "@/i18n/config";
import enMessages from "@/i18n/messages/en";
import esMessages from "@/i18n/messages/es";
import frMessages from "@/i18n/messages/fr";
import { resolveClinicPresentationOverride } from "@/i18n/messages/clinicPresentationOverrides";
import { resolveDigitalCareNavOverride } from "@/i18n/messages/digitalCareNavOverrides";
import { resolveFacilityConfigurationOverride } from "@/i18n/messages/facilityConfigurationOverrides";
import { resolveRegistrationPacketSpanishOverride } from "@/i18n/messages/registrationPacketSpanishOverrides";

/**
 * Clinical UI message roots keyed by product UI locale, including hidden Spanish.
 * Lookups must use `clinicalUiMessages[language]` — never `en ? en : fr` / `es ? es : en`.
 */
export const clinicalUiMessages: Record<ProductUiLanguage, unknown> = {
  en: enMessages,
  fr: frMessages,
  es: esMessages,
};

export function getClinicalUiMessages(language: string): unknown {
  return clinicalUiMessages[resolveProductUiLanguageOrDefault(language)];
}

export function getMessageByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/**
 * Active-locale-only message resolution.
 * Missing keys return the key path. Never read another language catalog.
 */
export function resolveClinicalUiMessage(language: string, key: string): string {
  const presentationOverride = resolveClinicPresentationOverride(language, key);
  if (presentationOverride !== undefined) return presentationOverride;

  const digitalCareNavOverride = resolveDigitalCareNavOverride(language, key);
  if (digitalCareNavOverride !== undefined) return digitalCareNavOverride;

  const facilityConfigurationOverride = resolveFacilityConfigurationOverride(language, key);
  if (facilityConfigurationOverride !== undefined) return facilityConfigurationOverride;

  const registrationPacketOverride = resolveRegistrationPacketSpanishOverride(language, key);
  if (registrationPacketOverride !== undefined) return registrationPacketOverride;

  // French clinic documentation chrome is resolved in the same active-locale registry.
  // No cross-locale fallback or component-local language branching.
  if (resolveProductUiLanguageOrDefault(language) === "fr") {
    const clinicDocumentationFr: Record<string, string> = {
      "providerDocumentationWorkspace.clinicMedicalDocumentation": "Documentation médicale",
      "providerDocumentationWorkspace.providerSignature": "Signature du professionnel",
      "providerDocumentationWorkspace.providerSavedBy": "Documentation enregistrée par",
    };
    if (Object.prototype.hasOwnProperty.call(clinicDocumentationFr, key)) return clinicDocumentationFr[key]!;
  }
  const v = getMessageByPath(getClinicalUiMessages(language), key);
  if (typeof v !== "string") {
    if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
      reportPublicUiLocalizationGap(language, key);
      return publicUiLastResortCopy(language);
    }
    return key;
  }
  if (isUnlocalizedPublicUiValue(v)) {
    reportPublicUiLocalizationGap(language, key);
    return publicUiLastResortCopy(language);
  }
  return v;
}
