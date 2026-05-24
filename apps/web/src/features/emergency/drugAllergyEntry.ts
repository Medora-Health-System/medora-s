import type { SupportedLanguage } from "@/i18n/config";
import { formatMedicationOptionForLocale } from "@/lib/localizedMedicationDisplay";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";

export type DrugAllergyReactionCode =
  | "rash"
  | "hives"
  | "anaphylaxis"
  | "shortness_of_breath"
  | "nausea_vomiting"
  | "unknown";

export const DRUG_ALLERGY_REACTION_CODES: readonly DrugAllergyReactionCode[] = [
  "rash",
  "hives",
  "anaphylaxis",
  "shortness_of_breath",
  "nausea_vomiting",
  "unknown",
] as const;

export type SelectedDrugAllergy = {
  catalogId: string;
  displayName: string;
  genericName: string;
  subtitle: string;
};

export function selectedDrugAllergyFromCatalog(
  item: CatalogSearchItem,
  language: SupportedLanguage,
  t: (key: string) => string
): SelectedDrugAllergy {
  const { primary, subtitle } = formatMedicationOptionForLocale(item, language, t);
  const generic = item.metadata?.genericName?.trim() ?? "";
  return {
    catalogId: item.id,
    displayName: primary,
    genericName: generic,
    subtitle,
  };
}

export function formatDrugAllergyLine(
  allergy: SelectedDrugAllergy,
  reactionCodes: DrugAllergyReactionCode[],
  t: (key: string) => string
): string {
  const name =
    allergy.genericName &&
    !allergy.displayName.toLowerCase().includes(allergy.genericName.toLowerCase())
      ? `${allergy.displayName} (${allergy.genericName})`
      : allergy.displayName;

  const reactions =
    reactionCodes.length > 0
      ? reactionCodes.map((code) => t(`erTriage.drugAllergy.reactions.${code}`)).join(", ")
      : t("erTriage.drugAllergy.reactions.unknown");

  return t("erTriage.drugAllergy.lineTemplate")
    .replace("{drug}", name)
    .replace("{reactions}", reactions);
}

/** Remove NKDA chip label / exact NKDA token when documenting drug allergies. */
export function stripNkdaFromAllergyText(text: string, nkdaLabel: string): string {
  const nkda = nkdaLabel.trim();
  if (!text.trim() || !nkda) return text;

  const parts = text
    .split(/[,;\n]/)
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => p.toLowerCase() !== nkda.toLowerCase() && p.toLowerCase() !== "nkda");

  return parts.join(", ");
}

export function appendDrugAllergyLinesIfAbsent(current: string, lines: string[]): string {
  let next = current.trim();
  for (const line of lines) {
    const fragment = line.trim();
    if (!fragment) continue;
    if (next.includes(fragment)) continue;
    next = next ? `${next}\n${fragment}` : fragment;
  }
  return next;
}

/** Drug allergy triage entry is documentation-only — no orders or MAR. */
export const DRUG_ALLERGY_TRIAGE_DOCUMENTATION_ONLY = true as const;
