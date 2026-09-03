/**
 * MEDUI.D4C.7A — Ambulatory Medical Evaluation French MDM completion
 * and duplicate discharge presentation cleanup.
 *
 * Reuses ProviderDocumentationWorkspace + D4C.7 shared discharge engine.
 * No ClinicMDM / ClinicDischarge forks. Locale ≠ jurisdiction.
 */

import { parseProductUiLanguage, PRODUCT_DEFAULT_UI_LANGUAGE } from "../i18n/productUiLocale.js";

export const CLINIC_CARE_AMBULATORY_MDM_LOCALIZATION_DISCHARGE_CLEANUP_CERTIFICATION_ID =
  "MEDUI.D4C.7A" as const;

/** Forbidden second engines / persistence forks for this certification. */
export const D4C7A_FORBIDDEN_AUTHORITY_NAMES = [
  "ClinicMDM",
  "ClinicMedicalDecisionMaking",
  "ClinicDischarge",
  "ClinicDischargeInstruction",
  "ClinicDischargeSummary",
] as const;

export type D4c7aForbiddenAuthorityName =
  (typeof D4C7A_FORBIDDEN_AUTHORITY_NAMES)[number];

export type D4c7aAuthoredDocumentLocale = "en" | "fr";

export type D4c7aProviderDocumentationEncounterMode =
  | "ED"
  | "OBSERVATION"
  | "AMBULATORY"
  | string;

/**
 * Care-setting presentation filter: hide Justification clinique +
 * Actions immédiates / justification on routine ambulatory Clinic Med Eval.
 * ED / Observation / Hospital keep the enterprise fields.
 */
export function shouldHideAmbulatoryRoutineMedEvalMdmChromeFields(input: {
  encounterMode: D4c7aProviderDocumentationEncounterMode;
}): boolean {
  return String(input.encounterMode).toUpperCase() === "AMBULATORY";
}

/** MDM workspace fields removed from ambulatory presentation (not from enterprise model). */
export const AMBULATORY_HIDDEN_MDM_PRESENTATION_FIELDS = [
  "mdmClinicalRationale",
  "mdmImmediateActionsRationale",
] as const;

export type AmbulatoryHiddenMdmPresentationField =
  (typeof AMBULATORY_HIDDEN_MDM_PRESENTATION_FIELDS)[number];

export function isAmbulatoryHiddenMdmPresentationField(
  field: string
): field is AmbulatoryHiddenMdmPresentationField {
  return (AMBULATORY_HIDDEN_MDM_PRESENTATION_FIELDS as readonly string[]).includes(field);
}

/**
 * Authored-document locale for MDM insert/preview/summary.
 * App locale is the authored-document language context for unsigned Clinic drafts.
 * Jurisdiction (Facility.country) never selects narrative language alone.
 */
export function resolveAuthoredDocumentLocale(input: {
  appLocale?: string | null;
  authoredDocumentLocale?: string | null;
}): D4c7aAuthoredDocumentLocale {
  const authored = parseProductUiLanguage(input.authoredDocumentLocale);
  if (authored) return authored;
  const app = parseProductUiLanguage(input.appLocale);
  if (app) return app;
  return PRODUCT_DEFAULT_UI_LANGUAGE;
}

/** Shared high-value MDM fragment prefix (ED catalog). */
export const MDM_HIGH_VALUE_FRAGMENT_PREFIX =
  "providerDocumentationMdmHighValue." as const;

/** Ambulatory-appropriate high-value MDM fragment prefix (no ED boilerplate). */
export const MDM_HIGH_VALUE_AMBULATORY_FRAGMENT_PREFIX =
  "providerDocumentationMdmHighValueAmbulatory." as const;

export const MDM_HIGH_VALUE_TEMPLATE_SUFFIXES = [
  "standardMdm",
  "patientConcern",
  "ekgNormal",
  "diagnosticStudiesReview",
  "smokingCessation",
  "pmpReviewed",
] as const;

export type MdmHighValueTemplateSuffix =
  (typeof MDM_HIGH_VALUE_TEMPLATE_SUFFIXES)[number];

/**
 * Resolve fragment i18n key for high-value MDM templates by care setting.
 * Ambulatory uses ambulatory catalog; ED/Observation keep enterprise catalog.
 */
export function resolveMdmHighValueFragmentKey(input: {
  fragmentKey: string;
  encounterMode: D4c7aProviderDocumentationEncounterMode;
}): string {
  const key = String(input.fragmentKey ?? "").trim();
  if (!key.startsWith(MDM_HIGH_VALUE_FRAGMENT_PREFIX)) return key;
  if (!shouldHideAmbulatoryRoutineMedEvalMdmChromeFields(input)) return key;
  return `${MDM_HIGH_VALUE_AMBULATORY_FRAGMENT_PREFIX}${key.slice(
    MDM_HIGH_VALUE_FRAGMENT_PREFIX.length
  )}`;
}

/**
 * Remap high-value MDM insert targets when clinical-rationale chrome is hidden.
 * Keeps inserts visible in ambulatory workspace fields.
 */
export function resolveAmbulatoryHighValueMdmTargetField(input: {
  templateId: string;
  defaultField: string;
  encounterMode: D4c7aProviderDocumentationEncounterMode;
}): string {
  if (!shouldHideAmbulatoryRoutineMedEvalMdmChromeFields(input)) {
    return input.defaultField;
  }
  const id = String(input.templateId ?? "").trim();
  if (id === "hv-standard-mdm") return "mdmWorkingAssessment";
  if (id === "hv-diagnostic-studies-review") return "mdmDataReviewed";
  if (isAmbulatoryHiddenMdmPresentationField(input.defaultField)) {
    return "mdmWorkingAssessment";
  }
  return input.defaultField;
}

/** English ED boilerplate markers that must not appear in ambulatory MDM inserts. */
export const AMBULATORY_MDM_FORBIDDEN_ED_WORDING_PATTERNS = [
  /\breturn to the ED\b/i,
  /\breturn to the emergency department\b/i,
  /\bemergency department\b/i,
  /\bemergency care was immediately required\b/i,
  /\binvited to return to the ED\b/i,
] as const;

export function ambulatoryMdmNarrativeContainsEdOnlyWording(
  text: string | null | undefined
): boolean {
  const blob = String(text ?? "");
  if (!blob.trim()) return false;
  return AMBULATORY_MDM_FORBIDDEN_ED_WORDING_PATTERNS.some((re) => re.test(blob));
}

/**
 * Detect unsigned draft still holding English high-value MDM fragments while
 * authored-document locale is French — requires explicit Apply French / Refresh.
 */
export function detectLegacyEnglishMdmInFrenchDraft(input: {
  authoredLocale: D4c7aAuthoredDocumentLocale;
  fieldTexts: readonly string[];
  englishFragments: readonly string[];
  signedOrFinalized?: boolean;
}): {
  needsExplicitFrenchRefresh: boolean;
  matchedEnglishFragments: string[];
} {
  if (input.signedOrFinalized) {
    return { needsExplicitFrenchRefresh: false, matchedEnglishFragments: [] };
  }
  if (input.authoredLocale !== "fr") {
    return { needsExplicitFrenchRefresh: false, matchedEnglishFragments: [] };
  }
  const blob = input.fieldTexts.join("\n\n");
  const matched = input.englishFragments.filter((frag) => {
    const f = String(frag ?? "").trim();
    return f.length > 0 && blob.includes(f);
  });
  return {
    needsExplicitFrenchRefresh: matched.length > 0,
    matchedEnglishFragments: matched,
  };
}

/**
 * Replace known English high-value fragments with French ambulatory equivalents.
 * Preserves free text outside matched fragments. Never mutates signed notes.
 */
export function applyExplicitFrenchMdmFragmentRefresh(input: {
  fieldText: string;
  replacements: ReadonlyArray<{ english: string; french: string }>;
  signedOrFinalized?: boolean;
}): { nextText: string; replacedCount: number } {
  if (input.signedOrFinalized) {
    return { nextText: input.fieldText, replacedCount: 0 };
  }
  let next = input.fieldText;
  let replacedCount = 0;
  for (const { english, french } of input.replacements) {
    const en = String(english ?? "").trim();
    const fr = String(french ?? "").trim();
    if (!en || !fr || en === fr) continue;
    if (!next.includes(en)) continue;
    next = next.split(en).join(fr);
    replacedCount += 1;
  }
  return { nextText: next, replacedCount };
}

/**
 * Omit empty hidden ambulatory MDM fields from persisted documentation blobs
 * so they are not treated as documented chrome.
 */
export function omitEmptyAmbulatoryHiddenMdmFields<T extends Record<string, unknown>>(
  stored: T,
  encounterMode: D4c7aProviderDocumentationEncounterMode
): T {
  if (!shouldHideAmbulatoryRoutineMedEvalMdmChromeFields({ encounterMode })) {
    return stored;
  }
  const next: Record<string, unknown> = { ...stored };
  for (const field of AMBULATORY_HIDDEN_MDM_PRESENTATION_FIELDS) {
    const v = next[field];
    if (typeof v === "string" && !v.trim()) {
      delete next[field];
    }
  }
  return next as T;
}

/** D4C.7 ambulatory discharge remains the single presentation engine. */
export const D4C7A_AUTHORITATIVE_AMBULATORY_DISCHARGE_MOUNT =
  "ProviderDischargeDocumentationSection" as const;

/** Obsolete flat patient-instructions card removed from ambulatory Suivi/sortie. */
export const D4C7A_OBSOLETE_AMBULATORY_DISCHARGE_MOUNT =
  "PatientDischargeInstructionsClosureCard" as const;
