/** Worklist API enriches each line with catalog-backed localized display labels. */
export function clinicOrderDisplayLabel(item: {
  displayLabelEn?: string | null;
  displayLabelFr?: string | null;
  manualLabel?: string | null;
  catalogLabTest?: { name?: string | null } | null;
  catalogImagingStudy?: { name?: string | null } | null;
}, language: string): string {
  const localized = language === "fr" ? item.displayLabelFr : item.displayLabelEn;
  const label = localized?.trim() || item.displayLabelEn?.trim() || item.displayLabelFr?.trim()
    || item.manualLabel?.trim() || item.catalogLabTest?.name?.trim() || item.catalogImagingStudy?.name?.trim();
  return label || (language === "es" ? "Nombre de prueba no disponible" : language === "fr" ? "Nom de l’examen indisponible" : "Test name unavailable");
}
