/**
 * Test-only reconstruction of selectable ICD presentation from governed seed maps.
 * Production live UI must use server displayLabel/displayResolution.
 */

import {
  formatIcd10ServerResolvedOneLineDisplay,
  GOVERNED_ICD10_CLINICIAN_LABELS,
  normalizeIcd10CodeForLookup,
  parseProductUiLanguage,
} from "@medora/shared";

export function selectableDxPrimaryFromGovernedMaps(
  input: { code: string; description?: string | null; shortDescription?: string | null },
  locale: string,
): string {
  const parsed = parseProductUiLanguage(locale);
  const english = input.shortDescription?.trim() || input.description?.trim() || "";
  if (parsed === "en") {
    return formatIcd10ServerResolvedOneLineDisplay({
      code: input.code,
      displayLabel: english || input.code,
      displayResolution: english ? "EXACT_SOURCE_LABEL" : "UNLOCALIZED_CODE",
    }).primary;
  }
  if (parsed === "fr" || parsed === "es") {
    const mapped = GOVERNED_ICD10_CLINICIAN_LABELS[parsed][normalizeIcd10CodeForLookup(input.code)];
    return formatIcd10ServerResolvedOneLineDisplay({
      code: input.code,
      displayLabel: mapped ?? input.code,
      displayResolution: mapped ? "EXACT_GOVERNED_LABEL" : "UNLOCALIZED_CODE",
    }).primary;
  }
  return formatIcd10ServerResolvedOneLineDisplay({
    code: input.code,
    displayLabel: input.code,
    displayResolution: "UNLOCALIZED_CODE",
  }).primary;
}
