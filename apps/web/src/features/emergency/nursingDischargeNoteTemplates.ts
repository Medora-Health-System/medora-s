/**
 * Versioned nursing discharge note templates and phrase chips.
 * Final clinician-edited note is the medical-record snapshot — not reconstructed from IDs alone.
 */

export const NURSING_DISCHARGE_NOTE_TEMPLATE_VERSION = "nd-note-v1" as const;

export type NursingDischargeNoteCategoryId =
  | "complete"
  | "clinical"
  | "teaching"
  | "understanding"
  | "mobility";

export type NursingDischargeNoteTemplateDef = {
  id: string;
  category: NursingDischargeNoteCategoryId;
  /** i18n key under nursingDischargeNotes.templates.<id> */
  en: string;
  fr: string;
};

export type NursingDischargeNotePhraseDef = {
  id: string;
  category: NursingDischargeNoteCategoryId;
  en: string;
  fr: string;
};

export const NURSING_DISCHARGE_NOTE_TEMPLATES: NursingDischargeNoteTemplateDef[] = [
  {
    id: "comprehensive_stable",
    category: "complete",
    en: `Patient discharged to home in stable condition. Discharge instructions were reviewed in detail with the patient. The patient was educated regarding the diagnosis, treatment provided during today's visit, prescribed medications, including dosage, frequency, purpose, and potential side effects, follow-up recommendations, activity restrictions, dietary instructions when applicable, and return precautions.

The patient was instructed to seek immediate medical attention or return to the Emergency Department for worsening symptoms, new or concerning symptoms, fever, increased pain, shortness of breath, chest pain, persistent vomiting, altered mental status, uncontrolled bleeding, or any other condition causing concern.

The patient verbalized understanding of all discharge instructions and was able to repeat the plan of care and return precautions. All questions were answered. The patient demonstrated understanding of medication instructions, follow-up appointments, and home-care recommendations.

The patient was reassessed before discharge and was alert and oriented to person, place, time, and situation. Respirations were even and unlabored, skin was warm and dry, and no acute distress was observed. Discharge vital signs were reviewed and documented.

The patient ambulated independently with a steady gait to the lobby without assistance. No dizziness, weakness, or gait instability was observed. Personal belongings were returned before departure.

The patient left the Emergency Department in stable condition with discharge paperwork and prescriptions, when applicable.`,
    fr: `Patient sorti à domicile en condition stable. Les consignes de sortie ont été passées en revue en détail avec le patient. Le patient a été informé du diagnostic, des soins prodigués lors de la visite, des médicaments prescrits (posologie, fréquence, indication et effets indésirables possibles), des recommandations de suivi, des restrictions d’activité, des consignes alimentaires le cas échéant, et des signes justifiant un retour.

Le patient a été informé de consulter immédiatement ou de revenir aux urgences en cas d’aggravation, de nouveaux symptômes préoccupants, de fièvre, d’augmentation de la douleur, de dyspnée, de douleur thoracique, de vomissements persistants, d’altération de l’état mental, de saignement non contrôlé, ou de tout autre motif d’inquiétude.

Le patient a verbalisé sa compréhension des consignes et a pu reformuler le plan de soins et les signes de retour. Toutes les questions ont été répondues. Le patient a démontré sa compréhension des médicaments, du suivi et des soins à domicile.

Le patient a été réévalué avant la sortie : orienté aux personnes, au lieu, au temps et à la situation. Respirations régulières et sans effort, peau chaude et sèche, sans détresse aiguë observée. Les signes vitaux de sortie ont été revus et documentés.

Le patient a marché de façon autonome jusqu’au hall avec une démarche stable, sans assistance. Aucun vertige, faiblesse ou instabilité de la marche n’a été observé. Les effets personnels ont été restitués avant le départ.

Le patient a quitté les urgences en condition stable avec les documents de sortie et les ordonnances, le cas échéant.`,
  },
  {
    id: "brief_stable_home",
    category: "complete",
    en: `Discharge instructions were reviewed with the patient, including diagnosis, medications, follow-up, and return precautions. The patient verbalized understanding, and all questions were answered. The patient was alert and oriented, with no acute distress noted. The patient ambulated to the lobby with a steady gait and was discharged home in stable condition.`,
    fr: `Les consignes de sortie ont été passées en revue avec le patient, y compris le diagnostic, les médicaments, le suivi et les signes de retour. Le patient a verbalisé sa compréhension et toutes les questions ont été répondues. Le patient était alerte et orienté, sans détresse aiguë. Il a marché jusqu’au hall avec une démarche stable et a été sorti à domicile en condition stable.`,
  },
  {
    id: "education_follow_up",
    category: "complete",
    en: `The patient was educated regarding the diagnosis, treatment plan, medications, follow-up care, and return precautions. The patient verbalized understanding and denied additional questions. The patient ambulated independently to the lobby with a steady gait and was discharged in stable condition.`,
    fr: `Le patient a été informé du diagnostic, du plan de traitement, des médicaments, du suivi et des signes de retour. Le patient a verbalisé sa compréhension et n’avait pas d’autres questions. Il a marché de façon autonome jusqu’au hall avec une démarche stable et a été sorti en condition stable.`,
  },
  {
    id: "home_care_understanding",
    category: "complete",
    en: `Discharge instructions were provided and reviewed. The patient demonstrated understanding of home care, prescribed medications, follow-up recommendations, and indications to return to the Emergency Department. The patient left ambulatory with a steady gait, in no acute distress, and in stable condition.`,
    fr: `Les consignes de sortie ont été fournies et passées en revue. Le patient a démontré sa compréhension des soins à domicile, des médicaments prescrits, des recommandations de suivi et des indications de retour aux urgences. Le patient est parti à pied avec une démarche stable, sans détresse aiguë, en condition stable.`,
  },
  {
    id: "reassessment_before_discharge",
    category: "complete",
    en: `The patient was reassessed before discharge. Discharge instructions and return precautions were reviewed. The patient verbalized understanding, and all questions were addressed. The patient ambulated without difficulty and was discharged home in stable condition.`,
    fr: `Le patient a été réévalué avant la sortie. Les consignes de sortie et les signes de retour ont été passés en revue. Le patient a verbalisé sa compréhension et toutes les questions ont été traitées. Le patient a marché sans difficulté et a été sorti à domicile en condition stable.`,
  },
  {
    id: "plan_of_care_agreement",
    category: "complete",
    en: `The diagnosis, medications, discharge instructions, and follow-up plan were reviewed with the patient. The patient verbalized understanding and agreed with the plan of care. The patient ambulated independently to the lobby with a steady gait and was stable at discharge.`,
    fr: `Le diagnostic, les médicaments, les consignes de sortie et le plan de suivi ont été passés en revue avec le patient. Le patient a verbalisé sa compréhension et accepté le plan de soins. Il a marché de façon autonome jusqu’au hall avec une démarche stable et était stable à la sortie.`,
  },
  {
    id: "clinically_stable",
    category: "complete",
    en: `The patient was alert and oriented, respirations were even and unlabored, and no acute distress was observed. Discharge instructions, follow-up recommendations, and return precautions were reviewed. The patient verbalized understanding and was discharged ambulatory in stable condition.`,
    fr: `Le patient était alerte et orienté, les respirations étaient régulières et sans effort, et aucune détresse aiguë n’a été observée. Les consignes de sortie, le suivi et les signes de retour ont été passés en revue. Le patient a verbalisé sa compréhension et a été sorti à pied en condition stable.`,
  },
  {
    id: "wheelchair_discharge",
    category: "complete",
    en: `The patient was discharged by wheelchair in stable condition. Discharge instructions, medications, follow-up recommendations, and return precautions were reviewed. The patient verbalized understanding, and all questions were answered. The patient departed with personal belongings and discharge paperwork.`,
    fr: `Le patient a été sorti en fauteuil roulant en condition stable. Les consignes de sortie, les médicaments, le suivi et les signes de retour ont été passés en revue. Le patient a verbalisé sa compréhension et toutes les questions ont été répondues. Le patient est parti avec ses effets personnels et les documents de sortie.`,
  },
  {
    id: "caregiver_discharge",
    category: "complete",
    en: `Discharge instructions were reviewed with the patient and caregiver. The diagnosis, medications, follow-up plan, home-care instructions, and return precautions were discussed. The patient and caregiver verbalized understanding. The patient was discharged in stable condition accompanied by the caregiver.`,
    fr: `Les consignes de sortie ont été passées en revue avec le patient et l’aidant. Le diagnostic, les médicaments, le plan de suivi, les soins à domicile et les signes de retour ont été discutés. Le patient et l’aidant ont verbalisé leur compréhension. Le patient a été sorti en condition stable accompagné de l’aidant.`,
  },
  {
    id: "pediatric_discharge",
    category: "complete",
    en: `Discharge instructions were reviewed with the parent or legal guardian, including diagnosis, medication dosing, follow-up, home care, and return precautions. The parent or guardian verbalized understanding, and all questions were answered. The patient was discharged in stable condition with the responsible adult.`,
    fr: `Les consignes de sortie ont été passées en revue avec le parent ou le tuteur légal, y compris le diagnostic, la posologie, le suivi, les soins à domicile et les signes de retour. Le parent ou tuteur a verbalisé sa compréhension et toutes les questions ont été répondues. Le patient a été sorti en condition stable avec l’adulte responsable.`,
  },
  {
    id: "interpreter_assisted",
    category: "complete",
    en: `Discharge instructions were reviewed using a qualified interpreter. The diagnosis, medications, follow-up recommendations, and return precautions were discussed. The patient verbalized understanding through teach-back, and all questions were answered.`,
    fr: `Les consignes de sortie ont été passées en revue avec un interprète qualifié. Le diagnostic, les médicaments, le suivi et les signes de retour ont été discutés. Le patient a verbalisé sa compréhension par reformulation (teach-back) et toutes les questions ont été répondues.`,
  },
  {
    id: "transfer",
    category: "complete",
    en: `The patient was transferred to the receiving facility in accordance with the documented transfer plan. Relevant records, results, and transfer documentation accompanied the patient. Handoff was completed with the receiving team. The patient departed with the designated transport service.`,
    fr: `Le patient a été transféré vers l’établissement destinataire conformément au plan de transfert documenté. Les dossiers, résultats et documents de transfert pertinents accompagnaient le patient. La transmission a été effectuée avec l’équipe réceptrice. Le patient est parti avec le service de transport désigné.`,
  },
  {
    id: "ama",
    category: "complete",
    en: `The patient elected to leave against medical advice after discussion of the recommended evaluation or treatment, potential risks, possible complications, and available alternatives. The patient demonstrated decision-making capacity and verbalized understanding of the risks. Return precautions were reviewed, and the patient was advised to return at any time for further evaluation.`,
    fr: `Le patient a choisi de quitter contre avis médical après discussion de l’évaluation ou du traitement recommandé, des risques potentiels, des complications possibles et des alternatives. Le patient a démontré une capacité de décision et verbalisé sa compréhension des risques. Les signes de retour ont été passés en revue et le patient a été invité à revenir à tout moment pour une nouvelle évaluation.`,
  },
  {
    id: "refusal",
    category: "complete",
    en: `The patient declined the recommended discharge process or component after explanation of its purpose, risks, benefits, and alternatives. The refusal was documented, and return precautions were provided when possible.`,
    fr: `Le patient a refusé le processus de sortie recommandé ou une de ses composantes après explication de son but, des risques, des bénéfices et des alternatives. Le refus a été documenté et les signes de retour ont été fournis lorsque possible.`,
  },
];

export const NURSING_DISCHARGE_NOTE_PHRASES: NursingDischargeNotePhraseDef[] = [
  { id: "ao_x4", category: "clinical", en: "Alert and oriented ×4.", fr: "Alerte et orienté ×4." },
  {
    id: "respirations_even",
    category: "clinical",
    en: "Respirations even and unlabored.",
    fr: "Respirations régulières et sans effort.",
  },
  {
    id: "no_acute_distress",
    category: "clinical",
    en: "No acute distress.",
    fr: "Pas de détresse aiguë.",
  },
  { id: "skin_warm_dry", category: "clinical", en: "Skin warm and dry.", fr: "Peau chaude et sèche." },
  { id: "pain_improved", category: "clinical", en: "Pain improved.", fr: "Douleur améliorée." },
  {
    id: "symptoms_improved",
    category: "clinical",
    en: "Symptoms improved.",
    fr: "Symptômes améliorés.",
  },
  {
    id: "vitals_reviewed",
    category: "clinical",
    en: "Vital signs reviewed.",
    fr: "Signes vitaux revus.",
  },
  {
    id: "stable_for_discharge",
    category: "clinical",
    en: "Stable for discharge per plan.",
    fr: "Stable pour la sortie selon le plan.",
  },
  {
    id: "diagnosis_reviewed",
    category: "teaching",
    en: "Diagnosis reviewed.",
    fr: "Diagnostic passé en revue.",
  },
  {
    id: "medication_instructions_reviewed",
    category: "teaching",
    en: "Medication instructions reviewed.",
    fr: "Consignes médicamenteuses passées en revue.",
  },
  {
    id: "prescriptions_reviewed",
    category: "teaching",
    en: "Prescriptions reviewed.",
    fr: "Ordonnances passées en revue.",
  },
  {
    id: "follow_up_reviewed",
    category: "teaching",
    en: "Follow-up reviewed.",
    fr: "Suivi passé en revue.",
  },
  {
    id: "return_precautions_reviewed",
    category: "teaching",
    en: "Return precautions reviewed.",
    fr: "Signes de retour passés en revue.",
  },
  {
    id: "activity_restrictions_reviewed",
    category: "teaching",
    en: "Activity restrictions reviewed.",
    fr: "Restrictions d’activité passées en revue.",
  },
  {
    id: "diet_instructions_reviewed",
    category: "teaching",
    en: "Diet instructions reviewed.",
    fr: "Consignes alimentaires passées en revue.",
  },
  {
    id: "wound_care_reviewed",
    category: "teaching",
    en: "Wound care reviewed.",
    fr: "Soins de plaie passés en revue.",
  },
  {
    id: "equipment_use_reviewed",
    category: "teaching",
    en: "Equipment use reviewed.",
    fr: "Utilisation du matériel passée en revue.",
  },
  {
    id: "written_instructions_provided",
    category: "teaching",
    en: "Written instructions provided.",
    fr: "Consignes écrites fournies.",
  },
  {
    id: "patient_verbalized_understanding",
    category: "understanding",
    en: "Patient verbalized understanding.",
    fr: "Le patient a verbalisé sa compréhension.",
  },
  {
    id: "teach_back_completed",
    category: "understanding",
    en: "Teach-back completed.",
    fr: "Reformulation (teach-back) effectuée.",
  },
  {
    id: "questions_answered",
    category: "understanding",
    en: "Questions answered.",
    fr: "Questions répondues.",
  },
  {
    id: "caregiver_verbalized_understanding",
    category: "understanding",
    en: "Caregiver verbalized understanding.",
    fr: "L’aidant a verbalisé sa compréhension.",
  },
  {
    id: "interpreter_used",
    category: "understanding",
    en: "Interpreter used.",
    fr: "Interprète utilisé.",
  },
  {
    id: "ambulated_independently",
    category: "mobility",
    en: "Ambulated independently.",
    fr: "Marche autonome.",
  },
  { id: "steady_gait", category: "mobility", en: "Steady gait.", fr: "Démarche stable." },
  {
    id: "wheelchair_to_lobby",
    category: "mobility",
    en: "Wheelchair to lobby.",
    fr: "Fauteuil roulant jusqu’au hall.",
  },
  {
    id: "assisted_by_family",
    category: "mobility",
    en: "Assisted by family/caregiver.",
    fr: "Assisté par la famille/aidant.",
  },
  {
    id: "transported_by_ems",
    category: "mobility",
    en: "Transported by EMS.",
    fr: "Transporté par les services d’urgence.",
  },
  {
    id: "belongings_returned",
    category: "mobility",
    en: "Personal belongings returned.",
    fr: "Effets personnels restitués.",
  },
  {
    id: "paperwork_provided",
    category: "mobility",
    en: "Paperwork provided.",
    fr: "Documents fournis.",
  },
  {
    id: "prescriptions_provided",
    category: "mobility",
    en: "Prescriptions provided.",
    fr: "Ordonnances fournies.",
  },
];

export function getNursingDischargeNoteText(
  id: string,
  language: string
): string | null {
  const tpl = NURSING_DISCHARGE_NOTE_TEMPLATES.find((x) => x.id === id);
  if (tpl) return language === "fr" ? tpl.fr : tpl.en;
  const phrase = NURSING_DISCHARGE_NOTE_PHRASES.find((x) => x.id === id);
  if (phrase) return language === "fr" ? phrase.fr : phrase.en;
  return null;
}

/** Append template/phrase text without duplicating an identical paragraph already present. */
export function composeNursingDischargeNoteAppend(
  currentNote: string,
  addition: string
): string {
  const add = addition.trim();
  if (!add) return currentNote;
  const cur = currentNote.trim();
  if (!cur) return add;
  if (cur.includes(add)) return currentNote;
  return `${cur}\n\n${add}`;
}

export type NursingDischargeNoteStructuredMeta = {
  templateVersion: typeof NURSING_DISCHARGE_NOTE_TEMPLATE_VERSION;
  selectedTemplateIds: string[];
  selectedPhraseIds: string[];
};

export function emptyNursingDischargeNoteStructuredMeta(): NursingDischargeNoteStructuredMeta {
  return {
    templateVersion: NURSING_DISCHARGE_NOTE_TEMPLATE_VERSION,
    selectedTemplateIds: [],
    selectedPhraseIds: [],
  };
}
