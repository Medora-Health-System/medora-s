/**
 * ED.HOSP.1F — Nursing documentation + handoff completion (zero-schema).
 *
 * Legal signed notes: EncounterNote (noteType NURSING).
 * Operational handoff completion: erHandoffV1.
 * Unsigned drafts: Encounter.nursingAssessment.edNursingDocumentationV1 (not a legal record).
 *
 * Does not create a parallel NursingNote / handoffNoteJson store.
 */

export const ED_NURSING_DOCUMENTATION_V1_KEY = "edNursingDocumentationV1" as const;

export type EdNursingLocale = "en" | "fr";
export type EdNursingNoteKind = "NURSING" | "HANDOFF";
export type EdNursingHandoffReceivingKind = "INTERNAL" | "EXTERNAL";
export type EdNursingHandoffStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type EdNursingHandoffMethod =
  | "BEDSIDE"
  | "TELEPHONE"
  | "SECURE_ELECTRONIC"
  | "VERBAL"
  | "OTHER";

export type EdNursingPathway =
  | "OBSERVATION"
  | "ADMISSION"
  | "TRANSFER"
  | "AMA"
  | "ELOPEMENT"
  | "GENERAL";

export const ED_NURSING_TEMPLATE_IDS = [
  "GENERAL_REASSESSMENT",
  "GENERAL_MEDICATION_RESPONSE",
  "GENERAL_PROVIDER_NOTIFICATION",
  "GENERAL_CRITICAL_RESULT",
  "GENERAL_IV_FLUIDS",
  "GENERAL_BLOOD_STARTED",
  "GENERAL_BLOOD_COMPLETED",
  "OBS_STANDARD_HANDOFF",
  "ADM_STANDARD_HANDOFF",
  "ICU_CRITICAL_HANDOFF",
  "TRANSFER_STANDARD_HANDOFF",
  "TRANSFER_ALS_HANDOFF",
  "AMA_STANDARD",
  "ELOPEMENT_STANDARD",
] as const;

export type EdNursingTemplateId = (typeof ED_NURSING_TEMPLATE_IDS)[number];

export const ED_NURSING_STATEMENT_IDS = [
  "IV_ACCESS",
  "IV_FLUIDS",
  "MEDICATIONS",
  "BLOOD_GIVEN",
  "INFUSION_RUNNING",
  "OXYGEN",
  "CRITICAL_RESULT",
  "PENDING_RESULTS",
  "PENDING_LAB",
  "PENDING_IMAGING",
  "FALL_RISK",
  "ISOLATION",
  "PAIN",
  "FAMILY_UPDATED",
  "BELONGINGS",
  "EMS_REPORT",
  "PROVIDER_NOTIFIED",
  "VASOPRESSOR",
  "BLOOD_TRANSFUSION",
  "CRITICAL_LAB",
  "AIRWAY",
  "MULTIPLE_LINES",
  "ALS_TRANSPORT",
  "RECORDS",
  "CRITICAL_CONDITION",
  "IV_REMOVED",
  "REFUSED_AMA_FORM",
  "LEFT_BEFORE_INSTRUCTIONS",
  "FAMILY_PRESENT",
  "IV_CONCERN",
  "ATTEMPTED_PHONE",
  "NO_ANSWER",
  "PATIENT_REACHED",
  "SECURITY_NOTIFIED",
  "ABNORMAL_VITALS",
  "HIGH_FALL_RISK",
] as const;

export type EdNursingStatementId = (typeof ED_NURSING_STATEMENT_IDS)[number];

export const ED_NURSING_HANDOFF_METHODS = [
  "BEDSIDE",
  "TELEPHONE",
  "SECURE_ELECTRONIC",
  "VERBAL",
  "OTHER",
] as const;

export type EdNursingHandoffFields = {
  receivingKind: EdNursingHandoffReceivingKind;
  receivingNurseUserId?: string;
  receivingNurseName: string;
  receivingFacilityName?: string;
  receivingUnit?: string;
  receivingPhone?: string;
  receivingRole?: string;
  method?: EdNursingHandoffMethod;
  methodOther?: string;
};

export type EdNursingDraft = {
  draftId: string;
  kind: EdNursingNoteKind;
  templateId?: EdNursingTemplateId;
  templateBody: string;
  statementIds: EdNursingStatementId[];
  statementBodies: Partial<Record<EdNursingStatementId, string>>;
  freeText: string;
  eventAt: string;
  savedAt: string;
  authorUserId: string;
  handoff?: EdNursingHandoffFields;
};

export type EdNursingSignedMeta = {
  noteId: string;
  kind: EdNursingNoteKind;
  templateId?: EdNursingTemplateId;
  eventAt: string;
  enteredAt: string;
  signedAt: string;
  authorUserId: string;
  canceledByDisplayName?: string;
  voidReasonText?: string;
};

export type EdNursingDocumentationV1 = {
  drafts?: EdNursingDraft[];
  signedMeta?: EdNursingSignedMeta[];
};

const MAX_TEXT = 8000;
const MAX_NAME = 256;
const MAX_ISO = 40;
const MAX_DRAFTS = 8;
const MAX_SIGNED_META = 80;

function trimStr(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.slice(0, max);
}

function trimUuid(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return undefined;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t)) {
    return undefined;
  }
  return t;
}

export function isEdNursingTemplateId(v: unknown): v is EdNursingTemplateId {
  return typeof v === "string" && (ED_NURSING_TEMPLATE_IDS as readonly string[]).includes(v);
}

export function isEdNursingStatementId(v: unknown): v is EdNursingStatementId {
  return typeof v === "string" && (ED_NURSING_STATEMENT_IDS as readonly string[]).includes(v);
}

export function edNursingHandoffApplies(pathway: EdNursingPathway | string | null | undefined): boolean {
  const p = String(pathway ?? "").trim().toUpperCase();
  return p === "OBSERVATION" || p === "ADMISSION" || p === "TRANSFER";
}

export function edNursingDefaultTemplates(
  kind: EdNursingNoteKind,
  pathway: EdNursingPathway | string | null | undefined
): EdNursingTemplateId[] {
  const p = String(pathway ?? "").trim().toUpperCase();
  if (kind === "HANDOFF") {
    if (p === "OBSERVATION") return ["OBS_STANDARD_HANDOFF"];
    if (p === "ADMISSION") return ["ADM_STANDARD_HANDOFF", "ICU_CRITICAL_HANDOFF"];
    if (p === "TRANSFER") return ["TRANSFER_STANDARD_HANDOFF", "TRANSFER_ALS_HANDOFF"];
    return ["OBS_STANDARD_HANDOFF", "ADM_STANDARD_HANDOFF", "ICU_CRITICAL_HANDOFF", "TRANSFER_STANDARD_HANDOFF"];
  }
  if (p === "AMA") return ["AMA_STANDARD", ...GENERAL_TEMPLATES];
  if (p === "ELOPEMENT") return ["ELOPEMENT_STANDARD", ...GENERAL_TEMPLATES];
  return [...GENERAL_TEMPLATES, "AMA_STANDARD", "ELOPEMENT_STANDARD"];
}

const GENERAL_TEMPLATES: EdNursingTemplateId[] = [
  "GENERAL_REASSESSMENT",
  "GENERAL_MEDICATION_RESPONSE",
  "GENERAL_PROVIDER_NOTIFICATION",
  "GENERAL_CRITICAL_RESULT",
  "GENERAL_IV_FLUIDS",
  "GENERAL_BLOOD_STARTED",
  "GENERAL_BLOOD_COMPLETED",
];

export const ED_NURSING_TEMPLATE_KIND: Record<EdNursingTemplateId, EdNursingNoteKind> = {
  GENERAL_REASSESSMENT: "NURSING",
  GENERAL_MEDICATION_RESPONSE: "NURSING",
  GENERAL_PROVIDER_NOTIFICATION: "NURSING",
  GENERAL_CRITICAL_RESULT: "NURSING",
  GENERAL_IV_FLUIDS: "NURSING",
  GENERAL_BLOOD_STARTED: "NURSING",
  GENERAL_BLOOD_COMPLETED: "NURSING",
  OBS_STANDARD_HANDOFF: "HANDOFF",
  ADM_STANDARD_HANDOFF: "HANDOFF",
  ICU_CRITICAL_HANDOFF: "HANDOFF",
  TRANSFER_STANDARD_HANDOFF: "HANDOFF",
  TRANSFER_ALS_HANDOFF: "HANDOFF",
  AMA_STANDARD: "NURSING",
  ELOPEMENT_STANDARD: "NURSING",
};

export const ED_NURSING_TEMPLATE_BODIES: Record<EdNursingLocale, Record<EdNursingTemplateId, string>> = {
  en: {
    GENERAL_REASSESSMENT:
      "Patient reassessed. Current condition and vital signs reviewed. Patient updated regarding plan of care. Safety measures maintained.",
    GENERAL_MEDICATION_RESPONSE:
      "Nursing documentation regarding medication response. Confirm administration and observed response before signing.",
    GENERAL_PROVIDER_NOTIFICATION:
      "Nursing documentation regarding provider communication. Confirm notification before signing.",
    GENERAL_CRITICAL_RESULT:
      "Nursing documentation regarding a critical result. Confirm the result and any communication before signing.",
    GENERAL_IV_FLUIDS:
      "Nursing documentation regarding IV fluids. Confirm infusion status before signing.",
    GENERAL_BLOOD_STARTED:
      "Nursing documentation regarding blood product administration. Confirm start of transfusion before signing.",
    GENERAL_BLOOD_COMPLETED:
      "Nursing documentation regarding blood product administration. Confirm completion before signing.",
    OBS_STANDARD_HANDOFF:
      "Report given to receiving RN regarding the patient's ED course, current condition, assessment findings, and plan of care as documented in the chart.",
    ADM_STANDARD_HANDOFF:
      "Report given to receiving RN regarding the patient's ED course, current condition, admitting diagnosis, and admission plan as documented in the chart.",
    ICU_CRITICAL_HANDOFF:
      "Report given to receiving ICU RN regarding the patient's ED presentation, current clinical condition, significant assessment findings, and ongoing interventions as documented in the chart.",
    TRANSFER_STANDARD_HANDOFF:
      "Report given to receiving RN at the receiving facility regarding the patient's ED presentation, current condition, ED course, and ongoing treatment requirements as documented in the chart.",
    TRANSFER_ALS_HANDOFF:
      "Report given to receiving RN and transport team regarding the patient's ED presentation, current condition, ED course, and ongoing treatment requirements as documented in the chart.",
    AMA_STANDARD: "Patient informed staff of intention to leave against medical advice.",
    ELOPEMENT_STANDARD:
      "Patient noted to be absent from assigned ED treatment area. Immediate department area checked and patient was not located. Patient left prior to completion of planned evaluation or treatment.",
  },
  fr: {
    GENERAL_REASSESSMENT:
      "Patient réévalué. État actuel et signes vitaux revus. Patient informé du plan de soins. Mesures de sécurité maintenues.",
    GENERAL_MEDICATION_RESPONSE:
      "Documentation infirmière concernant la réponse médicamenteuse. Confirmer l’administration et la réponse observée avant de signer.",
    GENERAL_PROVIDER_NOTIFICATION:
      "Documentation infirmière concernant une communication au médecin. Confirmer l’avis avant de signer.",
    GENERAL_CRITICAL_RESULT:
      "Documentation infirmière concernant un résultat critique. Confirmer le résultat et toute communication avant de signer.",
    GENERAL_IV_FLUIDS:
      "Documentation infirmière concernant les solutés IV. Confirmer l’état de la perfusion avant de signer.",
    GENERAL_BLOOD_STARTED:
      "Documentation infirmière concernant l’administration de produit sanguin. Confirmer le début de transfusion avant de signer.",
    GENERAL_BLOOD_COMPLETED:
      "Documentation infirmière concernant l’administration de produit sanguin. Confirmer la fin avant de signer.",
    OBS_STANDARD_HANDOFF:
      "Rapport donné à l’infirmier(ère) d’accueil concernant le séjour aux urgences, l’état actuel, les constatations d’évaluation et le plan de soins selon le dossier.",
    ADM_STANDARD_HANDOFF:
      "Rapport donné à l’infirmier(ère) d’accueil concernant le séjour aux urgences, l’état actuel, le diagnostic d’admission et le plan d’admission selon le dossier.",
    ICU_CRITICAL_HANDOFF:
      "Rapport donné à l’infirmier(ère) d’USI d’accueil concernant la présentation aux urgences, l’état clinique actuel, les constatations d’évaluation importantes et les interventions en cours selon le dossier.",
    TRANSFER_STANDARD_HANDOFF:
      "Rapport donné à l’infirmier(ère) d’accueil de l’établissement receveur concernant la présentation aux urgences, l’état actuel, le séjour aux urgences et les besoins de traitement en cours selon le dossier.",
    TRANSFER_ALS_HANDOFF:
      "Rapport donné à l’infirmier(ère) d’accueil et à l’équipe de transport concernant la présentation aux urgences, l’état actuel, le séjour aux urgences et les besoins de traitement en cours selon le dossier.",
    AMA_STANDARD: "Le patient a informé le personnel de son intention de quitter contre avis médical.",
    ELOPEMENT_STANDARD:
      "Patient constaté absent de la zone de traitement assignée aux urgences. La zone immédiate du service a été vérifiée et le patient n’a pas été localisé. Le patient a quitté avant la fin de l’évaluation ou du traitement prévu.",
  },
};

export const ED_NURSING_STATEMENT_BODIES: Record<EdNursingLocale, Record<EdNursingStatementId, string>> = {
  en: {
    IV_ACCESS: "Receiving RN informed of current vascular access and documented line status.",
    IV_FLUIDS:
      "IV fluids administered in the ED as ordered. IV remains patent without documented signs of infiltration.",
    MEDICATIONS: "Receiving RN informed of medications administered in the ED and relevant medication response.",
    BLOOD_GIVEN:
      "Blood product administered in the ED as ordered. Receiving RN informed of blood product administration, patient response, and any remaining transfusion requirements.",
    INFUSION_RUNNING:
      "Patient transferred with ordered infusion in progress. Receiving RN informed of infusion, current rate, vascular access, and remaining therapy.",
    OXYGEN: "Receiving RN informed of the patient's current oxygen requirement and respiratory support.",
    CRITICAL_RESULT:
      "Critical result received and reported to provider. Receiving RN informed of the critical result and subsequent interventions.",
    PENDING_RESULTS: "Receiving RN notified of pending diagnostic results at time of transition from the ED.",
    PENDING_LAB: "Receiving RN informed of pending laboratory results.",
    PENDING_IMAGING: "Receiving RN informed of pending imaging results.",
    FALL_RISK: "Receiving RN informed of the patient's documented fall risk and current fall precautions.",
    ISOLATION: "Receiving RN informed of current isolation precautions.",
    PAIN: "Receiving RN informed of current pain assessment, interventions provided, and documented response.",
    FAMILY_UPDATED: "Family or support person updated regarding the plan of care as documented.",
    BELONGINGS: "Patient belongings status reviewed with receiving staff as documented.",
    EMS_REPORT: "EMS transport team given bedside report.",
    PROVIDER_NOTIFIED: "ED provider notified of patient's stated intention to leave.",
    VASOPRESSOR:
      "Receiving RN informed of current vasopressor infusion, documented dose, titration parameters, hemodynamic response, and vascular access.",
    BLOOD_TRANSFUSION:
      "Blood transfusion remains in progress at time of handoff. Receiving RN informed of blood product, documented start time, administered volume, patient response, and required monitoring.",
    CRITICAL_LAB:
      "Critical laboratory result reported to provider. Receiving RN informed of the result and documented interventions.",
    AIRWAY: "Receiving RN informed of current airway status and respiratory support requirements.",
    MULTIPLE_LINES: "Vascular access reviewed with receiving RN, including documented line locations and status.",
    ALS_TRANSPORT:
      "EMS transport team given bedside report. Patient transferred with required monitoring and ongoing therapy as documented.",
    RECORDS:
      "Available ED documentation, medication administration record, laboratory results, imaging information, and transfer documentation were made available to the receiving facility.",
    CRITICAL_CONDITION:
      "Receiving RN and transport team informed of the patient's documented critical condition and ongoing monitoring or resuscitative requirements.",
    IV_REMOVED: "Peripheral IV removed prior to departure. Catheter intact and bleeding controlled.",
    REFUSED_AMA_FORM: "AMA acknowledgment was offered and the patient declined to sign.",
    LEFT_BEFORE_INSTRUCTIONS: "Patient left the department before written instructions could be provided.",
    FAMILY_PRESENT: "Family or support person was present during the documented AMA process.",
    IV_CONCERN:
      "Patient may have left the department with vascular access in place. Provider and charge nurse notified and appropriate follow-up initiated.",
    ATTEMPTED_PHONE: "Attempt made to contact patient using telephone number on file.",
    NO_ANSWER: "Telephone contact attempted; no answer.",
    PATIENT_REACHED: "Patient contacted and advised to return to the ED for continued evaluation or treatment.",
    SECURITY_NOTIFIED: "Security notified regarding patient elopement.",
    ABNORMAL_VITALS: "Receiving RN informed of abnormal vital signs and current monitoring requirements.",
    HIGH_FALL_RISK: "Receiving RN informed of the patient's documented fall risk and current fall precautions.",
  },
  fr: {
    IV_ACCESS: "Infirmier(ère) d’accueil informé(e) de l’accès vasculaire actuel et de l’état documenté des voies.",
    IV_FLUIDS:
      "Solutés IV administrés aux urgences selon l’ordonnance. Voie IV perméable, sans signes documentés d’infiltration.",
    MEDICATIONS:
      "Infirmier(ère) d’accueil informé(e) des médicaments administrés aux urgences et de la réponse médicamenteuse pertinente.",
    BLOOD_GIVEN:
      "Produit sanguin administré aux urgences selon l’ordonnance. Infirmier(ère) d’accueil informé(e) de l’administration, de la réponse du patient et des besoins transfusionnels restants.",
    INFUSION_RUNNING:
      "Patient transféré avec perfusion prescrite en cours. Infirmier(ère) d’accueil informé(e) de la perfusion, du débit actuel, de l’accès vasculaire et du traitement restant.",
    OXYGEN: "Infirmier(ère) d’accueil informé(e) du besoin actuel en oxygène et du soutien respiratoire.",
    CRITICAL_RESULT:
      "Résultat critique reçu et signalé au médecin. Infirmier(ère) d’accueil informé(e) du résultat critique et des interventions subséquentes.",
    PENDING_RESULTS: "Infirmier(ère) d’accueil informé(e) des résultats diagnostiques en attente au moment de la transition.",
    PENDING_LAB: "Infirmier(ère) d’accueil informé(e) des résultats de laboratoire en attente.",
    PENDING_IMAGING: "Infirmier(ère) d’accueil informé(e) des résultats d’imagerie en attente.",
    FALL_RISK: "Infirmier(ère) d’accueil informé(e) du risque de chute documenté et des précautions actuelles.",
    ISOLATION: "Infirmier(ère) d’accueil informé(e) des précautions d’isolement actuelles.",
    PAIN: "Infirmier(ère) d’accueil informé(e) de l’évaluation actuelle de la douleur, des interventions et de la réponse documentée.",
    FAMILY_UPDATED: "Famille ou personne de soutien informée du plan de soins selon la documentation.",
    BELONGINGS: "État des effets personnels revu avec le personnel d’accueil selon la documentation.",
    EMS_REPORT: "Rapport au lit donné à l’équipe de transport EMS.",
    PROVIDER_NOTIFIED: "Médecin des urgences informé de l’intention exprimée du patient de quitter.",
    VASOPRESSOR:
      "Infirmier(ère) d’accueil informé(e) de la perfusion de vasopresseur en cours, de la dose documentée, des paramètres de titration, de la réponse hémodynamique et de l’accès vasculaire.",
    BLOOD_TRANSFUSION:
      "Transfusion sanguine encore en cours au moment de la passation. Infirmier(ère) d’accueil informé(e) du produit, de l’heure de début documentée, du volume administré, de la réponse du patient et de la surveillance requise.",
    CRITICAL_LAB:
      "Résultat de laboratoire critique signalé au médecin. Infirmier(ère) d’accueil informé(e) du résultat et des interventions documentées.",
    AIRWAY: "Infirmier(ère) d’accueil informé(e) de l’état actuel des voies aériennes et du soutien respiratoire requis.",
    MULTIPLE_LINES:
      "Accès vasculaire revu avec l’infirmier(ère) d’accueil, y compris l’emplacement et l’état documentés des voies.",
    ALS_TRANSPORT:
      "Rapport au lit donné à l’équipe de transport EMS. Patient transféré avec la surveillance et le traitement en cours selon la documentation.",
    RECORDS:
      "La documentation des urgences disponible, le relevé d’administration des médicaments, les résultats de laboratoire, l’imagerie et la documentation de transfert ont été mis à disposition de l’établissement receveur.",
    CRITICAL_CONDITION:
      "Infirmier(ère) d’accueil et équipe de transport informés de l’état critique documenté du patient et des besoins de surveillance ou de réanimation en cours.",
    IV_REMOVED: "Voie veineuse périphérique retirée avant le départ. Cathéter intact et saignement contrôlé.",
    REFUSED_AMA_FORM: "Le formulaire de départ contre avis médical a été proposé et le patient a refusé de le signer.",
    LEFT_BEFORE_INSTRUCTIONS: "Le patient a quitté le service avant que les consignes écrites puissent être fournies.",
    FAMILY_PRESENT: "Un membre de la famille ou une personne de soutien était présent pendant le processus documenté de départ contre avis médical.",
    IV_CONCERN:
      "Le patient a pu quitter le service avec un accès vasculaire en place. Médecin et infirmier(ère) responsable informés et suivi approprié amorcé.",
    ATTEMPTED_PHONE: "Tentative de joindre le patient au numéro de téléphone au dossier.",
    NO_ANSWER: "Contact téléphonique tenté ; pas de réponse.",
    PATIENT_REACHED: "Patient joint et avisé de revenir aux urgences pour poursuivre l’évaluation ou le traitement.",
    SECURITY_NOTIFIED: "Sécurité informée de la fugue du patient.",
    ABNORMAL_VITALS: "Infirmier(ère) d’accueil informé(e) des signes vitaux anormaux et des exigences actuelles de surveillance.",
    HIGH_FALL_RISK: "Infirmier(ère) d’accueil informé(e) du risque de chute documenté et des précautions actuelles.",
  },
};

export const ED_NURSING_STATEMENTS_FOR_TEMPLATE: Record<EdNursingTemplateId, EdNursingStatementId[]> = {
  GENERAL_REASSESSMENT: ["CRITICAL_RESULT", "OXYGEN", "PAIN", "FAMILY_UPDATED"],
  GENERAL_MEDICATION_RESPONSE: ["MEDICATIONS", "CRITICAL_RESULT"],
  GENERAL_PROVIDER_NOTIFICATION: ["PROVIDER_NOTIFIED", "CRITICAL_RESULT", "ABNORMAL_VITALS"],
  GENERAL_CRITICAL_RESULT: ["CRITICAL_RESULT", "CRITICAL_LAB", "PROVIDER_NOTIFIED"],
  GENERAL_IV_FLUIDS: ["IV_FLUIDS", "IV_ACCESS"],
  GENERAL_BLOOD_STARTED: ["BLOOD_GIVEN", "BLOOD_TRANSFUSION"],
  GENERAL_BLOOD_COMPLETED: ["BLOOD_GIVEN"],
  OBS_STANDARD_HANDOFF: [
    "IV_FLUIDS",
    "CRITICAL_RESULT",
    "OXYGEN",
    "PENDING_RESULTS",
    "IV_ACCESS",
    "MEDICATIONS",
  ],
  ADM_STANDARD_HANDOFF: [
    "BLOOD_GIVEN",
    "INFUSION_RUNNING",
    "CRITICAL_RESULT",
    "HIGH_FALL_RISK",
    "ABNORMAL_VITALS",
    "PAIN",
    "ISOLATION",
    "PENDING_LAB",
    "PENDING_IMAGING",
    "OXYGEN",
  ],
  ICU_CRITICAL_HANDOFF: ["VASOPRESSOR", "BLOOD_TRANSFUSION", "CRITICAL_LAB", "AIRWAY", "MULTIPLE_LINES"],
  TRANSFER_STANDARD_HANDOFF: ["ALS_TRANSPORT", "INFUSION_RUNNING", "RECORDS", "CRITICAL_CONDITION", "CRITICAL_RESULT"],
  TRANSFER_ALS_HANDOFF: ["ALS_TRANSPORT", "INFUSION_RUNNING", "RECORDS", "CRITICAL_CONDITION"],
  AMA_STANDARD: ["IV_REMOVED", "REFUSED_AMA_FORM", "LEFT_BEFORE_INSTRUCTIONS", "FAMILY_PRESENT", "PROVIDER_NOTIFIED"],
  ELOPEMENT_STANDARD: [
    "IV_CONCERN",
    "ATTEMPTED_PHONE",
    "NO_ANSWER",
    "PATIENT_REACHED",
    "PENDING_RESULTS",
    "SECURITY_NOTIFIED",
  ],
};

export const ED_NURSING_CHIP_STATEMENTS: EdNursingStatementId[] = [
  "IV_ACCESS",
  "IV_FLUIDS",
  "MEDICATIONS",
  "BLOOD_GIVEN",
  "INFUSION_RUNNING",
  "OXYGEN",
  "CRITICAL_RESULT",
  "PENDING_LAB",
  "PENDING_IMAGING",
  "FALL_RISK",
  "ISOLATION",
  "PAIN",
  "FAMILY_UPDATED",
  "BELONGINGS",
  "EMS_REPORT",
  "PROVIDER_NOTIFIED",
];

export function edNursingTemplateBody(id: EdNursingTemplateId, locale: EdNursingLocale): string {
  return ED_NURSING_TEMPLATE_BODIES[locale][id];
}

export function edNursingStatementBody(id: EdNursingStatementId, locale: EdNursingLocale): string {
  return ED_NURSING_STATEMENT_BODIES[locale][id];
}

export function insertEdNursingStatement(
  ids: readonly EdNursingStatementId[],
  id: EdNursingStatementId
): EdNursingStatementId[] {
  if (ids.includes(id)) return [...ids];
  return [...ids, id];
}

export function removeEdNursingStatement(
  ids: readonly EdNursingStatementId[],
  id: EdNursingStatementId
): EdNursingStatementId[] {
  return ids.filter((x) => x !== id);
}

export function composeEdNursingNarrative(input: {
  templateBody?: string;
  statementIds?: readonly EdNursingStatementId[];
  statementBodies?: Partial<Record<EdNursingStatementId, string>>;
  freeText?: string;
  locale?: EdNursingLocale;
}): string {
  const parts: string[] = [];
  const template = String(input.templateBody ?? "").trim();
  if (template) parts.push(template);
  const locale = input.locale ?? "fr";
  for (const id of input.statementIds ?? []) {
    const custom = String(input.statementBodies?.[id] ?? "").trim();
    const text = custom || edNursingStatementBody(id, locale);
    if (text) parts.push(text);
  }
  const free = String(input.freeText ?? "").trim();
  if (free) parts.push(free);
  return parts.join("\n\n").slice(0, ENCOUNTER_NOTE_BODY_SOFT_MAX);
}

/** Leave room for event-time header on sign. */
const ENCOUNTER_NOTE_BODY_SOFT_MAX = 11000;

export function formatEdNursingEventTimeLine(eventAt: string, locale: EdNursingLocale): string {
  const d = new Date(eventAt);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return locale === "en" ? `Event time: ${stamp}` : `Heure de l’événement : ${stamp}`;
}

export function composeEdNursingSignedBody(input: {
  narrative: string;
  eventAt: string;
  locale: EdNursingLocale;
}): string {
  const header = formatEdNursingEventTimeLine(input.eventAt, input.locale);
  const narrative = String(input.narrative ?? "").trim();
  const body = header ? `${header}\n\n${narrative}` : narrative;
  return body.slice(0, 12000);
}

export function isEdNursingLateEntry(eventAt: string | undefined, signedAt: string | undefined): boolean {
  if (!eventAt || !signedAt) return false;
  const e = new Date(eventAt).getTime();
  const s = new Date(signedAt).getTime();
  if (Number.isNaN(e) || Number.isNaN(s)) return false;
  return e + 60_000 < s;
}

export function emptyEdNursingDraft(input: {
  kind: EdNursingNoteKind;
  authorUserId: string;
  now?: Date;
}): EdNursingDraft {
  const now = input.now ?? new Date();
  const iso = now.toISOString();
  return {
    draftId: input.kind === "HANDOFF" ? "handoff" : "nursing",
    kind: input.kind,
    templateBody: "",
    statementIds: [],
    statementBodies: {},
    freeText: "",
    eventAt: iso,
    savedAt: iso,
    authorUserId: input.authorUserId,
    handoff:
      input.kind === "HANDOFF"
        ? {
            receivingKind: "INTERNAL",
            receivingNurseName: "",
          }
        : undefined,
  };
}

export function applyEdNursingTemplateToDraft(
  draft: EdNursingDraft,
  templateId: EdNursingTemplateId,
  locale: EdNursingLocale
): EdNursingDraft {
  return {
    ...draft,
    templateId,
    templateBody: edNursingTemplateBody(templateId, locale),
  };
}

export function canCompleteEdNursingHandoff(handoff: EdNursingHandoffFields | undefined): {
  ok: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!handoff) {
    return { ok: false, missing: ["receivingNurseName", "method"] };
  }
  if (!handoff.receivingNurseName.trim()) missing.push("receivingNurseName");
  if (!handoff.method) missing.push("method");
  if (handoff.receivingKind === "EXTERNAL") {
    if (!String(handoff.receivingFacilityName ?? "").trim()) missing.push("receivingFacilityName");
  }
  if (handoff.receivingKind === "INTERNAL") {
    if (!handoff.receivingNurseUserId && !handoff.receivingNurseName.trim()) {
      missing.push("receivingNurseName");
    }
  }
  return { ok: missing.length === 0, missing };
}

export function edNursingAmaIsDistinctFromElopement(): boolean {
  return (
    ED_NURSING_TEMPLATE_BODIES.en.AMA_STANDARD !== ED_NURSING_TEMPLATE_BODIES.en.ELOPEMENT_STANDARD &&
    ED_NURSING_TEMPLATE_BODIES.fr.AMA_STANDARD !== ED_NURSING_TEMPLATE_BODIES.fr.ELOPEMENT_STANDARD
  );
}

export type EdHandoffChartFacts = {
  patient?: string;
  mrn?: string;
  disposition?: string;
  destination?: string;
  admittingProvider?: string;
  chiefComplaint?: string;
  diagnosis?: string;
  allergies?: string[];
  latestVitals?: string;
  oxygen?: string;
  ivAccess?: string;
  activeInfusions?: string;
  medicationsAdministered?: string;
  bloodAdministered?: string;
  criticalResults?: string;
  pendingLabs?: string;
  pendingImaging?: string;
  isolation?: string;
  fallRisk?: string;
  belongings?: string;
  currentCondition?: string;
};

/**
 * Display-only chart facts. Never converts ORDERED → administered,
 * blood ORDERED → transfused, or pending diagnostics → completed.
 */
export function projectEdHandoffChartFacts(input: {
  patient?: string | null;
  mrn?: string | null;
  disposition?: string | null;
  destination?: string | null;
  admittingProvider?: string | null;
  chiefComplaint?: string | null;
  diagnosis?: string | null;
  allergies?: string[] | null;
  latestVitals?: string | null;
  oxygen?: string | null;
  ivAccess?: string | null;
  documentedInfusions?: string | null;
  documentedMedicationsAdministered?: string | null;
  documentedBloodAdministered?: string | null;
  criticalResults?: string | null;
  pendingLabs?: string | null;
  pendingImaging?: string | null;
  isolation?: string | null;
  fallRisk?: string | null;
  belongings?: string | null;
  currentCondition?: string | null;
  medicationOrders?: unknown;
  bloodOrders?: unknown;
  pendingDiagnosticOrders?: unknown;
}): EdHandoffChartFacts {
  const pick = (v: string | null | undefined) => {
    const t = String(v ?? "").trim();
    return t || undefined;
  };
  void input.medicationOrders;
  void input.bloodOrders;
  void input.pendingDiagnosticOrders;
  const allergies = (input.allergies ?? []).map((a) => String(a).trim()).filter(Boolean);
  return {
    patient: pick(input.patient),
    mrn: pick(input.mrn),
    disposition: pick(input.disposition),
    destination: pick(input.destination),
    admittingProvider: pick(input.admittingProvider),
    chiefComplaint: pick(input.chiefComplaint),
    diagnosis: pick(input.diagnosis),
    allergies: allergies.length ? allergies : undefined,
    latestVitals: pick(input.latestVitals),
    oxygen: pick(input.oxygen),
    ivAccess: pick(input.ivAccess),
    activeInfusions: pick(input.documentedInfusions),
    medicationsAdministered: pick(input.documentedMedicationsAdministered),
    bloodAdministered: pick(input.documentedBloodAdministered),
    criticalResults: pick(input.criticalResults),
    pendingLabs: pick(input.pendingLabs),
    pendingImaging: pick(input.pendingImaging),
    isolation: pick(input.isolation),
    fallRisk: pick(input.fallRisk),
    belongings: pick(input.belongings),
    currentCondition: pick(input.currentCondition),
  };
}

export function readEdNursingDocumentationV1(nursingAssessment: unknown): EdNursingDocumentationV1 {
  const out: EdNursingDocumentationV1 = {};
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) {
    return out;
  }
  const raw = (nursingAssessment as Record<string, unknown>)[ED_NURSING_DOCUMENTATION_V1_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.drafts)) {
    const drafts: EdNursingDraft[] = [];
    for (const row of o.drafts.slice(0, MAX_DRAFTS)) {
      const d = parseDraft(row);
      if (d) drafts.push(d);
    }
    if (drafts.length) out.drafts = drafts;
  }
  if (Array.isArray(o.signedMeta)) {
    const signedMeta: EdNursingSignedMeta[] = [];
    for (const row of o.signedMeta.slice(0, MAX_SIGNED_META)) {
      const m = parseSignedMeta(row);
      if (m) signedMeta.push(m);
    }
    if (signedMeta.length) out.signedMeta = signedMeta;
  }
  return out;
}

function parseDraft(row: unknown): EdNursingDraft | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const o = row as Record<string, unknown>;
  const kind = o.kind === "HANDOFF" ? "HANDOFF" : o.kind === "NURSING" ? "NURSING" : null;
  if (!kind) return null;
  const draftId = trimStr(o.draftId, 40) || (kind === "HANDOFF" ? "handoff" : "nursing");
  const authorUserId = trimUuid(o.authorUserId) || trimStr(o.authorUserId, 80);
  if (!authorUserId) return null;
  const eventAt = trimStr(o.eventAt, MAX_ISO);
  const savedAt = trimStr(o.savedAt, MAX_ISO);
  if (!eventAt || !savedAt) return null;
  const statementIds: EdNursingStatementId[] = [];
  if (Array.isArray(o.statementIds)) {
    for (const id of o.statementIds) {
      if (isEdNursingStatementId(id) && !statementIds.includes(id)) statementIds.push(id);
    }
  }
  const statementBodies: Partial<Record<EdNursingStatementId, string>> = {};
  if (o.statementBodies && typeof o.statementBodies === "object" && !Array.isArray(o.statementBodies)) {
    for (const [k, v] of Object.entries(o.statementBodies as Record<string, unknown>)) {
      if (isEdNursingStatementId(k)) {
        const t = trimStr(v, MAX_TEXT);
        if (t) statementBodies[k] = t;
      }
    }
  }
  const templateId = isEdNursingTemplateId(o.templateId) ? o.templateId : undefined;
  const draft: EdNursingDraft = {
    draftId,
    kind,
    templateId,
    templateBody: trimStr(o.templateBody, MAX_TEXT) ?? "",
    statementIds,
    statementBodies,
    freeText: trimStr(o.freeText, MAX_TEXT) ?? "",
    eventAt,
    savedAt,
    authorUserId,
  };
  if (kind === "HANDOFF") {
    draft.handoff = parseHandoffFields(o.handoff) ?? {
      receivingKind: "INTERNAL",
      receivingNurseName: "",
    };
  }
  return draft;
}

function parseHandoffFields(raw: unknown): EdNursingHandoffFields | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const receivingKind = o.receivingKind === "EXTERNAL" ? "EXTERNAL" : "INTERNAL";
  const method = (ED_NURSING_HANDOFF_METHODS as readonly string[]).includes(String(o.method ?? ""))
    ? (o.method as EdNursingHandoffMethod)
    : undefined;
  return {
    receivingKind,
    receivingNurseUserId: trimUuid(o.receivingNurseUserId),
    receivingNurseName: trimStr(o.receivingNurseName, MAX_NAME) ?? "",
    receivingFacilityName: trimStr(o.receivingFacilityName, MAX_NAME),
    receivingUnit: trimStr(o.receivingUnit, MAX_NAME),
    receivingPhone: trimStr(o.receivingPhone, 64),
    receivingRole: trimStr(o.receivingRole, 80),
    method,
    methodOther: trimStr(o.methodOther, 200),
  };
}

function parseSignedMeta(row: unknown): EdNursingSignedMeta | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const o = row as Record<string, unknown>;
  const noteId = trimUuid(o.noteId) || trimStr(o.noteId, 80);
  const authorUserId = trimUuid(o.authorUserId) || trimStr(o.authorUserId, 80);
  const eventAt = trimStr(o.eventAt, MAX_ISO);
  const enteredAt = trimStr(o.enteredAt, MAX_ISO);
  const signedAt = trimStr(o.signedAt, MAX_ISO);
  const kind = o.kind === "HANDOFF" ? "HANDOFF" : "NURSING";
  if (!noteId || !authorUserId || !eventAt || !enteredAt || !signedAt) return null;
  return {
    noteId,
    kind,
    templateId: isEdNursingTemplateId(o.templateId) ? o.templateId : undefined,
    eventAt,
    enteredAt,
    signedAt,
    authorUserId,
    canceledByDisplayName: trimStr(o.canceledByDisplayName, MAX_NAME),
    voidReasonText: trimStr(o.voidReasonText, 500),
  };
}

export function mergeEdNursingDocumentationV1(
  previousNursingAssessment: unknown,
  next: EdNursingDocumentationV1
): Record<string, unknown> {
  const base =
    previousNursingAssessment &&
    typeof previousNursingAssessment === "object" &&
    !Array.isArray(previousNursingAssessment)
      ? { ...(previousNursingAssessment as Record<string, unknown>) }
      : {};
  const persisted: Record<string, unknown> = {};
  if (next.drafts?.length) persisted.drafts = next.drafts.slice(0, MAX_DRAFTS);
  if (next.signedMeta?.length) persisted.signedMeta = next.signedMeta.slice(0, MAX_SIGNED_META);
  if (Object.keys(persisted).length === 0) {
    delete base[ED_NURSING_DOCUMENTATION_V1_KEY];
  } else {
    base[ED_NURSING_DOCUMENTATION_V1_KEY] = persisted;
  }
  return base;
}

export function upsertEdNursingDraft(
  store: EdNursingDocumentationV1,
  draft: EdNursingDraft
): EdNursingDocumentationV1 {
  const drafts = [...(store.drafts ?? []).filter((d) => d.draftId !== draft.draftId), draft].slice(
    0,
    MAX_DRAFTS
  );
  return { ...store, drafts };
}

export function removeEdNursingDraft(
  store: EdNursingDocumentationV1,
  draftId: string
): EdNursingDocumentationV1 {
  return { ...store, drafts: (store.drafts ?? []).filter((d) => d.draftId !== draftId) };
}

export function appendEdNursingSignedMeta(
  store: EdNursingDocumentationV1,
  meta: EdNursingSignedMeta
): EdNursingDocumentationV1 {
  const signedMeta = [...(store.signedMeta ?? []).filter((m) => m.noteId !== meta.noteId), meta].slice(
    -MAX_SIGNED_META
  );
  return { ...store, signedMeta };
}

export function patchEdNursingSignedMeta(
  store: EdNursingDocumentationV1,
  noteId: string,
  patch: Partial<Pick<EdNursingSignedMeta, "canceledByDisplayName" | "voidReasonText">>
): EdNursingDocumentationV1 {
  return {
    ...store,
    signedMeta: (store.signedMeta ?? []).map((m) => (m.noteId === noteId ? { ...m, ...patch } : m)),
  };
}

export function findEdNursingDraft(
  store: EdNursingDocumentationV1,
  draftId: string
): EdNursingDraft | undefined {
  return store.drafts?.find((d) => d.draftId === draftId);
}

export function findEdNursingSignedMeta(
  store: EdNursingDocumentationV1,
  noteId: string
): EdNursingSignedMeta | undefined {
  return store.signedMeta?.find((m) => m.noteId === noteId);
}

export function edNursingHandoffStatusFromErHandoff(handoff: {
  reportGiven?: boolean;
  documentationNoteId?: string | null;
  handoffStatus?: string | null;
  receivingNurseName?: string | null;
  handoffNote?: string | null;
}): EdNursingHandoffStatus {
  if (handoff.reportGiven === true && (handoff.documentationNoteId || handoff.handoffStatus === "COMPLETED")) {
    return "COMPLETED";
  }
  if (handoff.handoffStatus === "COMPLETED" && handoff.reportGiven === true) return "COMPLETED";
  if (handoff.handoffStatus === "IN_PROGRESS") return "IN_PROGRESS";
  if (handoff.receivingNurseName?.trim() || handoff.handoffNote?.trim()) return "IN_PROGRESS";
  return "NOT_STARTED";
}

/** Destination / placement alone never completes handoff. */
export function edNursingHandoffCompleteRequiresDocumentation(input: {
  destinationPresent?: boolean;
  reportGiven?: boolean;
  documentationNoteId?: string | null;
}): boolean {
  void input.destinationPresent;
  return input.reportGiven === true && Boolean(String(input.documentationNoteId ?? "").trim());
}
