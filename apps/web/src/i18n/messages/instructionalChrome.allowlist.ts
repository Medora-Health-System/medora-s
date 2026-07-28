/**
 * Phase 19X.1 — Instructional / explanatory UI chrome regression gates.
 * Scans English user-facing catalogs and selected clinical UI sources.
 */

export type InstructionalChromeAllowlistScope = "enMessage" | "enMessagePrefix" | "sourceFile" | "sourceLine";

export type InstructionalChromeAllowlistEntry = {
  scope: InstructionalChromeAllowlistScope;
  /** Dotted i18n path, prefix, or apps/web-relative source path. */
  path: string;
  /** Forbidden token/pattern, or "*" for entire path exemption. */
  token: string;
  reason: string;
};

/** Entire i18n subtrees excluded — clinical fragments, billing contracts, admin tooling. */
export const INSTRUCTIONAL_CHROME_MESSAGE_PREFIX_ALLOWLIST = [
  "providerDocumentationComplaintIntel.",
  "providerDocumentationMdmHighValue.",
  "providerDocumentationMdmHighValueAmbulatory.",
  "providerDocumentationSmartSentences.",
  "providerDocumentationPromptReminders.",
  "erMseMdmChips.",
  "erMseHpiChips.",
  "erMseHpiChipsTrauma.",
  "erMseHpiChipsPediatric.",
  "erMseExamChips.",
  "erMseRosChips.",
  "erMseMdmGuidance.",
  "billingPage.",
  "billingCapture.",
  "claimPreview.",
  "claimExport.",
  "externalBillingExport.",
  "medicationInventoryStaging.",
  "medicationGovernanceActivation.",
  "x12Preview.",
  "adminGoLive.",
  "adminBackupReadiness.",
  "mspp",
  "erTriage.preview.",
  "erTriage.homeMed.",
  "erTriage.drugAllergy.",
  "erTriage.visitSummary.",
] as const;

/** Case-insensitive substrings forbidden in English UI chrome (instructional / implementation detail). */
export const FORBIDDEN_INSTRUCTIONAL_UI_PATTERNS = [
  "same encounter record as the chart",
  "structured preview from entered fields",
  "text derived from entered fields",
  "derived from entered fields",
  "not ai",
  "no ai",
  "stored with triage as json",
  "saved elsewhere in the chart",
  "for ed visits, complete triage here first",
  "click to fill",
  "assistive suggestions from triage",
  "no automatic orders",
  "manual confirmation required",
  "chips insert editable",
  "do not create diagnoses, orders, billing",
  "cockpit view",
  "documentation completeness",
  "live documentation preview",
  "preview only. not part of the legal record",
  "preview only for now",
  "read-only generated",
  "saved elsewhere",
  "existing field",
  "sign readiness",
  "save status",
  "last saved",
  "quick actions",
  "encounter summary",
  "key information",
  "documentation reminders",
  "workflow guidance",
  "editable documentation fragments",
  "same chart",
  "stored in json",
  "stored in the emtala json",
  "sentence generated from entered items",
  "structured fields saved with triage (server json)",
  "advisory only — optional checks before save",
  "advisory only — does not block save",
  "suggested because:",
  "fills empty exam sections only",
  "click only what you verified",
  "not part of the legal record until saved",
  "implementation detail",
  "same tool as mar tab",
] as const;

export const INSTRUCTIONAL_CHROME_ALLOWLIST: readonly InstructionalChromeAllowlistEntry[] = [
  {
    scope: "enMessage",
    path: "erMseProviderPanel.placeholderDifferential",
    token: "no diagnostic engine",
    reason: "Field placeholder — not a banner; kept minimal.",
  },
  {
    scope: "enMessage",
    path: "erMseProviderPanel.placeholderMdmAdmitObserveDischarge",
    token: "no automatic decision",
    reason: "Field placeholder — not instructional banner.",
  },
  {
    scope: "enMessagePrefix",
    path: "erCds.recommendations.",
    token: "*",
    reason: "Clinical decision support titles/bodies — actionable alerts, not dev chrome.",
  },
  {
    scope: "sourceFile",
    path: "src/i18n/messages/instructionalChrome.allowlist.ts",
    token: "*",
    reason: "Pattern catalog self-reference.",
  },
  {
    scope: "sourceFile",
    path: "src/i18n/messages/instructionalChrome.test.ts",
    token: "*",
    reason: "Regression test fixtures.",
  },
];

export const INSTRUCTIONAL_CHROME_SOURCE_SCAN_PATHS = [
  "src/features/emergency/EmergencyTriagePanel.tsx",
  "src/features/emergency/EmergencyProviderMsePanel.tsx",
  "src/features/emergency/EmergencyDispositionPanel.tsx",
  "src/features/emergency/EmergencyNursingReassessmentPanel.tsx",
  "src/components/encounters/ProviderDocumentationWorkspace.tsx",
  "app/app/pharmacy/inventory/page.tsx",
  "src/components/pharmacy/PharmacyInventoryToolbar.tsx",
  "src/components/pharmacy/PharmacyAlertsCard.tsx",
  "src/components/pharmacy/PharmacyInventoryFilters.tsx",
  "src/components/pharmacy/QuickAddStockModal.tsx",
] as const;

export const PHARMACY_EN_FORBIDDEN_FRENCH_UI = [
  "Inventaire pharmacie",
  "Alertes pharmacie",
  "Stock faible",
  "Péremption",
  "Actualiser",
  "Ajouter au stock",
  "Créer un article",
  "Rechercher un médicament",
  "Recherchez un médicament",
  "Ajout rapide",
  "Expiration proche",
] as const;

export function isInstructionalChromePathAllowlisted(path: string): boolean {
  if (INSTRUCTIONAL_CHROME_MESSAGE_PREFIX_ALLOWLIST.some((p) => path === p.slice(0, -1) || path.startsWith(p))) {
    return true;
  }
  return INSTRUCTIONAL_CHROME_ALLOWLIST.some(
    (entry) =>
      (entry.scope === "enMessage" || entry.scope === "enMessagePrefix") &&
      entry.token === "*" &&
      (path === entry.path || path.startsWith(`${entry.path}.`) || entry.path.endsWith(".") && path.startsWith(entry.path))
  );
}

export function isInstructionalChromePatternAllowlisted(path: string, pattern: string): boolean {
  return INSTRUCTIONAL_CHROME_ALLOWLIST.some(
    (entry) =>
      (entry.scope === "enMessage" || entry.scope === "enMessagePrefix") &&
      entry.token !== "*" &&
      (path === entry.path || path.startsWith(`${entry.path}.`)) &&
      pattern.toLowerCase().includes(entry.token.toLowerCase())
  );
}

export function englishMessageContainsForbiddenInstructionalPattern(value: string, pattern: string): boolean {
  return value.toLowerCase().includes(pattern.toLowerCase());
}
