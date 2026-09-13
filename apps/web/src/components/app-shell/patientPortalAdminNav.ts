export const PATIENT_PORTAL_ADMIN_HREF = "/app/admin/patient-portal";

/**
 * Patient Portal administration navigation label.
 *
 * The facility admin page already carries EN/FR/ES copy locally. The shared nav
 * catalogs are intentionally not expanded in this small navigation-only change,
 * so use one stable translated core token to identify the active product locale.
 */
export function patientPortalAdminNavLabel(t: (key: string) => string): string {
  const cancel = t("common.cancel");
  if (cancel === "Annuler") return "Portail patient";
  if (cancel === "Cancelar") return "Portal del paciente";
  return "Patient Portal";
}
