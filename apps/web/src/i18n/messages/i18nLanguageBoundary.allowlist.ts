/**
 * Phase 19U.1 / 19U.4 — controlled language boundary exceptions.
 * Every deferral requires: scope, path, exact token (* = entire file), reason, cleanupPhase.
 */

export type LanguageBoundaryCleanupPhase = "19U.5" | "19U.6" | "permanent";

export type LanguageBoundaryAllowlistScope =
  | "hardcodedFrenchSource"
  | "enMessage"
  | "frMessage"
  | "enMessageDiacritic";

export type LanguageBoundaryAllowlistEntry = {
  scope: LanguageBoundaryAllowlistScope;
  /** apps/web/ relative path (source) or dotted i18n key path (messages). */
  path: string;
  /** Exact forbidden token, or "*" for entire-file exemption. */
  token: string;
  reason: string;
  cleanupPhase: LanguageBoundaryCleanupPhase;
};

/** Structured allowlist — single source of truth for all language boundary exceptions. */
export const LANGUAGE_BOUNDARY_ALLOWLIST: readonly LanguageBoundaryAllowlistEntry[] = [
  {
    scope: "enMessageDiacritic",
    path: "appShell.msppMinistryTitle",
    token: "*",
    reason: "Official MSPP ministry proper noun retains French diacritics in EN catalog.",
    cleanupPhase: "permanent",
  },
  {
    scope: "enMessage",
    path: "msppValidationAnalyticsPage",
    token: "*",
    reason: "MSPP analytics EN section still French UI — translate in 19U.5.",
    cleanupPhase: "19U.5",
  },
  {
    scope: "enMessage",
    path: "msppAuditPage",
    token: "*",
    reason: "MSPP audit EN section still French UI — translate in 19U.5.",
    cleanupPhase: "19U.5",
  },
  {
    scope: "enMessage",
    path: "msppRapportPrint",
    token: "*",
    reason: "MSPP print report EN section still French UI — translate in 19U.5.",
    cleanupPhase: "19U.5",
  },
  {
    scope: "enMessage",
    path: "diseaseReports",
    token: "*",
    reason: "Disease reports EN section still French UI — translate in 19U.5.",
    cleanupPhase: "19U.5",
  },
  {
    scope: "hardcodedFrenchSource",
    path: "src/components/patient-chart/PatientVaccinationsTab.tsx",
    token: "Chargement",
    reason: "Patient chart vaccinations tab needs i18n pass.",
    cleanupPhase: "19U.5",
  },
  {
    scope: "hardcodedFrenchSource",
    path: "src/components/patient-chart/PatientVaccinationsTab.tsx",
    token: "Enregistrer",
    reason: "Patient chart vaccinations tab needs i18n pass.",
    cleanupPhase: "19U.5",
  },
  {
    scope: "hardcodedFrenchSource",
    path: "src/features/pathways/components/PathwaySessionSummary.tsx",
    token: "En attente",
    reason: "Pathway session summary status chips need i18n.",
    cleanupPhase: "19U.5",
  },
  {
    scope: "hardcodedFrenchSource",
    path: "src/features/pathways/components/PathwaySessionSummary.tsx",
    token: "En pause",
    reason: "Pathway session summary status chips need i18n.",
    cleanupPhase: "19U.5",
  },
  {
    scope: "hardcodedFrenchSource",
    path: "src/features/pathways/components/PathwayMilestoneRow.tsx",
    token: "En attente",
    reason: "Pathway milestone row status label needs i18n.",
    cleanupPhase: "19U.5",
  },
  {
    scope: "hardcodedFrenchSource",
    path: "src/features/mspp/MsppReportingCharts.tsx",
    token: "Cas approuvés",
    reason: "MSPP chart series labels need i18n.",
    cleanupPhase: "19U.5",
  },
  {
    scope: "hardcodedFrenchSource",
    path: "src/features/mspp/MsppHaitiHeatmap.tsx",
    token: "Chargement",
    reason: "MSPP heatmap loading copy needs i18n.",
    cleanupPhase: "19U.5",
  },
  {
    scope: "hardcodedFrenchSource",
    path: "src/features/mspp/MsppHaitiHeatmap.tsx",
    token: "Cas approuvés",
    reason: "MSPP heatmap tooltip copy needs i18n.",
    cleanupPhase: "19U.5",
  },
  {
    scope: "hardcodedFrenchSource",
    path: "src/features/mspp/MsppHaitiDepartmentMap.tsx",
    token: "Chargement",
    reason: "MSPP department map loading copy needs i18n.",
    cleanupPhase: "19U.5",
  },
  {
    scope: "hardcodedFrenchSource",
    path: "src/features/mspp/MsppHaitiDepartmentMap.tsx",
    token: "Cas approuvés",
    reason: "MSPP department map tooltip copy needs i18n.",
    cleanupPhase: "19U.5",
  },
  {
    scope: "hardcodedFrenchSource",
    path: "app/app/mspp/dashboard/page.tsx",
    token: "Chargement",
    reason: "MSPP dashboard page loading states need i18n.",
    cleanupPhase: "19U.5",
  },
  {
    scope: "hardcodedFrenchSource",
    path: "app/app/mspp/dashboard/page.tsx",
    token: "Cas approuvés",
    reason: "MSPP dashboard section headings need i18n.",
    cleanupPhase: "19U.5",
  },
  {
    scope: "hardcodedFrenchSource",
    path: "app/app/mspp/rapport/page.tsx",
    token: "Chargement",
    reason: "MSPP rapport page loading states need i18n.",
    cleanupPhase: "19U.5",
  },
  {
    scope: "hardcodedFrenchSource",
    path: "app/app/mspp/rapport/page.tsx",
    token: "Cas approuvés",
    reason: "MSPP rapport table headers need i18n.",
    cleanupPhase: "19U.5",
  },
  {
    scope: "hardcodedFrenchSource",
    path: "app/app/public-health/vaccinations/page.tsx",
    token: "Chargement",
    reason: "Public health vaccinations page needs i18n pass.",
    cleanupPhase: "19U.5",
  },
  {
    scope: "hardcodedFrenchSource",
    path: "app/app/public-health/vaccinations/page.tsx",
    token: "Enregistrer",
    reason: "Public health vaccinations page needs i18n pass.",
    cleanupPhase: "19U.5",
  },
  {
    scope: "hardcodedFrenchSource",
    path: "app/app/public-health/vaccinations/page.tsx",
    token: "Rechercher",
    reason: "Public health vaccinations patient search needs i18n pass.",
    cleanupPhase: "19U.5",
  },
  {
    scope: "hardcodedFrenchSource",
    path: "src/features/emergency/EmergencyNursingReassessmentPanel.tsx",
    token: "*",
    reason: "Large nursing reassessment panel — phased i18n in 19U.5; comment-only token hits skipped by scanner.",
    cleanupPhase: "19U.5",
  },
  {
    scope: "hardcodedFrenchSource",
    path: "src/components/pharmacy/ReceiveStockModal.tsx",
    token: "*",
    reason: "Catalog form/route display normalization deferred — 19U.5 pharmacy pass.",
    cleanupPhase: "19U.5",
  },
];

/** Proper nouns / official titles allowed to contain French diacritics in en.ts */
export const EN_MESSAGE_DIACRITIC_ALLOWLIST_PATHS = new Set<string>(
  LANGUAGE_BOUNDARY_ALLOWLIST.filter((e) => e.scope === "enMessageDiacritic").map((e) => e.path)
);

/**
 * en.ts section prefixes still containing French UI copy — translate in 19U.5.
 */
export const EN_MESSAGE_FRENCH_TOKEN_DEFERRED_PREFIXES = LANGUAGE_BOUNDARY_ALLOWLIST.filter(
  (e) => e.scope === "enMessage" && e.token === "*"
).map((e) => e.path);

/**
 * FR message keys that exist only because fr.ts spreads legacy `labels.fr` at the root.
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

/** @deprecated Use LANGUAGE_BOUNDARY_ALLOWLIST entries — kept for migration references. */
export const HARDCODED_FRENCH_UI_DEFERRED_FILES = new Set<string>(
  LANGUAGE_BOUNDARY_ALLOWLIST.filter((e) => e.scope === "hardcodedFrenchSource" && e.token === "*").map(
    (e) => e.path
  )
);

/** Substrings that must not appear in English i18n string values (case-insensitive). */
export const EN_FORBIDDEN_FRENCH_UI_TOKENS = [
  "Chargement",
  "Enregistrer",
  "Annuler",
  "Rechercher",
  "Aucun résultat",
  "Hors ligne",
  "Essentiel",
  "Inventaire pharmacie",
  "En pause",
  "En attente",
  "Cas approuvés",
  "comprimé",
  "gélule",
  "orale",
  "intraveineuse",
  "intramusculaire",
  "sous-cutanée",
  "Antidiabétique",
  "médicament",
  "ordonnance",
  "douleur",
  "aujourd'hui",
  "fréquence",
  "inconnu",
  "non confirmé",
  "Renouvellements",
  "Posologie",
  "Quantité",
  "Classe thérapeutique",
  "Site d'injection",
  "Dévoilement",
  "Forme pharmaceutique",
  "Modifié",
  "Actualiser",
  "Appliquer",
  "Synchronisation en cours",
] as const;

/** French catalog classification labels forbidden in en.ts UI strings. */
export const EN_FORBIDDEN_CATALOG_METADATA_TOKENS = [
  "comprimé",
  "comprime",
  "gélule",
  "gelule",
  "orale",
  "intraveineuse",
  "intraveineux",
  "intramusculaire",
  "sous-cutanée",
  "sous-cutanee",
  "Antidiabétique",
  "antidiabétique",
  "solution injectable",
  "Antihypertenseur",
  "Analgésique",
] as const;

/** Substrings scanned in whole-EMR UI source for hardcoded French UI chrome. */
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
  "Aucun résultat",
  "Rechercher",
  "Modifié",
  "Actualiser",
  "Appliquer",
  "Synchronisation en cours",
  "Voir alertes",
  "Ajout rapide",
] as const;

/**
 * English UI chrome forbidden in fr.ts where localized copy must exist.
 * Word-boundary match; avoid clinical abbreviations and medication names.
 */
export const FR_FORBIDDEN_ENGLISH_UI_TOKENS = [
  "Loading…",
  "Loading...",
  "Saving…",
  "Searching…",
  "Redirecting...",
  "No results",
  "Log out",
  "Could not load",
] as const;

/** Exact-match English chrome forbidden in fr.ts (standalone UI words). */
export const FR_FORBIDDEN_ENGLISH_UI_EXACT = [
  "Save",
  "Cancel",
  "Search",
  "Back",
  "Apply",
  "Refresh",
  "Delete",
  "Edit",
  "Create",
  "Yes",
  "No",
] as const;

export const CATALOG_LEAK_SCAN_DIRS = [
  "src/components/orders",
  "src/components/pharmacy",
  "src/components/encounters",
  "src/components/catalog",
  "src/components/medication",
  "src/features/emergency",
] as const;

export const CATALOG_LEAK_SCAN_DEFERRED_FILES = new Set<string>([
  "src/components/orders/CreateOrderModal.tsx",
  "src/components/orders/createOrderModal/types.ts",
  "src/lib/advancedMedicationSafetyLineMappers.ts",
  "src/lib/localizedMedicationDisplay.ts",
  "src/lib/catalogDisplayLabel.ts",
  "src/lib/orderItemDisplayFr.ts",
  "src/lib/catalog/localCatalogSearchAdapter.ts",
  "src/features/emergency/homeMedicationEntry.ts",
  "src/features/emergency/drugAllergyEntry.ts",
  "src/components/pharmacy/RxPrintLayout.tsx",
  "src/components/pharmacy/MedicationSuggestionList.tsx",
  "src/components/catalog/SharedCatalogAutocomplete.tsx",
  "src/components/medication/MedicationSoftSafetyPanel.tsx",
  "app/app/admin/medication-master/page.tsx",
  "app/app/admin/medication-governance/duplicates/page.tsx",
  "src/components/admin/MedicationMasterValidationReview.tsx",
  "src/components/pharmacy/ReceiveStockModal.tsx",
  ...HARDCODED_FRENCH_UI_DEFERRED_FILES,
]);

export const CATALOG_LEAK_KNOWN_DEFERRED_SURFACES = [
  {
    relPath: "src/components/pharmacy/ReceiveStockModal.tsx",
    reason: "Raw catalogMedication.dosageForm/route render — fix in 19U.5",
  },
  {
    relPath: "src/components/pharmacy/MedicationSuggestionList.tsx",
    reason: "Non-MEDICATION fallback joins raw secondaryText/metadata — pharmacy search is MEDICATION-only",
  },
  {
    relPath: "src/components/orders/CreateOrderModal.tsx",
    reason: "Print Rx payload passes raw stored catalog snapshots (display/print path)",
  },
] as const;

export const LOCALE_REGRESSION_COMPONENT_CONTRACTS = [
  {
    relPath: "src/components/orders/createOrderModal/SelectedMedicationItems.tsx",
    description: "CreateOrderModal selected medication display",
    mustImportAny: ["normalizeMedicationDisplayForLocale"],
    mustContain: [
      "normalizeMedicationDisplayForLocale(item._dosageForm, language)",
      "normalizeMedicationDisplayForLocale(item._route, language)",
      "normalizeMedicationDisplayForLocale(item._safetyCatalog.therapeuticClass, language)",
    ],
    mustNotContain: ['value={item._dosageForm ?? ""}', "value={item._dosageForm ?? ''}"],
  },
  {
    relPath: "src/components/catalog/SharedCatalogAutocomplete.tsx",
    description: "Shared catalog autocomplete medication subtitles",
    mustImportAny: ["formatCatalogMedicationSubtitleForLocale"],
    mustContain: [
      "formatCatalogMedicationSubtitleForLocale(item, language)",
      "pharmacyMedicationSearch.essentialBadge",
    ],
    mustNotContain: [],
  },
  {
    relPath: "src/components/pharmacy/MedicationSuggestionList.tsx",
    description: "Pharmacy medication search suggestions",
    mustImportAny: ["formatCatalogMedicationSubtitleForLocale"],
    mustContain: ["formatCatalogMedicationSubtitleForLocale(med, language)"],
    mustNotContain: [],
  },
  {
    relPath: "src/components/encounters/MedicationAdministrationTab.tsx",
    description: "MAR route hint and modal placeholder display",
    mustImportAny: ["normalizeMedicationDisplayForLocale"],
    mustContain: [
      "normalizeMedicationDisplayForLocale(row.routeHint, language)",
      "normalizeMedicationDisplayForLocale(modalItem.routeHint, language)",
    ],
    mustNotContain: [],
  },
  {
    relPath: "src/features/emergency/DrugAllergySearchPanel.tsx",
    description: "Triage drug allergy medication search",
    mustImportAny: ["formatMedicationOptionForLocale"],
    mustContain: ["formatMedicationOptionForLocale(item, language, t)"],
    mustNotContain: [],
  },
  {
    relPath: "src/features/emergency/HomeMedicationEntryModal.tsx",
    description: "Triage home medication entry display",
    mustImportAny: ["normalizeMedicationDisplayForLocale"],
    mustContain: ["normalizeMedicationDisplayForLocale("],
    mustNotContain: [],
  },
  {
    relPath: "src/components/pharmacy/QuickAddStockModal.tsx",
    description: "Pharmacy quick-add stock catalog form/route display",
    mustImportAny: ["normalizeMedicationDisplayForLocale"],
    mustContain: ["normalizeMedicationDisplayForLocale(selected.metadata?.dosageForm, language)"],
    mustNotContain: [],
  },
  {
    relPath: "src/components/medication/MedicationSoftSafetyPanel.tsx",
    description: "Medication soft safety therapeutic class display context",
    mustImportAny: ["normalizeMedicationDisplayForLocale"],
    mustContain: ["normalizeMedicationDisplayForLocale(therapeuticClass, language)"],
    mustNotContain: [],
  },
] as const;
