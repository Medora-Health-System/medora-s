/**
 * Medora-S — Manifeste du manuel entreprise français (M-BOOK.FR.11 + FR.12)
 *
 * Métadonnées structurées pour assemblage PDF/DOCX, formation, déploiement Haïti.
 * Documentation uniquement — ne modifie pas le comportement produit.
 *
 * Source de vérité machine pour tests :
 * - frenchHandbookEnterpriseAssembly19MBookFr11.test.ts
 * - frenchHandbookExportAssets19MBookFr12.test.ts
 */

export const MBOOK_FR11_ENTERPRISE_HANDBOOK_VERSION = "M-BOOK.FR.11";
export const MBOOK_FR12_EXPORT_VERSION = "M-BOOK.FR.12";
export const MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT = "docs/operations/medora-enterprise-handbook-fr";

export type MobileRelevance = "high" | "medium" | "low" | "none";
export type HaitiRelevance = "critical" | "high" | "medium" | "low";

export type HandbookManifestEntry = {
  /** Numéro de volume (null pour documents transverses) */
  volumeNumber: number | null;
  phase: string;
  title: string;
  /** Chemin relatif depuis la racine du dépôt */
  sourceFile: string;
  targetAudience: string[];
  workflowDomains: string[];
  mobileRelevance: MobileRelevance;
  haitiRelevance: HaitiRelevance;
  governanceSensitive: boolean;
};

/** Volumes opérationnels 1–9 + documents transverses canon / inventaire / risques */
export const ENTERPRISE_HANDBOOK_MANIFEST: HandbookManifestEntry[] = [
  {
    volumeNumber: 1,
    phase: "M-BOOK.FR.2",
    title: "Accueil, inscription et arrivée patient",
    sourceFile: "docs/operations/handbook-fr-registration-intake.md",
    targetAudience: ["FRONT_DESK", "RN", "PROVIDER", "ADMIN"],
    workflowDomains: ["registration", "patient_identity", "visit_intake"],
    mobileRelevance: "medium",
    haitiRelevance: "critical",
    governanceSensitive: true,
  },
  {
    volumeNumber: 2,
    phase: "M-BOOK.FR.3",
    title: "Triage et intake clinique",
    sourceFile: "docs/operations/handbook-fr-triage-clinical-intake.md",
    targetAudience: ["RN", "PROVIDER", "ADMIN"],
    workflowDomains: ["triage", "esi", "carry_forward", "reassessment"],
    mobileRelevance: "high",
    haitiRelevance: "critical",
    governanceSensitive: true,
  },
  {
    volumeNumber: 3,
    phase: "M-BOOK.FR.4",
    title: "Workflow prestataire et documentation",
    sourceFile: "docs/operations/handbook-fr-provider-workflow-documentation.md",
    targetAudience: ["PROVIDER", "ADMIN"],
    workflowDomains: ["provider_documentation", "hpi", "ros", "mdm", "complaint_intelligence", "orders"],
    mobileRelevance: "high",
    haitiRelevance: "critical",
    governanceSensitive: true,
  },
  {
    volumeNumber: 4,
    phase: "M-BOOK.FR.5",
    title: "Workflow infirmier et exécution sortie",
    sourceFile: "docs/operations/handbook-fr-nursing-discharge-execution.md",
    targetAudience: ["RN", "PROVIDER", "ADMIN"],
    workflowDomains: ["nursing_care", "reassessment", "mar", "discharge_execution"],
    mobileRelevance: "high",
    haitiRelevance: "critical",
    governanceSensitive: true,
  },
  {
    volumeNumber: 5,
    phase: "M-BOOK.FR.6",
    title: "Pharmacie, laboratoire et imagerie",
    sourceFile: "docs/operations/handbook-fr-pharmacy-lab-radiology.md",
    targetAudience: ["PHARMACY", "LAB", "RADIOLOGY", "ADMIN"],
    workflowDomains: ["pharmacy_queue", "lab_worklist", "radiology_worklist", "results"],
    mobileRelevance: "medium",
    haitiRelevance: "high",
    governanceSensitive: true,
  },
  {
    volumeNumber: 6,
    phase: "M-BOOK.FR.7",
    title: "Orientation, admission, transfert et ROI",
    sourceFile: "docs/operations/handbook-fr-disposition-admission-transfer-roi.md",
    targetAudience: ["PROVIDER", "RN", "FRONT_DESK", "ADMIN"],
    workflowDomains: ["disposition", "orientation", "admission", "transfer", "roi", "chart_export"],
    mobileRelevance: "medium",
    haitiRelevance: "high",
    governanceSensitive: true,
  },
  {
    volumeNumber: 7,
    phase: "M-BOOK.FR.8",
    title: "Administration et gouvernance plateforme",
    sourceFile: "docs/operations/handbook-fr-administration-governance-operations.md",
    targetAudience: ["ADMIN", "MEDORA_SUPER_ADMIN"],
    workflowDomains: ["users", "audit", "system_health", "medication_governance", "go_live"],
    mobileRelevance: "low",
    haitiRelevance: "high",
    governanceSensitive: true,
  },
  {
    volumeNumber: 8,
    phase: "M-BOOK.FR.9",
    title: "Mobile, tablette et déploiement Haïti",
    sourceFile: "docs/operations/handbook-fr-mobile-tablette-haiti.md",
    targetAudience: ["RN", "PROVIDER", "FRONT_DESK", "ADMIN"],
    workflowDomains: ["mobile_nav", "responsive_19m", "connectivity", "haiti_deployment"],
    mobileRelevance: "high",
    haitiRelevance: "critical",
    governanceSensitive: false,
  },
  {
    volumeNumber: 9,
    phase: "M-BOOK.FR.10",
    title: "Formation, intégration et certification opérationnelle",
    sourceFile: "docs/operations/handbook-fr-training-onboarding-certification.md",
    targetAudience: ["ADMIN", "SUPERVISOR", "TRAINER"],
    workflowDomains: ["onboarding", "certification", "training", "super_user"],
    mobileRelevance: "medium",
    haitiRelevance: "critical",
    governanceSensitive: false,
  },
  {
    volumeNumber: null,
    phase: "M-BOOK.FR.1",
    title: "Canon terminologique français opérationnel",
    sourceFile: "docs/operations/french-terminology-canon.md",
    targetAudience: ["ALL"],
    workflowDomains: ["terminology", "governance"],
    mobileRelevance: "none",
    haitiRelevance: "critical",
    governanceSensitive: true,
  },
  {
    volumeNumber: null,
    phase: "M-BOOK.FR.1",
    title: "Guide de style manuel français",
    sourceFile: "docs/operations/french-handbook-style-guide.md",
    targetAudience: ["AUTHOR", "TRAINER", "ADMIN"],
    workflowDomains: ["documentation", "style"],
    mobileRelevance: "none",
    haitiRelevance: "medium",
    governanceSensitive: false,
  },
  {
    volumeNumber: null,
    phase: "M-BOOK.FR.1",
    title: "Inventaire des workflows",
    sourceFile: "docs/operations/french-workflow-inventory.md",
    targetAudience: ["AUTHOR", "TRAINER", "ADMIN"],
    workflowDomains: ["workflow_index", "prioritization"],
    mobileRelevance: "none",
    haitiRelevance: "high",
    governanceSensitive: false,
  },
  {
    volumeNumber: null,
    phase: "M-BOOK.FR.1",
    title: "Registre des risques terminologiques",
    sourceFile: "docs/operations/french-terminology-risks.md",
    targetAudience: ["AUTHOR", "TRAINER", "ADMIN"],
    workflowDomains: ["terminology", "risk_register"],
    mobileRelevance: "none",
    haitiRelevance: "high",
    governanceSensitive: true,
  },
];

export const ENTERPRISE_HANDBOOK_ASSEMBLY_FILES = {
  cover: `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/00-page-garde.md`,
  tableOfContents: `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/01-table-des-matieres.md`,
  introduction: `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/02-introduction-generale.md`,
  glossary: `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/03-glossaire.md`,
  workflowIndex: `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/04-index-workflows.md`,
  routeIndex: `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/05-index-routes.md`,
  acronymIndex: `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/06-index-acronymes.md`,
  screenshotIndex: `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/07-index-captures-ecran.md`,
  diagramIndex: `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/08-index-diagrammes.md`,
  documentGovernance: `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/09-gouvernance-documentaire.md`,
  exportChecklist: `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/exports/export-readiness-checklist.md`,
} as const;

export const ENTERPRISE_HANDBOOK_APPENDICES = [
  `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/appendices/appendix-a-haiti-deployment.md`,
  `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/appendices/appendix-b-mobile-safety.md`,
  `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/appendices/appendix-c-quick-reference.md`,
  `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/appendices/appendix-d-training-scenarios.md`,
  `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/appendices/appendix-e-downtime-paper-workflow.md`,
] as const;

export const ENTERPRISE_HANDBOOK_ASSET_PLACEHOLDERS = [
  `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/assets-placeholders/screenshots`,
  `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/assets-placeholders/diagrams`,
  `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/assets-placeholders/icons`,
] as const;

/** M-BOOK.FR.12 — export assets and pipeline paths */
export const ENTERPRISE_HANDBOOK_EXPORT_ASSETS = {
  diagramsDir: `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/assets/diagrams`,
  screenshotsDir: `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/assets/screenshots`,
  assembledMarkdown: `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/exports/assembled/medora-enterprise-handbook-fr-assembled.md`,
  screenshotManifest: `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/exports/screenshot-manifest-fr.ts`,
  exportPipeline: `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/exports/export-pipeline.md`,
  screenshotRunbook: `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/exports/screenshot-capture-runbook.md`,
  buildDir: `${MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT}/exports/build`,
} as const;

export const ENTERPRISE_HANDBOOK_DIAGRAM_BASENAMES = [
  "medora-fr-diag-registration-flux-principal",
  "medora-fr-diag-registration-types-consultation",
  "medora-fr-diag-triage-flux-principal",
  "medora-fr-diag-triage-reevaluation-esi",
  "medora-fr-diag-provider-doc-flux",
  "medora-fr-diag-complaint-intelligence",
  "medora-fr-diag-nursing-soins-flux",
  "medora-fr-diag-nursing-sortie-execution",
  "medora-fr-diag-disposition-cycle",
  "medora-fr-diag-orientation-disposition-distinction",
  "medora-fr-diag-admission-observation",
  "medora-fr-diag-roi-cycle-vie",
  "medora-fr-diag-carry-forward-cycle",
  "medora-fr-diag-connectivite-degradee",
  "medora-fr-diag-haiti-deploiement",
  "medora-fr-diag-haiti-super-users",
  "medora-fr-diag-formation-par-role",
  "medora-fr-diag-certification-niveaux",
  "medora-fr-diag-formation-calendrier-haiti",
  "medora-fr-diag-parcours-patient-ed-master",
] as const;
