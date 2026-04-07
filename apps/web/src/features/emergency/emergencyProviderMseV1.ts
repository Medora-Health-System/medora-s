/**
 * ER Provider MSE / Medical Evaluation V1 — stored under `Encounter.nursingAssessment.erProviderMseV1` (Json).
 * Persists via existing PATCH /encounters/:id (merge with other nursingAssessment keys). No backend migration.
 * Does not touch physicianEvalV1 / nursingEvalV1 blobs; only adds this namespaced key.
 */

export const ER_PROVIDER_MSE_V1_KEY = "erProviderMseV1" as const;

export type ErProviderMseSignature = {
  savedAt: string;
  savedByDisplayName: string;
};

/** Form state (all strings for controlled inputs). */
export type ErProviderMseForm = {
  chiefConcern: string;
  hpiNarrative: string;
  onsetTimingContext: string;
  associatedSymptoms: string;
  severityKeyConcern: string;
  focusedImpression: string;
  importantPositives: string;
  importantNegatives: string;
  redFlagsText: string;
  differentialAssessmentText: string;
  examGeneralAppearance: string;
  examNeuroMental: string;
  examHeent: string;
  examCardiac: string;
  examRespiratory: string;
  examAbdomen: string;
  examMusculoskeletal: string;
  examSkin: string;
  examPsychBehavior: string;
  examReassessmentExtra: string;
  mdmWorkingAssessment: string;
  mdmPlanSummary: string;
  mdmImmediateActionsRationale: string;
  mdmConsultsDiscussed: string;
  mdmAdmitObserveDischarge: string;
  mdmProviderAddendum: string;
};

export function emptyErProviderMseForm(): ErProviderMseForm {
  return {
    chiefConcern: "",
    hpiNarrative: "",
    onsetTimingContext: "",
    associatedSymptoms: "",
    severityKeyConcern: "",
    focusedImpression: "",
    importantPositives: "",
    importantNegatives: "",
    redFlagsText: "",
    differentialAssessmentText: "",
    examGeneralAppearance: "",
    examNeuroMental: "",
    examHeent: "",
    examCardiac: "",
    examRespiratory: "",
    examAbdomen: "",
    examMusculoskeletal: "",
    examSkin: "",
    examPsychBehavior: "",
    examReassessmentExtra: "",
    mdmWorkingAssessment: "",
    mdmPlanSummary: "",
    mdmImmediateActionsRationale: "",
    mdmConsultsDiscussed: "",
    mdmAdmitObserveDischarge: "",
    mdmProviderAddendum: "",
  };
}

export type ErProviderMseStored = {
  chiefConcern: string;
  hpiNarrative: string;
  onsetTimingContext: string;
  associatedSymptoms: string;
  severityKeyConcern: string;
  focusedImpression: string;
  importantPositives: string;
  importantNegatives: string;
  redFlagsText: string;
  differentialAssessmentText: string;
  examGeneralAppearance: string;
  examNeuroMental: string;
  examHeent: string;
  examCardiac: string;
  examRespiratory: string;
  examAbdomen: string;
  examMusculoskeletal: string;
  examSkin: string;
  examPsychBehavior: string;
  examReassessmentExtra: string;
  mdmWorkingAssessment: string;
  mdmPlanSummary: string;
  mdmImmediateActionsRationale: string;
  mdmConsultsDiscussed: string;
  mdmAdmitObserveDischarge: string;
  mdmProviderAddendum: string;
  signature?: ErProviderMseSignature;
};

const MAX_SHORT = 2000;
const MAX_MED = 4000;
const MAX_LONG = 8000;

function str(v: unknown, max: number): string {
  const s = typeof v === "string" ? v : "";
  return s.trim().slice(0, max);
}

export function erProviderMseFormFromEncounter(nursingAssessment: unknown): ErProviderMseForm {
  const e = emptyErProviderMseForm();
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) return e;
  const raw = (nursingAssessment as Record<string, unknown>)[ER_PROVIDER_MSE_V1_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return e;
  const o = raw as Record<string, unknown>;
  e.chiefConcern = str(o.chiefConcern, MAX_MED);
  e.hpiNarrative = str(o.hpiNarrative, MAX_LONG);
  e.onsetTimingContext = str(o.onsetTimingContext, MAX_MED);
  e.associatedSymptoms = str(o.associatedSymptoms, MAX_MED);
  e.severityKeyConcern = str(o.severityKeyConcern, MAX_SHORT);
  e.focusedImpression = str(o.focusedImpression, MAX_MED);
  e.importantPositives = str(o.importantPositives, MAX_MED);
  e.importantNegatives = str(o.importantNegatives, MAX_MED);
  e.redFlagsText = str(o.redFlagsText, MAX_MED);
  e.differentialAssessmentText = str(o.differentialAssessmentText, MAX_LONG);
  e.examGeneralAppearance = str(o.examGeneralAppearance, MAX_MED);
  e.examNeuroMental = str(o.examNeuroMental, MAX_MED);
  e.examHeent = str(o.examHeent, MAX_MED);
  e.examCardiac = str(o.examCardiac, MAX_MED);
  e.examRespiratory = str(o.examRespiratory, MAX_MED);
  e.examAbdomen = str(o.examAbdomen, MAX_MED);
  e.examMusculoskeletal = str(o.examMusculoskeletal, MAX_MED);
  e.examSkin = str(o.examSkin, MAX_MED);
  e.examPsychBehavior = str(o.examPsychBehavior, MAX_MED);
  e.examReassessmentExtra = str(o.examReassessmentExtra, MAX_LONG);
  e.mdmWorkingAssessment = str(o.mdmWorkingAssessment, MAX_LONG);
  e.mdmPlanSummary = str(o.mdmPlanSummary, MAX_LONG);
  e.mdmImmediateActionsRationale = str(o.mdmImmediateActionsRationale, MAX_LONG);
  e.mdmConsultsDiscussed = str(o.mdmConsultsDiscussed, MAX_MED);
  e.mdmAdmitObserveDischarge = str(o.mdmAdmitObserveDischarge, MAX_MED);
  e.mdmProviderAddendum = str(o.mdmProviderAddendum, MAX_LONG);
  return e;
}

function formToStored(form: ErProviderMseForm, signature: ErProviderMseSignature): ErProviderMseStored {
  return {
    chiefConcern: form.chiefConcern.trim().slice(0, MAX_MED),
    hpiNarrative: form.hpiNarrative.trim().slice(0, MAX_LONG),
    onsetTimingContext: form.onsetTimingContext.trim().slice(0, MAX_MED),
    associatedSymptoms: form.associatedSymptoms.trim().slice(0, MAX_MED),
    severityKeyConcern: form.severityKeyConcern.trim().slice(0, MAX_SHORT),
    focusedImpression: form.focusedImpression.trim().slice(0, MAX_MED),
    importantPositives: form.importantPositives.trim().slice(0, MAX_MED),
    importantNegatives: form.importantNegatives.trim().slice(0, MAX_MED),
    redFlagsText: form.redFlagsText.trim().slice(0, MAX_MED),
    differentialAssessmentText: form.differentialAssessmentText.trim().slice(0, MAX_LONG),
    examGeneralAppearance: form.examGeneralAppearance.trim().slice(0, MAX_MED),
    examNeuroMental: form.examNeuroMental.trim().slice(0, MAX_MED),
    examHeent: form.examHeent.trim().slice(0, MAX_MED),
    examCardiac: form.examCardiac.trim().slice(0, MAX_MED),
    examRespiratory: form.examRespiratory.trim().slice(0, MAX_MED),
    examAbdomen: form.examAbdomen.trim().slice(0, MAX_MED),
    examMusculoskeletal: form.examMusculoskeletal.trim().slice(0, MAX_MED),
    examSkin: form.examSkin.trim().slice(0, MAX_MED),
    examPsychBehavior: form.examPsychBehavior.trim().slice(0, MAX_MED),
    examReassessmentExtra: form.examReassessmentExtra.trim().slice(0, MAX_LONG),
    mdmWorkingAssessment: form.mdmWorkingAssessment.trim().slice(0, MAX_LONG),
    mdmPlanSummary: form.mdmPlanSummary.trim().slice(0, MAX_LONG),
    mdmImmediateActionsRationale: form.mdmImmediateActionsRationale.trim().slice(0, MAX_LONG),
    mdmConsultsDiscussed: form.mdmConsultsDiscussed.trim().slice(0, MAX_MED),
    mdmAdmitObserveDischarge: form.mdmAdmitObserveDischarge.trim().slice(0, MAX_MED),
    mdmProviderAddendum: form.mdmProviderAddendum.trim().slice(0, MAX_LONG),
    signature,
  };
}

function fieldHasContent(s: string): boolean {
  return Boolean(s.trim());
}

/** True if stored object has any clinical content (signature alone does not count). */
export function storedErProviderMseHasClinicalContent(s: ErProviderMseStored): boolean {
  return (
    fieldHasContent(s.chiefConcern) ||
    fieldHasContent(s.hpiNarrative) ||
    fieldHasContent(s.onsetTimingContext) ||
    fieldHasContent(s.associatedSymptoms) ||
    fieldHasContent(s.severityKeyConcern) ||
    fieldHasContent(s.focusedImpression) ||
    fieldHasContent(s.importantPositives) ||
    fieldHasContent(s.importantNegatives) ||
    fieldHasContent(s.redFlagsText) ||
    fieldHasContent(s.differentialAssessmentText) ||
    fieldHasContent(s.examGeneralAppearance) ||
    fieldHasContent(s.examNeuroMental) ||
    fieldHasContent(s.examHeent) ||
    fieldHasContent(s.examCardiac) ||
    fieldHasContent(s.examRespiratory) ||
    fieldHasContent(s.examAbdomen) ||
    fieldHasContent(s.examMusculoskeletal) ||
    fieldHasContent(s.examSkin) ||
    fieldHasContent(s.examPsychBehavior) ||
    fieldHasContent(s.examReassessmentExtra) ||
    fieldHasContent(s.mdmWorkingAssessment) ||
    fieldHasContent(s.mdmPlanSummary) ||
    fieldHasContent(s.mdmImmediateActionsRationale) ||
    fieldHasContent(s.mdmConsultsDiscussed) ||
    fieldHasContent(s.mdmAdmitObserveDischarge) ||
    fieldHasContent(s.mdmProviderAddendum)
  );
}

/**
 * Merge ER provider MSE blob into full nursingAssessment for PATCH.
 * Preserves erNursingReassessmentV1, nursingEvalV1, physicianEvalV1, etc.
 */
export function mergeErProviderMseIntoNursingAssessment(
  previousNursingAssessment: unknown,
  form: ErProviderMseForm,
  signature: ErProviderMseSignature
): Record<string, unknown> {
  const base =
    previousNursingAssessment && typeof previousNursingAssessment === "object" && !Array.isArray(previousNursingAssessment)
      ? { ...(previousNursingAssessment as Record<string, unknown>) }
      : {};
  const stored = formToStored(form, signature);
  if (storedErProviderMseHasClinicalContent(stored)) {
    base[ER_PROVIDER_MSE_V1_KEY] = stored;
  } else {
    delete base[ER_PROVIDER_MSE_V1_KEY];
  }
  return base;
}

export type ErProviderMsePreviewSection = { id: string; title: string; lines: string[] };

export type ErProviderMsePreviewModel = {
  sections: ErProviderMsePreviewSection[];
  oneLineSummary: string;
};

function pushLine(lines: string[], label: string, value: string) {
  const v = value.trim();
  if (v) lines.push(`${label} : ${v.length > 600 ? `${v.slice(0, 600)}…` : v}`);
}

/** Rule-based preview from form only — no inference, no AI. */
export function buildErProviderMsePreviewModel(form: ErProviderMseForm): ErProviderMsePreviewModel {
  const sections: ErProviderMsePreviewSection[] = [];

  const pres: string[] = [];
  pushLine(pres, "Motif / préoccupation principale", form.chiefConcern);
  pushLine(pres, "HPI / récit court (urgences)", form.hpiNarrative);
  pushLine(pres, "Début / chronologie / contexte", form.onsetTimingContext);
  pushLine(pres, "Symptômes associés", form.associatedSymptoms);
  pushLine(pres, "Gravité / préoccupation clé", form.severityKeyConcern);
  if (pres.length) sections.push({ id: "presentation", title: "Présentation", lines: pres });

  const review: string[] = [];
  pushLine(review, "Impression ciblée", form.focusedImpression);
  pushLine(review, "Positifs importants", form.importantPositives);
  pushLine(review, "Négatifs importants", form.importantNegatives);
  pushLine(review, "Signaux d’alerte", form.redFlagsText);
  pushLine(review, "Différentiel / synthèse d’évaluation (texte libre)", form.differentialAssessmentText);
  if (review.length) sections.push({ id: "review", title: "Revue ciblée (médecin)", lines: review });

  const exam: string[] = [];
  pushLine(exam, "Apparence générale", form.examGeneralAppearance);
  pushLine(exam, "Neuro / statut mental (aperçu)", form.examNeuroMental);
  pushLine(exam, "Tête / cou / ORL", form.examHeent);
  pushLine(exam, "Cardiovasculaire", form.examCardiac);
  pushLine(exam, "Respiratoire", form.examRespiratory);
  pushLine(exam, "Abdomen", form.examAbdomen);
  pushLine(exam, "Musculo-squelettique", form.examMusculoskeletal);
  pushLine(exam, "Peau", form.examSkin);
  pushLine(exam, "Psych / comportement", form.examPsychBehavior);
  pushLine(exam, "Réévaluation / examen complémentaire", form.examReassessmentExtra);
  if (exam.length) sections.push({ id: "exam", title: "Examen (aperçu)", lines: exam });

  const mdm: string[] = [];
  pushLine(mdm, "Évaluation de travail", form.mdmWorkingAssessment);
  pushLine(mdm, "Plan (résumé)", form.mdmPlanSummary);
  pushLine(mdm, "Actions immédiates / justification", form.mdmImmediateActionsRationale);
  pushLine(mdm, "Consultations évoquées", form.mdmConsultsDiscussed);
  pushLine(mdm, "Hospitalisation / observation / sortie (réflexion)", form.mdmAdmitObserveDischarge);
  pushLine(mdm, "Addendum médecin", form.mdmProviderAddendum);
  if (mdm.length) sections.push({ id: "mdm", title: "Décision médicale (résumé)", lines: mdm });

  const parts: string[] = [];
  const cc = form.chiefConcern.trim();
  if (cc) parts.push(cc.length > 120 ? `${cc.slice(0, 120)}…` : cc);
  const hpi = form.hpiNarrative.trim();
  if (hpi) parts.push(`HPI : ${hpi.length > 160 ? `${hpi.slice(0, 160)}…` : hpi}`);
  const wa = form.mdmWorkingAssessment.trim();
  if (wa) parts.push(`Évaluation : ${wa.length > 140 ? `${wa.slice(0, 140)}…` : wa}`);

  const oneLineSummary =
    parts.length > 0 ? `Synthèse clinique (urgences) : ${parts.join(" · ")}` : "";

  if (sections.length === 0 && !oneLineSummary) {
    return {
      sections: [{ id: "empty", title: "Aperçu", lines: ["Aucune donnée saisie pour l’aperçu."] }],
      oneLineSummary: "",
    };
  }

  return { sections, oneLineSummary };
}
