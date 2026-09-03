import { pickCatalogDisplayLabelForProductUi } from "@medora/shared";

/** Presentation-only medication label. Never substitutes EN↔FR. */
export function medicationCatalogLabelForReport(
  med: { displayNameEn?: string | null; displayNameFr?: string | null; code?: string | null },
  language?: string | null
): string {
  return pickCatalogDisplayLabelForProductUi(language, {
    displayNameEn: med.displayNameEn,
    displayNameFr: med.displayNameFr,
    code: med.code,
  });
}
