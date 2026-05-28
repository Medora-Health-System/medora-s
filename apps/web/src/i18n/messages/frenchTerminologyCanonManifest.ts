/**
 * Phase M-BOOK.FR.1 — Canonical French terminology manifest (source-level validation).
 * Human-readable definitions live in docs/operations/french-terminology-canon.md.
 * Do not change workflow behavior here — labels and governance only.
 */
export const MBOOK_FR1_CANON_VERSION = "M-BOOK.FR.1";

/** Complaint-intelligence MDM picker subgroups — must match fr.ts exactly. */
export const COMPLAINT_INTELLIGENCE_SUBGROUP_CANON = {
  "providerDocumentationWorkspace.templateSubgroupGiAbdominal": "Gastro-intestinal / abdominal",
  "providerDocumentationWorkspace.templateSubgroupRespiratoryEnt": "Respiratoire / ORL",
  "providerDocumentationWorkspace.templateSubgroupCardiacVascular": "Cardiaque / vasculaire",
  "providerDocumentationWorkspace.templateSubgroupGuRenal": "GU / rénal",
  "providerDocumentationWorkspace.templateSubgroupMskTrauma": "MSK / traumatique",
  "providerDocumentationWorkspace.templateSubgroupInfectiousEnt": "Infectieux / ORL",
  "providerDocumentationWorkspace.templateSubgroupEndocrineMetabolic": "Endocrinien / métabolique",
  "providerDocumentationWorkspace.templateSubgroupNeurologyExpansion": "Neurologie avancée",
} as const;

/** Enterprise workflow navigation and page titles — must remain localized in fr.ts. */
export const ENTERPRISE_WORKFLOW_LABEL_KEYS = [
  "nav.registration",
  "nav.emergencyTriage",
  "nav.trackboard",
  "nav.emergency",
  "nav.nursing",
  "nav.provider",
  "nav.pharmacyQueue",
  "nav.labWorklist",
  "nav.radWorklist",
  "nav.admin",
  "nav.adminAudit",
  "nav.adminRoi",
  "emergencyTrackboard.title",
  "emergencyDisposition.cardTitle",
  "registrationHome.title",
  "clinicalTrackboardPage.title",
  "roi.title",
] as const;

/** Mobile shell labels — must remain localized (shared drawer uses nav.* keys). */
export const MOBILE_NAV_LABEL_KEYS = [
  "appShell.mobileMenuOpen",
  "appShell.mobileMenuClose",
  "appShell.mobileMenuBackdrop",
  "appShell.mobileNavDrawerLabel",
  "appShell.primaryNavigation",
] as const;

/** Disposition terminology anchors — display-only keys, not persisted equality strings. */
export const DISPOSITION_TERMINOLOGY_ANCHOR_KEYS = {
  panelTitle: "emergencyDisposition.cardTitle",
  saveDecision: "emergencyDisposition.saveButton",
  outcomeLabel: "emergencyErClosure.dispositionOutcomeLabel",
  trackboardTooltip: "emergencyTrackboard.dispositionTooltip",
} as const;

/** Approved clinical/admin abbreviations allowed in French UI (handbook canon). */
export const APPROVED_FR_UI_ABBREVIATIONS = [
  "MDM",
  "HPI",
  "ROS",
  "ROI",
  "ESI",
  "ORL",
  "GU",
  "MSK",
  "ECG",
  "LAMA",
  "LWBS",
  "EMTALA",
  "MFA",
  "NIR",
  "MRN",
  "CPT",
  "HCPCS",
  "MSPP",
  "IDE",
] as const;

/** Forbidden English UI chrome tokens in fr.ts (outside allowlisted clinical abbreviations). */
export const FORBIDDEN_MIXED_LANGUAGE_UI_PATTERNS: readonly RegExp[] = [
  /\bLoading\b/,
  /\bCancel\b/,
  /\bSave\b/,
  /\bFailed to\b/,
  /\bView Encounter\b/,
  /\bNo results\b/,
  /\bApply filters\b/,
  /\bLast updated\b/,
];

/** Key prefixes scanned for forbidden mixed-language UI patterns. */
export const MIXED_LANGUAGE_SCAN_PREFIXES = [
  "nav",
  "appShell",
  "registrationHome",
  "registrationWorkspace",
  "emergencyTrackboard",
  "emergencyDisposition",
  "clinicalTrackboardPage",
  "providerDocumentationWorkspace.templateSubgroup",
] as const;
