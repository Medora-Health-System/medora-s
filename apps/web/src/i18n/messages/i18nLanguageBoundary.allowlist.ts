/**
 * Phase 19U.1 — documented exceptions for language boundary tests.
 * Keep this list tiny; remove entries as sections are translated (19U.5+).
 */

/** Proper nouns / official titles allowed to contain French diacritics in en.ts */
export const EN_MESSAGE_DIACRITIC_ALLOWLIST_PATHS = new Set<string>([
  "appShell.msppMinistryTitle",
]);

/**
 * en.ts section prefixes still containing French UI copy — translate in 19U.5.
 * Forbidden-token scan skips these until cleaned up.
 */
export const EN_MESSAGE_FRENCH_TOKEN_DEFERRED_PREFIXES = [
  "msppValidationAnalyticsPage.",
  "msppAuditPage.",
  "msppRapportPrint.",
  "diseaseReports.",
  "msppValidationAnalyticsPage",
  "msppAuditPage",
  "msppRapportPrint",
  "diseaseReports",
] as const;

/**
 * FR message keys that exist only because fr.ts spreads legacy `labels.fr` at the root.
 * en.ts uses dedicated namespaces (e.g. worklistDepartments, marTab) instead.
 * Remove when labels.fr spread is retired.
 */
export const FR_LEGACY_LABELS_FR_ONLY_PREFIXES = [
  "encounter.",
  "order.",
  "followUp.",
  "registrationSex.",
  "patientSex.",
  "sexAtBirth.",
  "lab.",
  "radiology.",
  "billing.",
  "admin.",
  "pathway.",
] as const;

/**
 * Source files with hardcoded French UI — fix in 19U.5.
 * Paths relative to apps/web/.
 */
export const HARDCODED_FRENCH_UI_DEFERRED_FILES = new Set<string>([
  "src/components/patient-chart/PatientVaccinationsTab.tsx",
  "src/components/pharmacy/PharmacyInventoryToolbar.tsx",
  "src/components/pharmacy/PharmacyInventoryFilters.tsx",
  "src/components/offline/OfflineRuntime.tsx",
  "src/features/pathways/components/PathwaySessionSummary.tsx",
  "src/features/pathways/components/PathwayMilestoneRow.tsx",
  "src/features/mspp/MsppReportingCharts.tsx",
  "src/features/mspp/MsppHaitiHeatmap.tsx",
  "src/features/mspp/MsppHaitiDepartmentMap.tsx",
  "app/app/mspp/dashboard/page.tsx",
  "app/app/mspp/rapport/page.tsx",
  "app/app/public-health/vaccinations/page.tsx",
  "src/features/emergency/EmergencyNursingReassessmentPanel.tsx",
  "src/lib/uiLabels.ts",
  "app/app/lab-worklist/commande/[orderId]/page.tsx",
  "app/app/pharmacy-worklist/commande/[orderId]/page.tsx",
  "app/app/rad-worklist/commande/[orderId]/page.tsx",
]);

/** Substrings that must not appear in English i18n string values (case-insensitive). */
export const EN_FORBIDDEN_FRENCH_UI_TOKENS = [
  "Chargement",
  "Enregistrer",
  "Annuler",
  "comprimé",
  "orale",
  "intraveineuse",
  "intramusculaire",
  "sous-cutanée",
  "médicament",
  "ordonnance",
  "douleur",
  "aujourd'hui",
  "fréquence",
  "inconnu",
  "non confirmé",
  "Site d'injection",
  "Dévoilement",
] as const;

/** Substrings scanned in component source for hardcoded French UI (19U.5 cleanup). */
export const HARDCODED_FRENCH_UI_SCAN_TOKENS = [
  "Chargement",
  "Enregistrer",
  "Annuler",
  "Hors ligne",
  "Essentiel",
  "Inventaire pharmacie",
  "En pause",
  "En attente",
  "Cas approuvés",
] as const;
