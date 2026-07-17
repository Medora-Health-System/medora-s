/**
 * Phase 18 (Commit 2) — psychiatric / behavioral discharge suggested text.
 * Follows providerDischargeTemplateBehavioralHealthGovernance forbidden phrases.
 * High-acuity post-acute families use clinician-selected disposition language only.
 */
import {
  localizedSuggestedText,
  type ProviderDischargeTemplateSuggestedText,
} from "./providerDischargeTemplateLocale";

const BH_MED_EN = "Take medicines only as prescribed or directed during this visit.";
const BH_MED_FR =
  "Prenez les médicaments uniquement selon la prescription ou les indications reçues pendant cette visite.";

const BH_RETURN_PRECAUTIONS_EN =
  "Return immediately for thoughts of self-harm, thoughts of harming others, worsening anxiety, worsening depression, hallucinations, confusion, severe agitation, or withdrawal symptoms. Call 911 or use the crisis line when concerned. Use crisis resources as directed.";

const BH_RETURN_PRECAUTIONS_FR =
  "Retournez immédiatement pour des idées de se faire du mal, des idées de faire du mal à autrui, une aggravation de l'anxiété, une aggravation de la dépression, des hallucinations, de la confusion, de l'agitation sévère ou des symptômes de sevrage. Appelez le 911 ou utilisez la ligne de crise si inquiétude. Utilisez les ressources de crise selon les directives.";

const BH_SUBSTANCE_RESOURCES_EN =
  " Follow up with behavioral health and substance use treatment or recovery resources as directed. Avoid alcohol or substances as directed.";

const BH_SUBSTANCE_RESOURCES_FR =
  " Suivez le suivi en santé comportementale et les ressources de traitement des troubles liés aux substances ou de rétablissement selon les directives. Évitez l'alcool ou les substances selon les indications reçues.";

const POST_ACUTE_DISPOSITION_EN =
  "Follow the disposition plan and follow-up instructions selected by your clinician during this visit. This note provides advisory precautionary guidance only.";

const POST_ACUTE_DISPOSITION_FR =
  "Suivez le plan de disposition et les consignes de suivi choisis par votre clinicien lors de cette visite. Cette note fournit uniquement des conseils préventifs consultatifs.";

function bhPostAcute(
  enTopic: string,
  frTopic: string,
  enInstructions: string,
  frInstructions: string,
  extraReturnEn = "",
  extraReturnFr = "",
): ProviderDischargeTemplateSuggestedText {
  return localizedSuggestedText(
    {
      description: `You were evaluated in the emergency department ${enTopic}. Your emergency care information is private and confidential. Symptoms and safety concerns may change after an emergency visit.`,
      diagnosisInstructions: `${enInstructions} ${POST_ACUTE_DISPOSITION_EN}`,
      medicationTreatment: BH_MED_EN,
      returnPrecautions: `${BH_RETURN_PRECAUTIONS_EN}${extraReturnEn}`,
    },
    {
      description: `Vous avez été pris en charge aux urgences ${frTopic}. Vos informations de soins aux urgences sont privées et confidentielles. Les symptômes et les préoccupations de sécurité peuvent évoluer après une visite aux urgences.`,
      diagnosisInstructions: `${frInstructions} ${POST_ACUTE_DISPOSITION_FR}`,
      medicationTreatment: BH_MED_FR,
      returnPrecautions: `${BH_RETURN_PRECAUTIONS_FR}${extraReturnFr}`,
    },
  );
}

export const SUICIDAL_IDEATION_POST_ASSESSMENT_V1_SUGGESTED_TEXT = bhPostAcute(
  "for concerns related to suicidal ideation after assessment",
  "pour des préoccupations liées à des idées suicidaires après évaluation",
  "Use crisis resources as directed. Arrange behavioral health follow-up as directed. This note does not document suicide risk assessment findings.",
  "Utilisez les ressources de crise selon les directives. Organisez un suivi en santé comportementale selon les directives. Cette note ne documente pas les résultats d'une évaluation du risque suicidaire.",
);

export const SELF_HARM_POST_ASSESSMENT_V1_SUGGESTED_TEXT = bhPostAcute(
  "for intentional self-harm or non-suicidal self-injury after assessment",
  "pour automutilation intentionnelle ou automutilation non suicidaire après évaluation",
  "Non-suicidal self-injury is not the same as a suicide attempt unless documented otherwise. Use crisis resources and wound care instructions as directed.",
  "L'automutilation non suicidaire n'est pas la même chose qu'une tentative de suicide sauf documentation contraire. Utilisez les ressources de crise et les consignes de soins des plaies selon les directives.",
);

export const SUICIDE_ATTEMPT_POST_ACUTE_V1_SUGGESTED_TEXT = bhPostAcute(
  "after a suicide attempt or self-inflicted injury requiring acute care",
  "après une tentative de suicide ou une lésion auto-infligée nécessitant des soins aigus",
  "Follow wound care, toxicology, and behavioral health instructions from your clinician. Arrange close follow-up as directed.",
  "Suivez les consignes de soins des plaies, de toxicologie et de santé comportementale de votre clinicien. Organisez un suivi rapproché selon les directives.",
  " Return immediately for new self-harm, overdose, or worsening safety concerns.",
  " Retournez immédiatement en cas de nouvelle automutilation, surdosage ou aggravation des préoccupations de sécurité.",
);

export const DEPRESSION_CRISIS_V1_SUGGESTED_TEXT = bhPostAcute(
  "during a period of worsening depression or emotional distress",
  "pendant une période d'aggravation de la dépression ou de détresse émotionnelle",
  "Take medicines only as directed. Use crisis resources as directed. Follow up with behavioral health when recommended.",
  "Prenez les médicaments uniquement selon les indications reçues. Utilisez les ressources de crise selon les directives. Suivez le suivi en santé comportementale lorsque recommandé.",
);

export const ANXIETY_PANIC_CRISIS_V1_SUGGESTED_TEXT = bhPostAcute(
  "for anxiety or panic symptoms",
  "pour de l'anxiété ou des signes de crise d'angoisse",
  "Use calming strategies and medicines only as directed. Return for chest pain, shortness of breath, or symptoms that feel different from prior panic episodes.",
  "Utilisez des stratégies apaisantes et les médicaments uniquement selon les indications reçues. Reconsultez en cas de douleur thoracique, d'essoufflement ou de signes différents de vos épisodes d'angoisse habituels.",
);

export const ACUTE_STRESS_REACTION_V1_SUGGESTED_TEXT = bhPostAcute(
  "for an acute stress reaction or trauma-related distress",
  "pour une réaction aiguë au stress ou une détresse liée au traumatisme",
  "Use grounding and support strategies as directed. Follow behavioral health or crisis follow-up as directed.",
  "Utilisez des stratégies d'ancrage et de soutien selon les directives. Suivez le suivi en santé comportementale ou de crise selon les directives.",
);

export const PSYCHOSIS_POST_ACUTE_V1_SUGGESTED_TEXT = bhPostAcute(
  "for psychosis or severe behavioral symptoms after acute stabilization",
  "pour psychose ou symptômes comportementaux sévères après stabilisation aiguë",
  "Follow medication and supervision instructions from your clinician. Do not stop medicines without clinician guidance.",
  "Suivez les consignes de médication et de supervision de votre clinicien. N'arrêtez pas les médicaments sans l'avis d'un clinicien.",
  " Return immediately for worsening hallucinations, agitation, or safety concerns.",
  " Retournez immédiatement en cas d'aggravation des hallucinations, de l'agitation ou des préoccupations de sécurité.",
);

export const MANIA_POST_ACUTE_V1_SUGGESTED_TEXT = bhPostAcute(
  "for mania or elevated mood with dangerous behavior after acute stabilization",
  "pour manie ou humeur élevée avec comportement dangereux après stabilisation aiguë",
  "Maintain sleep, medication, and supervision plans as directed. Avoid alcohol and substances as directed.",
  "Respectez les plans de sommeil, de médication et de supervision selon les directives. Évitez l'alcool et les substances selon les indications reçues.",
);

export const BEHAVIORAL_AGITATION_POST_ACUTE_V1_SUGGESTED_TEXT = bhPostAcute(
  "for severe agitation after acute stabilization",
  "pour agitation sévère après stabilisation aiguë",
  "Follow de-escalation, medication, and supervision instructions from your clinician.",
  "Suivez les consignes de désescalade, de médication et de supervision de votre clinicien.",
);

export const SUBSTANCE_INDUCED_BEHAVIORAL_CRISIS_V1_SUGGESTED_TEXT = localizedSuggestedText(
  {
    description:
      "You were evaluated in the emergency department for substance-related behavioral or psychotic symptoms. Your care information is private and confidential. Symptoms may change as substances clear.",
    diagnosisInstructions: `Follow clinician instructions during this visit.${BH_SUBSTANCE_RESOURCES_EN} ${POST_ACUTE_DISPOSITION_EN}`,
    medicationTreatment: BH_MED_EN,
    returnPrecautions: `${BH_RETURN_PRECAUTIONS_EN} Return for withdrawal symptoms, confusion, hallucinations, or worsening agitation.`,
  },
  {
    description:
      "Vous avez été pris en charge aux urgences pour des symptômes comportementaux ou psychotiques liés aux substances. Vos informations de soins sont privées et confidentielles. Les signes peuvent évoluer à mesure que les substances se métabolisent.",
    diagnosisInstructions: `Suivez les instructions du clinicien lors de cette visite.${BH_SUBSTANCE_RESOURCES_FR} ${POST_ACUTE_DISPOSITION_FR}`,
    medicationTreatment: BH_MED_FR,
    returnPrecautions: `${BH_RETURN_PRECAUTIONS_FR} Reconsultez en cas de symptômes de sevrage, de confusion, d'hallucinations ou d'aggravation de l'agitation.`,
  },
);

export const DELIRIUM_POST_ACUTE_V1_SUGGESTED_TEXT = localizedSuggestedText(
  {
      description:
        "You were evaluated in the emergency department for delirium or acute confusion. Delirium is a medical emergency until the underlying cause is evaluated and treated. Follow medical—not standalone outpatient psychiatric—follow-up as directed.",
    diagnosisInstructions:
      "Follow medical follow-up for the underlying cause as directed. Ensure supervision and a safe environment at home as directed. Return precautions were reviewed.",
    medicationTreatment: BH_MED_EN,
    returnPrecautions:
      "Return immediately for worsening confusion, inability to stay awake, fever, new weakness, falls, hallucinations, severe agitation, or any sudden change in mental status. Call 911 when concerned.",
  },
  {
      description:
        "Vous avez été pris en charge aux urgences pour délirium ou confusion aiguë. Le délirium est une urgence médicale jusqu'à évaluation et traitement de la cause sous-jacente. Suivez un suivi médical — et non un suivi psychiatrique ambulatoire isolé — selon les directives.",
    diagnosisInstructions:
      "Suivez le suivi médical de la cause sous-jacente selon les directives. Assurez supervision et environnement sécuritaire à domicile selon les directives. Les consignes de retour ont été revues.",
    medicationTreatment: BH_MED_FR,
    returnPrecautions:
      "Retournez immédiatement en cas d'aggravation de la confusion, d'incapacité à rester éveillé, de fièvre, de nouvelle faiblesse, de chutes, d'hallucinations, d'agitation sévère ou de tout changement soudain de l'état mental. Appelez le 911 si inquiétude.",
  },
);

export const DEMENTIA_BEHAVIOR_CHANGE_V1_SUGGESTED_TEXT = bhPostAcute(
  "for dementia with acute behavioral change",
  "pour démence avec changement comportemental aigu",
  "Ensure supervision and a safe home environment as directed. Follow neurology or geriatrics follow-up as directed.",
  "Assurez supervision et environnement sécuritaire à domicile selon les directives. Suivez le suivi en neurologie ou gériatrie selon les directives.",
);

export const CATATONIA_POST_ACUTE_V1_SUGGESTED_TEXT = bhPostAcute(
  "for catatonia after acute stabilization",
  "pour catatonie après stabilisation aiguë",
  "Follow medication and close follow-up instructions from your clinician. Maintain supervision as directed.",
  "Suivez les consignes de médication et de suivi rapproché de votre clinicien. Maintenez la supervision selon les directives.",
);

export const EATING_DISORDER_MEDICAL_FOLLOWUP_V1_SUGGESTED_TEXT = localizedSuggestedText(
  {
    description:
      "You were evaluated in the emergency department for an eating disorder with medical instability concerns. Close medical and specialty follow-up is important.",
    diagnosisInstructions:
      "Follow meal plan, electrolyte monitoring, and specialty follow-up instructions as directed. Do not restrict intake or purge without clinician guidance.",
    medicationTreatment: BH_MED_EN,
    returnPrecautions:
      "Return immediately for fainting, chest pain, palpitations, severe weakness, repeated vomiting, inability to eat or drink, or worsening symptoms. Call 911 when concerned.",
  },
  {
    description:
      "Vous avez été pris en charge aux urgences pour un trouble de l'alimentation avec préoccupations d'instabilité médicale. Un suivi médical et spécialisé rapproché est important.",
    diagnosisInstructions:
      "Suivez le plan alimentaire, la surveillance des électrolytes et les consignes de suivi spécialisé selon les directives. Ne restreignez pas l'apport ni ne purgez sans l'avis d'un clinicien.",
    medicationTreatment: BH_MED_FR,
    returnPrecautions:
      "Retournez immédiatement en cas d'évanouissement, de douleur thoracique, de palpitations, de faiblesse sévère, de vomissements répétés, d'incapacité à manger ou boire, ou d'aggravation des signes. Appelez le 911 si inquiétude.",
  },
);

export const POSTPARTUM_PSYCHIATRIC_CRISIS_POST_ACUTE_V1_SUGGESTED_TEXT = localizedSuggestedText(
  {
    description:
      "You were evaluated in the emergency department for postpartum psychiatric symptoms. Postpartum psychiatric emergencies require close obstetric and psychiatric follow-up. Infant safety planning is essential.",
    diagnosisInstructions:
      "Follow obstetric and behavioral health follow-up as directed. Ensure infant supervision and support as directed. Return precautions were reviewed.",
    medicationTreatment: BH_MED_EN,
    returnPrecautions: `${BH_RETURN_PRECAUTIONS_EN} Return immediately for thoughts of harming yourself or your infant, severe insomnia with agitation, or inability to care for yourself or your baby.`,
  },
  {
    description:
      "Vous avez été pris en charge aux urgences pour des symptômes psychiatriques post-partum. Les urgences psychiatriques post-partum nécessitent un suivi obstétrical et psychiatrique rapproché. La planification de la sécurité du nourrisson est essentielle.",
    diagnosisInstructions:
      "Suivez le suivi obstétrical et en santé comportementale selon les directives. Assurez supervision et soutien du nourrisson selon les directives. Les consignes de retour ont été revues.",
    medicationTreatment: BH_MED_FR,
    returnPrecautions: `${BH_RETURN_PRECAUTIONS_FR} Retournez immédiatement pour des idées de vous faire du mal ou de faire du mal à votre nourrisson, une insomnie sévère avec agitation, ou une incapacité à prendre soin de vous ou de votre bébé.`,
  },
);

export const INFORMED_REFUSAL_V1_SUGGESTED_TEXT = localizedSuggestedText(
  {
    description:
      "You were evaluated in the emergency department and declined recommended treatment or services after discussion. Refusal of treatment does not by itself mean a person lacks decision-making capacity.",
    diagnosisInstructions:
      "Document what was discussed, what was declined, and any capacity assessment performed by your clinician. Follow alternative safety plans as directed.",
    medicationTreatment: BH_MED_EN,
    returnPrecautions: BH_RETURN_PRECAUTIONS_EN,
  },
  {
    description:
      "Vous avez été pris en charge aux urgences et avez refusé un traitement ou des services recommandés après discussion. Le refus de traitement ne signifie pas à lui seul qu'une personne manque de capacité décisionnelle.",
    diagnosisInstructions:
      "Documentez ce qui a été discuté, ce qui a été refusé et toute évaluation de la capacité réalisée par votre clinicien. Suivez les plans de sécurité alternatifs selon les directives.",
    medicationTreatment: BH_MED_FR,
    returnPrecautions: BH_RETURN_PRECAUTIONS_FR,
  },
);

export const AGAINST_MEDICAL_ADVICE_V1_SUGGESTED_TEXT = localizedSuggestedText(
  {
    description:
      "You were evaluated in the emergency department and chose to leave against medical advice after discussion. Signing an AMA form is not the same as a formal capacity determination.",
    diagnosisInstructions:
      "Follow any partial treatment plan and return instructions provided during this visit. Document risks discussed with your clinician.",
    medicationTreatment: BH_MED_EN,
    returnPrecautions: BH_RETURN_PRECAUTIONS_EN,
  },
  {
    description:
      "Vous avez été pris en charge aux urgences et avez choisi de partir contre avis médical après discussion. Signer un formulaire de départ contre avis médical n'est pas la même chose qu'une détermination formelle de la capacité.",
    diagnosisInstructions:
      "Suivez tout plan de traitement partiel et les consignes de retour fournis lors de cette visite. Documentez les risques discutés avec votre clinicien.",
    medicationTreatment: BH_MED_FR,
    returnPrecautions: BH_RETURN_PRECAUTIONS_FR,
  },
);

export const BEHAVIORAL_HEALTH_SAFETY_PLAN_V1_SUGGESTED_TEXT = bhPostAcute(
  "for behavioral health safety planning after assessment",
  "pour planification de la sécurité en santé comportementale après évaluation",
  "Use crisis resources and follow-up contacts as directed. This note does not document completion of a formal safety plan.",
  "Utilisez les ressources de crise et les contacts de suivi selon les directives. Cette note ne documente pas l'achèvement d'un plan de sécurité formel.",
);

export const PEDIATRIC_BEHAVIORAL_CRISIS_V1_SUGGESTED_TEXT: ProviderDischargeTemplateSuggestedText =
  localizedSuggestedText(
    {
      description:
        "Your child was evaluated in the emergency department for a pediatric or developmental behavioral crisis after acute stabilization. Your child's emergency care information is private and confidential.",
      diagnosisInstructions:
        "Caregiver should follow safety, supervision, and follow-up instructions as directed. Consider developmental context and baseline function in follow-up planning. Return precautions were reviewed with the caregiver.",
      medicationTreatment: BH_MED_EN,
      returnPrecautions: `${BH_RETURN_PRECAUTIONS_EN} ${POST_ACUTE_DISPOSITION_EN}`,
      caregiverInstructions:
        "Caregiver: maintain close supervision, follow behavioral health follow-up as directed, and use crisis resources if safety concerns worsen.",
    },
    {
      description:
        "Votre enfant a été pris en charge aux urgences pour une crise comportementale pédiatrique ou développementale après stabilisation aiguë. Les informations de soins de votre enfant aux urgences sont privées et confidentielles.",
      diagnosisInstructions:
        "Le parent ou tuteur doit suivre les consignes de sécurité, de supervision et de suivi selon les directives. Tenez compte du contexte développemental et du fonctionnement de base dans la planification du suivi. Les consignes de retour ont été revues avec le responsable.",
      medicationTreatment: BH_MED_FR,
      returnPrecautions: `${BH_RETURN_PRECAUTIONS_FR} ${POST_ACUTE_DISPOSITION_FR}`,
      caregiverInstructions:
        "Parent/tuteur : maintenez une supervision rapprochée, suivez le suivi en santé comportementale selon les directives et utilisez les ressources de crise si les préoccupations de sécurité s'aggravent.",
    },
  );

export const CRISIS_RESOURCE_FOLLOWUP_V1_SUGGESTED_TEXT = bhPostAcute(
  "for crisis resource follow-up after emergency evaluation",
  "pour suivi des ressources de crise après évaluation aux urgences",
  "Use crisis line and community resources as directed. Follow behavioral health follow-up as directed.",
  "Utilisez la ligne de crise et les ressources communautaires selon les directives. Suivez le suivi en santé comportementale selon les directives.",
);
