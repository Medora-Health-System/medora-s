/**
 * Phase 19Q — ED documentation quality guardrails (v1).
 *
 * Advisory warnings only. Never blocks signing, saving, or auto-documents content.
 */
import { buildDocumentationCorpus } from "./providerDocumentationDynamicIntelligence";
import type { ActiveDynamicClinicalCluster, DynamicClinicalClusterId } from "./providerDocumentationDynamicClinicalClusters";
import type {
  ProviderDocumentationTemplateId,
  ProviderDocumentationWorkspaceState,
} from "./providerDocumentationModel";
import { countNonEmptyText } from "./providerDocumentationSectionSummary";
import type { ProviderDocumentationAccordionSectionId } from "./providerDocumentationSectionSummary";

export type DocumentationGuardrailSeverity = "info" | "warning" | "high";

export type DocumentationGuardrail = {
  id: string;
  severity: DocumentationGuardrailSeverity;
  titleKey: string;
  descriptionKey: string;
  suggestedSection?: ProviderDocumentationAccordionSectionId;
};

export type DocumentationGuardrailEvaluationArgs = {
  templateId: ProviderDocumentationTemplateId | null;
  state: ProviderDocumentationWorkspaceState;
  dynamicClusters: ActiveDynamicClinicalCluster[];
};

export const DOCUMENTATION_GUARDRAIL_SEVERITY_ORDER: DocumentationGuardrailSeverity[] = [
  "high",
  "warning",
  "info",
];

export const DOCUMENTATION_GUARDRAIL_SEVERITY_LABEL_KEYS: Record<DocumentationGuardrailSeverity, string> = {
  high: "providerDocumentationQualityGuardrails.severityHigh",
  warning: "providerDocumentationQualityGuardrails.severityWarning",
  info: "providerDocumentationQualityGuardrails.severityInfo",
};

export const DOCUMENTATION_GUARDRAIL_SECTION_LABEL_KEYS: Record<
  ProviderDocumentationAccordionSectionId,
  string
> = {
  presentation: "providerDocumentationWorkspace.sectionPresentation",
  hpi: "providerDocumentationWorkspace.sectionHpi",
  ros: "providerDocumentationWorkspace.sectionRos",
  physicalExam: "providerDocumentationWorkspace.sectionExam",
  mdm: "providerDocumentationWorkspace.sectionMdm",
  impressionPlan: "providerDocumentationWorkspace.sectionPlan",
  actions: "providerDocumentationWorkspace.finalActions",
};

const HIGH_RISK_TEMPLATE_IDS: ProviderDocumentationTemplateId[] = [
  "chest_pain",
  "sob",
  "stroke_symptoms",
  "abdominal_pain",
  "asthma_wheezing",
  "fever",
  "male_genital_complaint",
  "female_pelvic_gyn_complaint",
  "psychiatric_behavioral",
  "back_pain",
  "neck_pain_trauma",
  "dehydration",
  "diarrhea",
  "nausea_vomiting",
];

const PEDIATRIC_FEVER_DEHYDRATION_TEMPLATE_IDS: ProviderDocumentationTemplateId[] = [
  "fever",
  "dehydration",
  "diarrhea",
  "nausea_vomiting",
];

const title = (key: string) => `providerDocumentationQualityGuardrails.items.${key}.title`;
const description = (key: string) => `providerDocumentationQualityGuardrails.items.${key}.description`;

function corpusHasTerms(corpus: string, terms: string[]): boolean {
  const normalized = corpus.toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
}

function clusterIsActive(
  clusters: ActiveDynamicClinicalCluster[],
  clusterId: DynamicClinicalClusterId
): boolean {
  return clusters.some((cluster) => cluster.id === clusterId);
}

function hasMdmDocumented(state: ProviderDocumentationWorkspaceState): boolean {
  return (
    countNonEmptyText(
      state.mdmWorkingAssessment,
      state.mdmDifferentialSynthesis,
      state.mdmDataReviewed,
      state.mdmClinicalRationale,
      state.mdmPlanSummary,
      state.mdmImmediateActionsRationale,
      state.mdmConsultsDiscussed,
      state.mdmAdmitObserveDischarge,
      state.mdmRiskLevel
    ) > 0
  );
}

function hasReassessmentDocumented(state: ProviderDocumentationWorkspaceState, corpus: string): boolean {
  if (state.physicalExam.reassessment.trim().length > 0) return true;
  if (state.mdmPlanSummary.trim().length > 0 && corpusHasTerms(corpus, ["reassess", "réévalu"])) return true;
  return corpusHasTerms(corpus, [
    "reassess",
    "réévalu",
    "on reassessment",
    "repeat exam",
    "serial reassessment",
    "repeat neurologic",
    "repeat neuro",
    "repeat abdominal",
    "repeat chest pain",
    "repeat lung exam",
    "serial abdominal exam",
  ]);
}

function hasDispositionDocumented(state: ProviderDocumentationWorkspaceState, corpus: string): boolean {
  if (
    countNonEmptyText(state.mdmAdmitObserveDischarge, state.followUpDisposition, state.treatmentPlan) > 0
  ) {
    return true;
  }
  return corpusHasTerms(corpus, [
    "admission considered",
    "observation considered",
    "discharge",
    "transfer considered",
    "disposition",
    "follow-up",
    "suivi",
  ]);
}

function hasReturnPrecautionsDocumented(corpus: string): boolean {
  return corpusHasTerms(corpus, [
    "return precaution",
    "return for",
    "advised to return",
    "caregiver",
    "retour si",
    "precautions discussed",
    "return instructions",
  ]);
}

function pushGuardrail(
  results: DocumentationGuardrail[],
  seen: Set<string>,
  guardrail: DocumentationGuardrail
): void {
  if (seen.has(guardrail.id)) return;
  seen.add(guardrail.id);
  results.push(guardrail);
}

export function evaluateDocumentationQualityGuardrails(
  args: DocumentationGuardrailEvaluationArgs
): DocumentationGuardrail[] {
  const { templateId, state, dynamicClusters } = args;
  if (!templateId) return [];

  const corpus = buildDocumentationCorpus(state);
  const results: DocumentationGuardrail[] = [];
  const seen = new Set<string>();

  if (clusterIsActive(dynamicClusters, "acs_chest_pain")) {
    if (
      !corpusHasTerms(corpus, [
        "repeat chest pain",
        "chest pain improved",
        "chest pain reassessment",
        "serial reassessment",
        "reassess",
      ])
    ) {
      pushGuardrail(results, seen, {
        id: "acs_missing_reassessment",
        severity: "high",
        titleKey: title("acsMissingReassessment"),
        descriptionKey: description("acsMissingReassessment"),
        suggestedSection: "physicalExam",
      });
    }
    if (!corpusHasTerms(corpus, ["heart score", "score heart", "heart elements"])) {
      pushGuardrail(results, seen, {
        id: "acs_missing_heart_score",
        severity: "high",
        titleKey: title("acsMissingHeartScore"),
        descriptionKey: description("acsMissingHeartScore"),
        suggestedSection: "mdm",
      });
    }
    if (!hasDispositionDocumented(state, corpus)) {
      pushGuardrail(results, seen, {
        id: "acs_missing_disposition",
        severity: "warning",
        titleKey: title("acsMissingDisposition"),
        descriptionKey: description("acsMissingDisposition"),
        suggestedSection: "impressionPlan",
      });
    }
  }

  if (clusterIsActive(dynamicClusters, "respiratory_distress")) {
    if (
      !corpusHasTerms(corpus, [
        "repeat lung exam",
        "respiratory reassessment",
        "work of breathing",
        "reassess",
      ])
    ) {
      pushGuardrail(results, seen, {
        id: "respiratory_missing_exam",
        severity: "high",
        titleKey: title("respiratoryMissingExam"),
        descriptionKey: description("respiratoryMissingExam"),
        suggestedSection: "physicalExam",
      });
    }
    if (
      !corpusHasTerms(corpus, [
        "oxygen requirement",
        "spo2",
        "sp o2",
        "oxygen reassess",
        "supplemental oxygen",
        "pulse ox",
      ])
    ) {
      pushGuardrail(results, seen, {
        id: "respiratory_missing_oxygen_reassessment",
        severity: "warning",
        titleKey: title("respiratoryMissingOxygenReassessment"),
        descriptionKey: description("respiratoryMissingOxygenReassessment"),
        suggestedSection: "physicalExam",
      });
    }
    if (!hasDispositionDocumented(state, corpus)) {
      pushGuardrail(results, seen, {
        id: "respiratory_missing_disposition",
        severity: "warning",
        titleKey: title("respiratoryMissingDisposition"),
        descriptionKey: description("respiratoryMissingDisposition"),
        suggestedSection: "impressionPlan",
      });
    }
  }

  if (clusterIsActive(dynamicClusters, "stroke_neuro_deficit")) {
    if (!corpusHasTerms(corpus, ["last known well", "lkw", "dernier moment connu"])) {
      pushGuardrail(results, seen, {
        id: "stroke_missing_lkw",
        severity: "high",
        titleKey: title("strokeMissingLkw"),
        descriptionKey: description("strokeMissingLkw"),
        suggestedSection: "hpi",
      });
    }
    if (
      !corpusHasTerms(corpus, [
        "repeat neurologic",
        "repeat neuro",
        "serial neurologic",
        "neurologic exam",
        "reassess",
      ])
    ) {
      pushGuardrail(results, seen, {
        id: "stroke_missing_neuro_reassessment",
        severity: "high",
        titleKey: title("strokeMissingNeuroReassessment"),
        descriptionKey: description("strokeMissingNeuroReassessment"),
        suggestedSection: "physicalExam",
      });
    }
    if (!hasDispositionDocumented(state, corpus)) {
      pushGuardrail(results, seen, {
        id: "stroke_missing_disposition",
        severity: "warning",
        titleKey: title("strokeMissingDisposition"),
        descriptionKey: description("strokeMissingDisposition"),
        suggestedSection: "impressionPlan",
      });
    }
  }

  if (clusterIsActive(dynamicClusters, "surgical_abdomen")) {
    if (
      !corpusHasTerms(corpus, [
        "serial abdominal",
        "repeat abdominal",
        "abdominal exam documented",
        "reassess",
      ])
    ) {
      pushGuardrail(results, seen, {
        id: "surgical_abdomen_missing_serial_exam",
        severity: "high",
        titleKey: title("surgicalAbdomenMissingSerialExam"),
        descriptionKey: description("surgicalAbdomenMissingSerialExam"),
        suggestedSection: "physicalExam",
      });
    }
    if (
      !corpusHasTerms(corpus, [
        "surgical consultation",
        "surgery consult",
        "consultation chirurgicale",
        "surgical consult",
      ])
    ) {
      pushGuardrail(results, seen, {
        id: "surgical_abdomen_missing_consult",
        severity: "warning",
        titleKey: title("surgicalAbdomenMissingConsult"),
        descriptionKey: description("surgicalAbdomenMissingConsult"),
        suggestedSection: "mdm",
      });
    }
    if (!hasReassessmentDocumented(state, corpus)) {
      pushGuardrail(results, seen, {
        id: "surgical_abdomen_missing_reassessment",
        severity: "warning",
        titleKey: title("surgicalAbdomenMissingReassessment"),
        descriptionKey: description("surgicalAbdomenMissingReassessment"),
        suggestedSection: "physicalExam",
      });
    }
  }

  const pediatricFeverDehydrationActive =
    clusterIsActive(dynamicClusters, "pediatric_dehydration") ||
    PEDIATRIC_FEVER_DEHYDRATION_TEMPLATE_IDS.includes(templateId);

  if (pediatricFeverDehydrationActive) {
    if (
      !corpusHasTerms(corpus, [
        "hydration",
        "hydration status",
        "cap refill",
        "capillary refill",
        "oral intake",
        "reassess",
      ])
    ) {
      pushGuardrail(results, seen, {
        id: "pediatric_missing_hydration_reassessment",
        severity: "warning",
        titleKey: title("pediatricMissingHydrationReassessment"),
        descriptionKey: description("pediatricMissingHydrationReassessment"),
        suggestedSection: "physicalExam",
      });
    }
    if (!hasReturnPrecautionsDocumented(corpus)) {
      pushGuardrail(results, seen, {
        id: "pediatric_missing_caregiver_precautions",
        severity: "warning",
        titleKey: title("pediatricMissingCaregiverPrecautions"),
        descriptionKey: description("pediatricMissingCaregiverPrecautions"),
        suggestedSection: "impressionPlan",
      });
    }
    if (
      corpusHasTerms(corpus, ["vomiting", "diarrhea", "vomissements", "diarrhée"]) &&
      !corpusHasTerms(corpus, [
        "oral rehydration",
        "oral hydration",
        "po tolerance",
        "tolerating oral",
        "rehydration trial",
      ])
    ) {
      pushGuardrail(results, seen, {
        id: "pediatric_missing_po_reassessment",
        severity: "info",
        titleKey: title("pediatricMissingPoReassessment"),
        descriptionKey: description("pediatricMissingPoReassessment"),
        suggestedSection: "mdm",
      });
    }
  }

  if (clusterIsActive(dynamicClusters, "testicular_torsion")) {
    if (
      !corpusHasTerms(corpus, [
        "ultrasound",
        "scrotal ultrasound",
        "échographie",
        "u/s",
      ])
    ) {
      pushGuardrail(results, seen, {
        id: "torsion_missing_ultrasound",
        severity: "high",
        titleKey: title("torsionMissingUltrasound"),
        descriptionKey: description("torsionMissingUltrasound"),
        suggestedSection: "mdm",
      });
    }
    if (!corpusHasTerms(corpus, ["urology", "urolog", "urologie"])) {
      pushGuardrail(results, seen, {
        id: "torsion_missing_urology_consult",
        severity: "high",
        titleKey: title("torsionMissingUrologyConsult"),
        descriptionKey: description("torsionMissingUrologyConsult"),
        suggestedSection: "mdm",
      });
    }
    if (!hasDispositionDocumented(state, corpus)) {
      pushGuardrail(results, seen, {
        id: "torsion_missing_disposition",
        severity: "high",
        titleKey: title("torsionMissingDisposition"),
        descriptionKey: description("torsionMissingDisposition"),
        suggestedSection: "impressionPlan",
      });
    }
  }

  if (clusterIsActive(dynamicClusters, "ectopic_pregnancy")) {
    if (
      !corpusHasTerms(corpus, [
        "pregnancy test",
        "β-hcg",
        "beta-hcg",
        "b-hcg",
        "test de grossesse",
      ])
    ) {
      pushGuardrail(results, seen, {
        id: "ectopic_missing_pregnancy_testing",
        severity: "high",
        titleKey: title("ectopicMissingPregnancyTesting"),
        descriptionKey: description("ectopicMissingPregnancyTesting"),
        suggestedSection: "mdm",
      });
    }
    if (
      !corpusHasTerms(corpus, [
        "pelvic ultrasound",
        "ultrasound",
        "échographie pelvienne",
      ])
    ) {
      pushGuardrail(results, seen, {
        id: "ectopic_missing_ultrasound",
        severity: "high",
        titleKey: title("ectopicMissingUltrasound"),
        descriptionKey: description("ectopicMissingUltrasound"),
        suggestedSection: "mdm",
      });
    }
    if (
      !corpusHasTerms(corpus, ["ob/gyn", "ob gyn", "gynecology", "gynécologie"]) &&
      !hasDispositionDocumented(state, corpus)
    ) {
      pushGuardrail(results, seen, {
        id: "ectopic_missing_consult_disposition",
        severity: "warning",
        titleKey: title("ectopicMissingConsultDisposition"),
        descriptionKey: description("ectopicMissingConsultDisposition"),
        suggestedSection: "impressionPlan",
      });
    }
  }

  if (clusterIsActive(dynamicClusters, "psychiatric_safety")) {
    if (!corpusHasTerms(corpus, ["safety plan", "plan de sécurité", "safety precautions"])) {
      pushGuardrail(results, seen, {
        id: "psych_missing_safety_planning",
        severity: "high",
        titleKey: title("psychMissingSafetyPlanning"),
        descriptionKey: description("psychMissingSafetyPlanning"),
        suggestedSection: "mdm",
      });
    }
    if (!hasReassessmentDocumented(state, corpus)) {
      pushGuardrail(results, seen, {
        id: "psych_missing_reassessment",
        severity: "warning",
        titleKey: title("psychMissingReassessment"),
        descriptionKey: description("psychMissingReassessment"),
        suggestedSection: "physicalExam",
      });
    }
    if (
      !corpusHasTerms(corpus, [
        "psychiatric consultation",
        "psychiatric admission",
        "psychiatric transfer",
        "consultation psychiatrique",
      ]) &&
      !hasDispositionDocumented(state, corpus)
    ) {
      pushGuardrail(results, seen, {
        id: "psych_missing_consult_disposition",
        severity: "warning",
        titleKey: title("psychMissingConsultDisposition"),
        descriptionKey: description("psychMissingConsultDisposition"),
        suggestedSection: "impressionPlan",
      });
    }
  }

  if (clusterIsActive(dynamicClusters, "spine_neuro_red_flag")) {
    if (!hasReassessmentDocumented(state, corpus)) {
      pushGuardrail(results, seen, {
        id: "spine_missing_neuro_reassessment",
        severity: "high",
        titleKey: title("spineMissingNeuroReassessment"),
        descriptionKey: description("spineMissingNeuroReassessment"),
        suggestedSection: "physicalExam",
      });
    }
    if (
      !corpusHasTerms(corpus, [
        "mri",
        "spine imaging",
        "spine consultation",
        "spine consult",
        "irm",
      ])
    ) {
      pushGuardrail(results, seen, {
        id: "spine_missing_imaging_consult",
        severity: "high",
        titleKey: title("spineMissingImagingConsult"),
        descriptionKey: description("spineMissingImagingConsult"),
        suggestedSection: "mdm",
      });
    }
    if (!hasDispositionDocumented(state, corpus)) {
      pushGuardrail(results, seen, {
        id: "spine_missing_disposition",
        severity: "warning",
        titleKey: title("spineMissingDisposition"),
        descriptionKey: description("spineMissingDisposition"),
        suggestedSection: "impressionPlan",
      });
    }
  }

  if (!hasMdmDocumented(state)) {
    pushGuardrail(results, seen, {
      id: "general_missing_mdm",
      severity: "warning",
      titleKey: title("generalMissingMdm"),
      descriptionKey: description("generalMissingMdm"),
      suggestedSection: "mdm",
    });
  }

  if (HIGH_RISK_TEMPLATE_IDS.includes(templateId) && !hasReassessmentDocumented(state, corpus)) {
    const clusterReassessmentWarning = results.some(
      (item) => item.id.includes("reassessment") || item.id.includes("_exam") || item.id.includes("serial_exam")
    );
    if (!clusterReassessmentWarning) {
      pushGuardrail(results, seen, {
        id: "general_missing_reassessment",
        severity: "warning",
        titleKey: title("generalMissingReassessment"),
        descriptionKey: description("generalMissingReassessment"),
        suggestedSection: "physicalExam",
      });
    }
  }

  if (!hasDispositionDocumented(state, corpus)) {
    const clusterDispositionWarning = results.some((item) => item.id.includes("disposition"));
    if (!clusterDispositionWarning) {
      pushGuardrail(results, seen, {
        id: "general_missing_disposition",
        severity: "info",
        titleKey: title("generalMissingDisposition"),
        descriptionKey: description("generalMissingDisposition"),
        suggestedSection: "impressionPlan",
      });
    }
  }

  if (
    HIGH_RISK_TEMPLATE_IDS.includes(templateId) &&
    !hasReturnPrecautionsDocumented(corpus) &&
    !hasDispositionDocumented(state, corpus)
  ) {
    pushGuardrail(results, seen, {
      id: "general_missing_return_precautions",
      severity: "info",
      titleKey: title("generalMissingReturnPrecautions"),
      descriptionKey: description("generalMissingReturnPrecautions"),
      suggestedSection: "impressionPlan",
    });
  }

  return results.sort(
    (left, right) =>
      DOCUMENTATION_GUARDRAIL_SEVERITY_ORDER.indexOf(left.severity) -
      DOCUMENTATION_GUARDRAIL_SEVERITY_ORDER.indexOf(right.severity)
  );
}

export function documentationGuardrailsBlockSigning(_guardrails: DocumentationGuardrail[]): boolean {
  return false;
}
