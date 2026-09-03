import {
  displayNameEnForDocumentedProcedureType,
  displayNameFrForDocumentedProcedureType,
  medoraCodeForDocumentedProcedureType,
  parseProductUiLanguage,
  pickCatalogDisplayLabelForProductUi,
  UNLOCALIZED_CATALOG_SOURCE,
} from "@medora/shared";

export function documentedProcedureDisplayNameForProductUi(
  procedureType: string,
  language?: string | null
): string {
  const parsed = parseProductUiLanguage(language);
  if (parsed === "fr") return displayNameFrForDocumentedProcedureType(procedureType);
  if (parsed === "en") return displayNameEnForDocumentedProcedureType(procedureType);
  if (language != null && String(language).trim() !== "") {
    return medoraCodeForDocumentedProcedureType(procedureType) || UNLOCALIZED_CATALOG_SOURCE;
  }
  return displayNameEnForDocumentedProcedureType(procedureType);
}

/** Presentation-only catalog label. Never substitutes the other product UI language. */
export function displayNameForCatalog(
  catalog:
    | { displayNameEn: string | null; displayNameFr: string | null; name?: string | null; code?: string | null }
    | null
    | undefined,
  manualLabel: string | null,
  language?: string | null
): string {
  const picked = pickCatalogDisplayLabelForProductUi(language, {
    displayNameEn: catalog?.displayNameEn,
    displayNameFr: catalog?.displayNameFr,
    code: catalog?.code,
  });
  if (picked !== UNLOCALIZED_CATALOG_SOURCE) return picked;
  const manual = manualLabel?.trim();
  if (manual) return manual;
  return UNLOCALIZED_CATALOG_SOURCE;
}
