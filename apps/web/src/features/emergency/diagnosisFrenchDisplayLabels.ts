/**
 * Phase 19Y.16B — French ICD-10 display labels (UI-only; stored/billing labels stay English).
 */

import {
  GOVERNED_ICD10_CLINICIAN_LABELS_ES,
  GOVERNED_ICD10_CLINICIAN_LABELS_FR,
  normalizeIcd10CodeForLookup,
  parseProductUiLanguage,
} from "@medora/shared";
import type { SupportedLanguage } from "@/i18n/config";
import { normalizeDiagnosisSearchText } from "./diagnosisFrenchSearchAliases";

export { normalizeDiagnosisSearchText };

export type LocalizedDiagnosisDisplayInput = {
  code: string;
  shortDescription?: string | null;
  description?: string | null;
};

/** Governed 89-code clinician overlay. Source of truth lives in @medora/shared. */
const FRENCH_ICD10_DISPLAY_LABELS_BY_NORMALIZED_CODE = GOVERNED_ICD10_CLINICIAN_LABELS_FR;
const SPANISH_ICD10_DISPLAY_LABELS_BY_NORMALIZED_CODE = GOVERNED_ICD10_CLINICIAN_LABELS_ES;

export function getSpanishDiagnosisDisplayLabel(code: string, englishLabel: string): string {
  const normalizedCode = normalizeIcd10CodeForLookup(code);
  const mapped = SPANISH_ICD10_DISPLAY_LABELS_BY_NORMALIZED_CODE[normalizedCode];
  if (mapped) return mapped;
  const trimmedCode = code.trim();
  if (trimmedCode) return trimmedCode;
  void englishLabel;
  return "UNLOCALIZED_SOURCE";
}

export function getFrenchDiagnosisDisplayLabel(code: string, englishLabel: string): string {
  const normalizedCode = normalizeIcd10CodeForLookup(code);
  const mapped = FRENCH_ICD10_DISPLAY_LABELS_BY_NORMALIZED_CODE[normalizedCode];
  if (mapped) return mapped;
  const trimmedCode = code.trim();
  if (trimmedCode) return trimmedCode;
  void englishLabel;
  return "UNLOCALIZED_SOURCE";
}

export function getLocalizedDiagnosisDisplayLabel(
  diagnosis: LocalizedDiagnosisDisplayInput,
  locale: SupportedLanguage | string
): string {
  const parsed = parseProductUiLanguage(locale);
  const englishLabel =
    diagnosis.shortDescription?.trim() || diagnosis.description?.trim() || diagnosis.code.trim();
  if (parsed === "en") return englishLabel;
  if (parsed === "fr") return getFrenchDiagnosisDisplayLabel(diagnosis.code, englishLabel);
  if (parsed === "es") return getSpanishDiagnosisDisplayLabel(diagnosis.code, englishLabel);
  return diagnosis.code.trim() || "UNLOCALIZED_SOURCE";
}

export function formatDiagnosisOneLineDisplay(
  diagnosis: LocalizedDiagnosisDisplayInput,
  locale: SupportedLanguage | string
): { primary: string; metadata: string | null; visibleLines: 1 } {
  const primary = getLocalizedDiagnosisDisplayLabel(diagnosis, locale);
  const code = diagnosis.code.trim();
  const metadata =
    code && primary.trim().toLowerCase() !== code.toLowerCase() ? code : null;
  return { primary, metadata, visibleLines: 1 };
}

export function getFrenchIcd10DisplayLabelCatalog(): Readonly<Record<string, string>> {
  return FRENCH_ICD10_DISPLAY_LABELS_BY_NORMALIZED_CODE;
}
