/**
 * MEDUI.ES.1J.B — SAFE chart-export print chrome (EN / FR / ES, zero fallback).
 *
 * Authored notes, codes, signer names, and legal plan-acceptance source stay original.
 */
import {
  resolveInternalProductUiLanguageOrDefault,
  type ProductUiLanguage,
} from "@medora/shared";

export type ChartExportDentalChrome = {
  notDocumented: string;
  historyReviewLabel: string;
  historyReviewed: string;
  onDate: string;
  notes: string;
  notReviewed: string;
  dentalEvaluationLabel: string;
  dentalEvaluationDocumented: string;
  odontogramLabel: string;
  periodontalLabel: string;
  status: string;
  stage: string;
  grade: string;
  narrative: string;
  sitesDocumented: string;
  treatmentPlanLabel: string;
  expectedBenefits: string;
  materialRisks: string;
  alternatives: string;
  dentalProceduresLabel: string;
  documentsLabel: string;
  statusShort: string;
  dateShort: string;
  signerShort: string;
  documentFallback: string;
  dentalBoardTitle: string;
};

/**
 * LEGAL_SOURCE_TEXT — frozen French source distinguishing plan acceptance from
 * signed procedural consent. Do not ordinary-translate.
 */
export const DENTAL_PLAN_ACCEPTANCE_LEGAL_SOURCE =
  "Acceptation du plan (≠ consentement procédural signé)";

const DENTAL_CHROME: Record<ProductUiLanguage, ChartExportDentalChrome> = {
  en: {
    notDocumented: "Not documented",
    historyReviewLabel: "History review (dental encounter)",
    historyReviewed: "Reviewed for this encounter",
    onDate: "On:",
    notes: "Notes:",
    notReviewed: "Not reviewed",
    dentalEvaluationLabel: "Dental clinical evaluation",
    dentalEvaluationDocumented: "Documented (structured dental clinical evaluation)",
    odontogramLabel: "Odontogram findings",
    periodontalLabel: "Periodontal exam",
    status: "Status:",
    stage: "Stage:",
    grade: "Grade:",
    narrative: "Narrative:",
    sitesDocumented: "Sites documented:",
    treatmentPlanLabel: "Dental treatment plan",
    expectedBenefits: "Benefits:",
    materialRisks: "Risks:",
    alternatives: "Alternatives:",
    dentalProceduresLabel: "Dental procedures performed",
    documentsLabel: "Documents (enterprise)",
    statusShort: "status:",
    dateShort: "date:",
    signerShort: "signer:",
    documentFallback: "Document",
    dentalBoardTitle: "Dental clinical record",
  },
  fr: {
    notDocumented: "Non documenté",
    historyReviewLabel: "Revue des antécédents (rencontre dentaire)",
    historyReviewed: "Revus pour cette rencontre",
    onDate: "Le:",
    notes: "Notes:",
    notReviewed: "Non revus",
    dentalEvaluationLabel: "Évaluation clinique dentaire",
    dentalEvaluationDocumented: "Documenté (évaluation clinique dentaire structurée)",
    odontogramLabel: "Constatations odontogramme",
    periodontalLabel: "Examen parodontal",
    status: "Statut:",
    stage: "Stade:",
    grade: "Grade:",
    narrative: "Narratif:",
    sitesDocumented: "Sites documentés:",
    treatmentPlanLabel: "Plan de traitement dentaire",
    expectedBenefits: "Bénéfices:",
    materialRisks: "Risques:",
    alternatives: "Alternatives:",
    dentalProceduresLabel: "Actes dentaires réalisés",
    documentsLabel: "Documents (entreprise)",
    statusShort: "statut:",
    dateShort: "date:",
    signerShort: "signataire:",
    documentFallback: "Document",
    dentalBoardTitle: "Dossier clinique dentaire",
  },
  es: {
    notDocumented: "No documentado",
    historyReviewLabel: "Revisión de antecedentes (encuentro dental)",
    historyReviewed: "Revisados para este encuentro",
    onDate: "El:",
    notes: "Notas:",
    notReviewed: "No revisados",
    dentalEvaluationLabel: "Evaluación clínica dental",
    dentalEvaluationDocumented: "Documentado (evaluación clínica dental estructurada)",
    odontogramLabel: "Hallazgos del odontograma",
    periodontalLabel: "Examen periodontal",
    status: "Estado:",
    stage: "Estadio:",
    grade: "Grado:",
    narrative: "Narrativa:",
    sitesDocumented: "Sitios documentados:",
    treatmentPlanLabel: "Plan de tratamiento dental",
    expectedBenefits: "Beneficios:",
    materialRisks: "Riesgos:",
    alternatives: "Alternativas:",
    dentalProceduresLabel: "Actos dentales realizados",
    documentsLabel: "Documentos (empresa)",
    statusShort: "estado:",
    dateShort: "fecha:",
    signerShort: "firmante:",
    documentFallback: "Documento",
    dentalBoardTitle: "Expediente clínico dental",
  },
};

export type ChartExportHtmlChrome = {
  primarySigner: string;
  witnessSigner: string;
  unifiedTimelineTitle: string;
  unifiedTimelineCapped: (count: number) => string;
  documentedAt: string;
  correctedClinicalTime: string;
};

const HTML_CHROME: Record<ProductUiLanguage, Omit<ChartExportHtmlChrome, "unifiedTimelineCapped"> & { unifiedTimelineCapped: string }> =
  {
    en: {
      primarySigner: "Primary signer",
      witnessSigner: "Witness signer",
      unifiedTimelineTitle: "Unified timeline (cross-department)",
      unifiedTimelineCapped: "Unified timeline limited to {count} most recent events.",
      documentedAt: "Documented:",
      correctedClinicalTime: "Corrected clinical time:",
    },
    fr: {
      primarySigner: "Signataire principal",
      witnessSigner: "Témoin",
      unifiedTimelineTitle: "Chronologie unifiée (inter-départements)",
      unifiedTimelineCapped: "Chronologie unifiée limitée aux {count} événements les plus récents.",
      documentedAt: "Documenté :",
      correctedClinicalTime: "Heure clinique corrigée :",
    },
    es: {
      primarySigner: "Firmante principal",
      witnessSigner: "Firmante testigo",
      unifiedTimelineTitle: "Cronología unificada (interdepartamental)",
      unifiedTimelineCapped: "Cronología unificada limitada a los {count} eventos más recientes.",
      documentedAt: "Documentado:",
      correctedClinicalTime: "Hora clínica corregida:",
    },
  };

export function chartExportDentalChrome(locale: string | null | undefined): ChartExportDentalChrome {
  return DENTAL_CHROME[resolveInternalProductUiLanguageOrDefault(locale)];
}

export function chartExportHtmlChrome(locale: string | null | undefined): ChartExportHtmlChrome {
  const lang = resolveInternalProductUiLanguageOrDefault(locale);
  const row = HTML_CHROME[lang];
  return {
    ...row,
    unifiedTimelineCapped: (count: number) => row.unifiedTimelineCapped.replace("{count}", String(count)),
  };
}

export const MEDUI_ES_1JB_CHART_EXPORT_DENTAL_CHROME_KEYS = Object.keys(DENTAL_CHROME.en).length;
export const MEDUI_ES_1JB_CHART_EXPORT_HTML_CHROME_KEYS = Object.keys(HTML_CHROME.en).length;
