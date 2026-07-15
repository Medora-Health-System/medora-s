import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PROVIDER_DISCHARGE_EDUCATION_TEMPLATES,
  matchProviderDischargeEducationTemplate,
} from "./providerDischargeEducationTemplates";
import {
  applyProviderDischargeTemplateToCard,
  BATCH_1_ED_DISCHARGE_TEMPLATE_IDS,
  BATCH_2_ED_DISCHARGE_TEMPLATE_IDS,
  BATCH_3_ED_DISCHARGE_TEMPLATE_IDS,
  BATCH_4_ED_DISCHARGE_TEMPLATE_IDS,
  BATCH_5_PEDIATRIC_ED_DISCHARGE_TEMPLATE_IDS,
  BATCH_6_PEDIATRIC_HIGHER_RISK_ED_DISCHARGE_TEMPLATE_IDS,
  BATCH_7_OBGYN_ED_DISCHARGE_TEMPLATE_IDS,
  BATCH_8_BEHAVIORAL_HEALTH_ED_DISCHARGE_TEMPLATE_IDS,
  BATCH_9_TRAUMA_MSK_ED_DISCHARGE_TEMPLATE_IDS,
  BATCH_10_CARDIO_HIGH_RISK_ED_DISCHARGE_TEMPLATE_IDS,
  BATCH_11_INFECTIOUS_SEPSIS_ED_DISCHARGE_TEMPLATE_IDS,
  BATCH_12_RENAL_UROLOGY_ELECTROLYTE_TEMPLATE_IDS,
  BATCH_13_ENDOCRINE_METABOLIC_TEMPLATE_IDS,
  buildProviderDischargeCardFromDiagnosis,
  PROVIDER_DISCHARGE_REGISTRY_PARAGRAPH_FRAGMENTS,
  PROVIDER_DISCHARGE_TEMPLATE_REGISTRY,
  resolveProviderDischargeTemplateForDiagnosis,
  type ProviderDischargeTemplate,
} from "./providerDischargeTemplateRegistry";
import {
  scanProviderDischargeObGynEscalationLanguage,
  scanProviderDischargeObGynPregnancyForbiddenPhrases,
  scanProviderDischargeObGynPrivacyContent,
  validateProviderDischargeObGynTemplateGovernance,
} from "./providerDischargeTemplateObGynGovernance";
import {
  scanProviderDischargeBehavioralHealthEscalationLanguage,
  scanProviderDischargeBehavioralHealthForbiddenPhrases,
  scanProviderDischargeBehavioralHealthPrivacyContent,
  validateProviderDischargeBehavioralHealthTemplateGovernance,
} from "./providerDischargeTemplateBehavioralHealthGovernance";
import {
  scanProviderDischargeTraumaMskEscalationLanguage,
  scanProviderDischargeTraumaMskForbiddenPhrases,
  scanProviderDischargeTraumaMskHeadNeckSpineEscalation,
  scanProviderDischargeTraumaMskReturnActivityForbiddenPhrases,
  scanProviderDischargeTraumaMskSplintCastPrecautions,
  validateProviderDischargeTraumaMskTemplateGovernance,
} from "./providerDischargeTemplateTraumaMskGovernance";
import {
  scanProviderDischargeCardioHighRiskEscalationLanguage,
  scanProviderDischargeCardioHighRiskForbiddenPhrases,
  scanProviderDischargeCardioAnticoagForbiddenPhrases,
  scanProviderDischargeCardioChestPainEscalationLanguage,
  scanProviderDischargeCardioDrivingRestrictionCaution,
  scanProviderDischargeCardioFluidStatusPrecautions,
  scanProviderDischargeCardioNeurologicEscalationLanguage,
  scanProviderDischargeCardioPeForbiddenPhrases,
  scanProviderDischargeCardioPeEscalationLanguage,
  scanProviderDischargeCardioAnticoagPrecautions,
  scanProviderDischargeCardioResultInterpretationForbiddenPhrases,
  scanProviderDischargeCardioSyncopePrecautions,
  validateProviderDischargeCardioHighRiskTemplateGovernance,
} from "./providerDischargeTemplateCardioHighRiskGovernance";
import {
  scanProviderDischargeInfectiousFeverEscalationLanguage,
  scanProviderDischargeInfectiousHydrationEscalationLanguage,
  scanProviderDischargeInfectiousNeurologicEscalationLanguage,
  scanProviderDischargeInfectiousRashEscalationLanguage,
  scanProviderDischargeInfectiousRespiratoryEscalationLanguage,
  scanProviderDischargeInfectiousResultInterpretationForbiddenPhrases,
  scanProviderDischargeInfectiousReturnIfWorseningLanguage,
  scanProviderDischargeInfectiousRiskForbiddenPhrases,
  validateProviderDischargeInfectiousRiskTemplateGovernance,
  PROVIDER_DISCHARGE_INFECTIOUS_RISK_FORBIDDEN_PHRASES,
  PROVIDER_DISCHARGE_INFECTIOUS_RESULT_INTERPRETATION_FORBIDDEN_PHRASES,
} from "./providerDischargeTemplateInfectiousRiskGovernance";
import {
  isRenalElectrolyteProviderDischargeTemplateCandidate,
  normalizeRenalElectrolyteSafetyForHash,
  scanProviderDischargeRenalElectrolyteCatheterPrecautionsLanguage,
  scanProviderDischargeRenalElectrolyteDialysisEscalationLanguage,
  scanProviderDischargeRenalElectrolyteElectrolyteEscalationLanguage,
  scanProviderDischargeRenalElectrolyteForbiddenPhrases,
  scanProviderDischargeRenalElectrolyteHydrationPrecautionsLanguage,
  scanProviderDischargeRenalElectrolyteResultInterpretationForbiddenPhrases,
  scanProviderDischargeRenalElectrolyteUrinaryObstructionEscalationLanguage,
  validateProviderDischargeRenalElectrolyteTemplateGovernance,
  PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_EN_CATHETER_MARKERS,
  PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_EN_DIALYSIS_MARKERS,
  PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_EN_ELECTROLYTE_MARKERS,
  PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_EN_HYDRATION_MARKERS,
  PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_EN_OBSTRUCTION_MARKERS,
  PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_FR_CATHETER_MARKERS,
  PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_FR_DIALYSIS_MARKERS,
  PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_FR_ELECTROLYTE_MARKERS,
  PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_FR_HYDRATION_MARKERS,
  PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_FR_OBSTRUCTION_MARKERS,
} from "./providerDischargeTemplateRenalElectrolyteGovernance";
import {
  isEndocrineMetabolicProviderDischargeTemplateCandidate,
  normalizeEndocrineMetabolicSafetyForHash,
  scanProviderDischargeEndocrineMetabolicForbiddenPhrases,
  scanProviderDischargeEndocrineMetabolicGlucoseEscalationLanguage,
  scanProviderDischargeEndocrineMetabolicHydrationEscalationLanguage,
  scanProviderDischargeEndocrineMetabolicInsulinPrecautionsLanguage,
  scanProviderDischargeEndocrineMetabolicNeurologicEscalationLanguage,
  scanProviderDischargeEndocrineMetabolicResultInterpretationForbiddenPhrases,
  validateProviderDischargeEndocrineMetabolicTemplateGovernance,
  PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_EN_GLUCOSE_MARKERS,
  PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_EN_HYDRATION_MARKERS,
  PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_EN_INSULIN_MARKERS,
  PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_EN_NEUROLOGIC_MARKERS,
  PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_FR_GLUCOSE_MARKERS,
  PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_FR_HYDRATION_MARKERS,
  PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_FR_INSULIN_MARKERS,
  PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_FR_NEUROLOGIC_MARKERS,
} from "./providerDischargeTemplateEndocrineMetabolicGovernance";
import {
  isNeurologyProviderDischargeTemplateCandidate,
  normalizeNeurologySafetyForHash,
  scanProviderDischargeNeurologyAnticoagulationPrecautionsLanguage,
  scanProviderDischargeNeurologyDrivingForbiddenPhrases,
  scanProviderDischargeNeurologyDrivingRestrictionPrecautionsLanguage,
  scanProviderDischargeNeurologyForbiddenPhrases,
  scanProviderDischargeNeurologyHeadInjuryEscalationLanguage,
  scanProviderDischargeNeurologyNeurologicEscalationLanguage,
  scanProviderDischargeNeurologyResultInterpretationForbiddenPhrases,
  scanProviderDischargeNeurologySeizurePrecautionsLanguage,
  scanProviderDischargeNeurologyStrokeEscalationLanguage,
  validateProviderDischargeNeurologyTemplateGovernance,
  PROVIDER_DISCHARGE_NEUROLOGY_EN_ANTICOAGULATION_MARKERS,
  PROVIDER_DISCHARGE_NEUROLOGY_EN_DRIVING_MARKERS,
  PROVIDER_DISCHARGE_NEUROLOGY_EN_HEAD_INJURY_MARKERS,
  PROVIDER_DISCHARGE_NEUROLOGY_EN_NEUROLOGIC_MARKERS,
  PROVIDER_DISCHARGE_NEUROLOGY_EN_SEIZURE_MARKERS,
  PROVIDER_DISCHARGE_NEUROLOGY_EN_STROKE_MARKERS,
  PROVIDER_DISCHARGE_NEUROLOGY_FR_ANTICOAGULATION_MARKERS,
  PROVIDER_DISCHARGE_NEUROLOGY_FR_DRIVING_MARKERS,
  PROVIDER_DISCHARGE_NEUROLOGY_FR_HEAD_INJURY_MARKERS,
  PROVIDER_DISCHARGE_NEUROLOGY_FR_NEUROLOGIC_MARKERS,
  PROVIDER_DISCHARGE_NEUROLOGY_FR_SEIZURE_MARKERS,
  PROVIDER_DISCHARGE_NEUROLOGY_FR_STROKE_MARKERS,
} from "./providerDischargeTemplateNeurologyGovernance";
import {
  buildAppliedDiagnosisInstructionsFromTemplateBody,
  scanProviderDischargePediatricDehydrationDangerSigns,
  scanProviderDischargePediatricForbiddenDosing,
  scanProviderDischargePediatricCaregiverWording,
  scanProviderDischargePediatricEscalationLanguage,
  scanProviderDischargePediatricNeurologicWarnings,
  scanProviderDischargePediatricRequiredDangerSignCategories,
  scanProviderDischargePediatricTemplateGovernanceWarnings,
  validateProviderDischargePediatricTemplateGovernance,
  validateProviderDischargeTemplateAgeRange,
} from "./providerDischargeTemplatePediatricGovernance";
import {
  buildProviderDischargeRegistryGovernanceSnapshot,
  computeProviderDischargeRegistryGovernanceSnapshotHash,
  scanProviderDischargeTemplateUnsafePhrases,
  validateProviderDischargeTemplateRegistry,
} from "./providerDischargeTemplateRegistryValidator";
import {
  foreignTemplateBodyFailsIntegrityRule,
  PROVIDER_DISCHARGE_TEMPLATE_CONTENT_INTEGRITY,
  validateProviderDischargeTemplateContentIntegrity,
} from "./providerDischargeTemplateContentIntegrity";
import {
  applyProviderDischargeTemplateToCardByDiagnosis,
  ensureProviderDischargeCardForRef,
  expectedProviderDischargeTemplateIdForDiagnosis,
  providerDischargeCardNeedsLocaleReapply,
  syncProviderDischargeCardWithRef,
} from "./providerDischargeCardTemplateSync";
import {
  buildProviderDischargeTemplateHashPayload,
  computeProviderDischargeTemplateAppliedHash,
  providerDischargeTemplateHashCanonicalString,
} from "./providerDischargeTemplateAppliedHash";
import {
  getProviderDischargeSuggestedTextBody,
  PROVIDER_DISCHARGE_TEMPLATE_LOCALES,
  ProviderDischargeTemplateLocaleError,
  scanProviderDischargeSuggestedTextEnglishContaminationInFr,
  scanProviderDischargeSuggestedTextFrenchContaminationInEn,
} from "./providerDischargeTemplateLocale";
import {
  extractSharedFieldsFromTemplate,
  mergeDedupedFollowUpRows,
  mergeSharedFieldsFromSelectedTemplates,
  mergeTemplateSharedFieldsIntoForm,
  mergeUniquePrecautionText,
} from "./providerDischargeSharedPlanningMerge";
import {
  createDiagnosisDocFromRef,
  evaluateProviderDischargeCardIdentitySync,
  getSelectedDiagnosisDocs,
  hydrateProviderDischargeDocumentationForm,
  emptyProviderDischargeDocumentationForm,
  mergeProviderDischargeDocumentationIntoDischargeJson,
  newDefaultFollowUpRow,
  normalizeProviderDischargeDiagnosisCards,
  PROVIDER_DISCHARGE_CARD_TEMPLATE_SYNC_VERSION,
  sortProviderDischargeDiagnosisCards,
  stampProviderDischargeCardCreationIdentity,
  validateProviderDischargeDocumentation,
  type ProviderDischargeDocumentationForm,
} from "./providerDischargeDocumentationModel";
import {
  buildProviderDischargeDocumentationSummaryBlock,
} from "./providerDischargeDocumentationSummary";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const validationMessages = {
  requiredDescription: "Description required",
  requiredInstructions: "Instructions required",
  requiredMedication: "Medication required",
  requiredReturnPrecautions: "Return precautions required",
  requiredFollowUp: "Follow-up required",
};

function completeCard(
  id: string,
  sourceEncounterDiagnosisId: string,
  code: string,
  displayName: string,
  opts?: { isPrimaryDiagnosis?: boolean; displayOrder?: number }
) {
  return {
    id,
    sourceEncounterDiagnosisId,
    encounterDiagnosisId: sourceEncounterDiagnosisId,
    code,
    displayName,
    isPrimaryDiagnosis: opts?.isPrimaryDiagnosis ?? false,
    displayOrder: opts?.displayOrder ?? 0,
    description: `Description for ${code}`,
    diagnosisInstructions: `Instructions for ${code}`,
    medicationTreatment: `Medication for ${code}`,
    treatment: "",
    returnPrecautions: "",
    returnWorkSchool: "",
    followUps: [],
    medicationLines: [],
  };
}

function formWithThreeSelected(): ProviderDischargeDocumentationForm {
  const refs = [
    { encounterDiagnosisId: "dx-1", code: "R07.9", label: "Chest pain, unspecified", isPrimary: true },
    { encounterDiagnosisId: "dx-2", code: "R10.9", label: "Abdominal pain, unspecified" },
    { encounterDiagnosisId: "dx-3", code: "S01.01", label: "Laceration of scalp" },
  ];
  return normalizeProviderDischargeDiagnosisCards({
    patientLeftEdAt: "",
    diagnosisRefs: refs,
    diagnosisDocs: [
      completeCard("doc-1", "dx-1", "R07.9", "Chest pain, unspecified", { isPrimaryDiagnosis: true, displayOrder: 0 }),
      completeCard("doc-2", "dx-2", "R10.9", "Abdominal pain, unspecified", { displayOrder: 1 }),
      completeCard("doc-3", "dx-3", "S01.01", "Laceration of scalp", { displayOrder: 2 }),
    ],
    returnPrecautions: "Shared return precautions",
    returnWorkSchool: "May return tomorrow",
    followUps: [{ ...newDefaultFollowUpRow(), timing: "1 week" }],
  });
}

function normalizeTestForm(
  partial: Partial<ProviderDischargeDocumentationForm> &
    Pick<ProviderDischargeDocumentationForm, "diagnosisRefs" | "diagnosisDocs">
): ProviderDischargeDocumentationForm {
  return normalizeProviderDischargeDiagnosisCards({
    ...emptyProviderDischargeDocumentationForm(),
    ...partial,
  });
}

function syntheticRegistryTemplate(
  overrides: Partial<ProviderDischargeTemplate> & Pick<ProviderDischargeTemplate, "id">
): ProviderDischargeTemplate {
  return {
    version: "1.0.0",
    title: "Synthetic template",
    specialtyCategory: "emergency_medicine",
    riskCategory: "moderate",
    clinicalReviewStatus: "draft",
    effectiveFrom: "2026-05-18",
    diagnosisMappings: { icdExact: [`Z-${overrides.id}`] },
    sourceReferences: [{ label: "Synthetic source" }],
    suggestedText: {
      en: {
        description: "ED evaluation was performed for this concern.",
        diagnosisInstructions: "Return precautions were reviewed. Follow-up is recommended.",
        medicationTreatment: "Take medications only as prescribed or directed.",
        returnPrecautions: "Seek care if symptoms worsen.",
      },
      fr: {
        description: "Une évaluation aux urgences a été réalisée pour ce motif.",
        diagnosisInstructions: "Les consignes de retour ont été revues. Un suivi ambulatoire est recommandé.",
        medicationTreatment: "Prenez les médicaments uniquement selon la prescription ou les indications reçues.",
        returnPrecautions: "Reconsultez en cas d'aggravation des signes.",
      },
    },
    ...overrides,
  };
}

function syntheticPediatricTemplate(
  overrides: Partial<ProviderDischargeTemplate> & Pick<ProviderDischargeTemplate, "id">
): ProviderDischargeTemplate {
  const { id, ...rest } = overrides;
  return syntheticRegistryTemplate({
    id,
    ageRange: { label: "pediatric", maxAgeDays: 17 * 365 },
    escalationSeverity: "urgent",
    requiresCaregiverAcknowledgement: true,
    suggestedText: {
      en: {
        description: "Your child was evaluated in the emergency department for this concern.",
        diagnosisInstructions:
          "Caregiver should follow clinician instructions. Return precautions were reviewed.",
        medicationTreatment: "Give medications only as prescribed or directed.",
        returnPrecautions:
          "Return immediately if symptoms worsen. Caregiver should seek immediate care if concerned.",
        caregiverInstructions:
          "Caregiver: monitor the child closely and follow instructions provided by the clinician.",
      },
      fr: {
        description: "Votre enfant a été évalué aux urgences pour ce motif.",
        diagnosisInstructions:
          "Le parent ou tuteur doit suivre les instructions du clinicien. Les consignes de retour ont été revues.",
        medicationTreatment:
          "Administrez les médicaments uniquement selon la prescription ou les indications reçues.",
        returnPrecautions:
          "Retournez immédiatement aux urgences si les signes s'aggravent. Consultez immédiatement en cas d'inquiétude.",
        caregiverInstructions:
          "Parent/tuteur : surveillez l'enfant de près et suivez les instructions du clinicien.",
      },
    },
    ...rest,
  });
}

const SYNTHETIC_OBGYN_SAFE_TEXT = {
  en: {
    description:
      "You were evaluated in the emergency department for a gynecologic concern. Pregnancy-related symptoms may require close follow-up.",
    diagnosisInstructions:
      "Symptoms may evolve after an emergency visit. Take medications only as directed. Follow up with OB/GYN as directed.",
    medicationTreatment: "Take medications only as prescribed or directed during this visit.",
    returnPrecautions:
      "Return immediately for heavy bleeding, severe pelvic pain, fainting, shoulder pain, fever, or worsening symptoms. Seek emergency care when concerned.",
  },
  fr: {
    description:
      "Vous avez été pris en charge aux urgences pour un motif gynécologique. Les signes liés à une grossesse peuvent nécessiter un suivi rapproché.",
    diagnosisInstructions:
      "Les signes peuvent évoluer après une visite aux urgences. Prenez les médicaments uniquement selon les indications reçues. Suivez le suivi OB/GYN selon les directives.",
    medicationTreatment: "Prenez les médicaments uniquement selon la prescription ou les indications reçues.",
    returnPrecautions:
      "Retournez immédiatement en cas de saignement abondant, de douleur pelvienne intense, d'évanouissement, de douleur à l'épaule, de fièvre ou d'aggravation des signes. Consultez en urgence si inquiétude.",
  },
} as const;

function syntheticObGynTemplate(
  overrides: Partial<ProviderDischargeTemplate> & Pick<ProviderDischargeTemplate, "id">
): ProviderDischargeTemplate {
  const { id, ...rest } = overrides;
  return syntheticRegistryTemplate({
    id,
    specialtyCategory: "obgyn",
    suggestedText: {
      en: { ...SYNTHETIC_OBGYN_SAFE_TEXT.en },
      fr: { ...SYNTHETIC_OBGYN_SAFE_TEXT.fr },
    },
    defaultFollowUps: [
      {
        ...newDefaultFollowUpRow(),
        id: "obgyn-follow",
        specialty: "OBGYN",
        timing: "within 1–2 days",
      },
    ],
    obGynSafety: {
      pregnancySensitive: true,
      requiresPregnancyStatusDocumentation: true,
      requiresBleedingPrecautions: true,
      requiresPelvicPainPrecautions: true,
      requiresOBGynFollowUp: true,
    },
    ...rest,
  });
}

const SYNTHETIC_BH_SAFE_TEXT = {
  en: {
    description:
      "You were evaluated in the emergency department for a behavioral health concern. Symptoms may recur or worsen after discharge.",
    diagnosisInstructions:
      "Follow clinician instructions. Return immediately for thoughts of self-harm or harm to others. Use crisis resources as directed. Follow up with behavioral health.",
    medicationTreatment: "Take medications only as prescribed or directed during this visit.",
    returnPrecautions:
      "Return immediately for thoughts of self-harm, thoughts of harming others, worsening hallucinations, confusion, severe agitation, or withdrawal symptoms. Call 911 or use the crisis line. Use crisis resources as directed. Follow up with behavioral health and substance use treatment resources. Avoid alcohol or substances as directed.",
  },
  fr: {
    description:
      "Vous avez été pris en charge aux urgences pour un motif de santé comportementale. Les symptômes peuvent récidiver ou s'aggraver après le congé.",
    diagnosisInstructions:
      "Suivez les instructions du clinicien. Retournez immédiatement pour des idées de se faire du mal ou de faire du mal à autrui. Utilisez les ressources de crise selon les directives. Suivez le suivi en santé comportementale.",
    medicationTreatment: "Prenez les médicaments uniquement selon la prescription ou les indications reçues.",
    returnPrecautions:
      "Retournez immédiatement pour des idées de se faire du mal, des idées de faire du mal à autrui, des hallucinations qui s'aggravent, de la confusion, de l'agitation sévère ou des symptômes de sevrage. Appelez le 911 ou utilisez la ligne de crise. Suivez les ressources de crise et le suivi en usage de substances. Évitez l'alcool ou les substances selon les directives.",
  },
} as const;

function syntheticBehavioralHealthTemplate(
  overrides: Partial<ProviderDischargeTemplate> & Pick<ProviderDischargeTemplate, "id">
): ProviderDischargeTemplate {
  const { id, ...rest } = overrides;
  return syntheticRegistryTemplate({
    id,
    specialtyCategory: "behavioral_health",
    suggestedText: {
      en: { ...SYNTHETIC_BH_SAFE_TEXT.en },
      fr: { ...SYNTHETIC_BH_SAFE_TEXT.fr },
    },
    defaultFollowUps: [
      {
        ...newDefaultFollowUpRow(),
        id: "bh-follow",
        specialty: "BEHAVIORAL_HEALTH",
        timing: "within 1 week",
      },
    ],
    behavioralHealthSafety: {
      requiresCrisisResources: true,
      requiresSelfHarmEscalation: true,
      requiresHomicideRiskEscalation: true,
      requiresSubstanceUseResources: true,
      requiresWithdrawalPrecautions: true,
      requiresBehavioralHealthFollowUp: true,
    },
    ...rest,
  });
}

const SYNTHETIC_TRAUMA_MSK_SAFE_TEXT = {
  en: {
    description:
      "You were evaluated in the emergency department for a musculoskeletal or trauma-related concern. Symptoms may worsen after discharge.",
    diagnosisInstructions:
      "Follow provider recommendations. Follow up with orthopedics as directed. Activity should follow provider guidance. Gradual return as directed.",
    medicationTreatment: "Take pain medicines only as prescribed or directed during this visit.",
    returnPrecautions:
      "Return immediately for worsening pain, numbness, weakness, swelling, discoloration, inability to move, severe headache, vomiting, confusion, or difficulty breathing. Seek emergency care for worsening symptoms.",
  },
  fr: {
    description:
      "Vous avez été pris en charge aux urgences pour un motif traumatique ou musculo-squelettique. Les symptômes peuvent s'aggraver après le congé.",
    diagnosisInstructions:
      "Suivez les recommandations du clinicien. Suivez le suivi en orthopédie selon les directives. L'activité doit suivre les indications du clinicien. Reprise progressive selon les directives.",
    medicationTreatment:
      "Prenez les antidouleurs uniquement selon la prescription ou les indications reçues pendant cette visite.",
    returnPrecautions:
      "Retournez immédiatement en cas d'aggravation de la douleur, d'engourdissement, de faiblesse, d'enflure, de changement de couleur, d'incapacité à bouger, de mal de tête sévère, de vomissements, de confusion ou de difficulté à respirer. Consultez en urgence en cas d'aggravation.",
  },
} as const;

function syntheticTraumaMskTemplate(
  overrides: Partial<ProviderDischargeTemplate> & Pick<ProviderDischargeTemplate, "id">
): ProviderDischargeTemplate {
  const { id, ...rest } = overrides;
  return syntheticRegistryTemplate({
    id,
    specialtyCategory: "orthopedics",
    suggestedText: {
      en: { ...SYNTHETIC_TRAUMA_MSK_SAFE_TEXT.en },
      fr: { ...SYNTHETIC_TRAUMA_MSK_SAFE_TEXT.fr },
    },
    defaultFollowUps: [
      {
        ...newDefaultFollowUpRow(),
        id: "msk-ortho",
        specialty: "ORTHOPEDICS",
        timing: "within 1–2 weeks",
      },
    ],
    traumaMskSafety: {
      imagingSensitive: true,
      requiresFracturePrecautions: true,
      requiresNeurovascularPrecautions: true,
      requiresCompartmentSyndromePrecautions: true,
      requiresReturnActivityRestrictions: true,
      requiresSplintCastPrecautions: true,
      requiresHeadNeckSpineEscalation: true,
      requiresOrthopedicFollowUp: true,
    },
    ...rest,
  });
}

const SYNTHETIC_CARDIO_HIGH_RISK_SAFE_TEXT = {
  en: {
    description:
      "You were evaluated in the emergency department for a cardiology or high-risk medical concern. Symptoms may evolve after discharge.",
    diagnosisInstructions:
      "Follow provider recommendations. Follow up with cardiology as directed. Take medications only as directed.",
    medicationTreatment: "Take medications only as prescribed or directed during this visit.",
    returnPrecautions:
      "Return immediately for chest pain, shortness of breath, fainting, recurrent fainting, fainting again, severe weakness, new neurologic symptoms, one-sided weakness, trouble speaking, severe headache, palpitations with dizziness, coughing blood, or leg swelling. Seek care for fall risk or injury from a fall. Call 911 for worsening symptoms.",
  },
  fr: {
    description:
      "Vous avez été pris en charge aux urgences pour un motif cardiovasculaire ou médical à risque élevé. Les symptômes peuvent évoluer après le congé.",
    diagnosisInstructions:
      "Suivez les recommandations du clinicien. Suivez le suivi en cardiologie selon les directives. Prenez les médicaments uniquement selon les directives.",
    medicationTreatment:
      "Prenez les médicaments uniquement selon la prescription ou les indications reçues pendant cette visite.",
    returnPrecautions:
      "Retournez immédiatement en cas de douleur thoracique, d'essoufflement, d'évanouissement, d'évanouissement récurrent, de faiblesse importante, de nouveaux symptômes neurologiques, de faiblesse d'un côté, de difficulté à parler, de mal de tête sévère, de palpitations avec étourdissements, de cracher du sang ou d'enflure d'une jambe. Consultez en cas de risque de chute ou de blessure après une chute. Appelez le 911 en cas d'aggravation.",
  },
} as const;

function syntheticCardioHighRiskTemplate(
  overrides: Partial<ProviderDischargeTemplate> & Pick<ProviderDischargeTemplate, "id">
): ProviderDischargeTemplate {
  const { id, ...rest } = overrides;
  return syntheticRegistryTemplate({
    id,
    specialtyCategory: "cardiology",
    riskCategory: "high",
    suggestedText: {
      en: { ...SYNTHETIC_CARDIO_HIGH_RISK_SAFE_TEXT.en },
      fr: { ...SYNTHETIC_CARDIO_HIGH_RISK_SAFE_TEXT.fr },
    },
    defaultFollowUps: [
      {
        ...newDefaultFollowUpRow(),
        id: "cardio-cardiology",
        specialty: "CARDIOLOGY",
        timing: "within several days or as directed",
      },
      {
        ...newDefaultFollowUpRow(),
        id: "cardio-pcp",
        specialty: "PRIMARY_CARE",
        timing: "as clinically appropriate",
      },
    ],
    cardioHighRiskSafety: {
      acsSensitive: true,
      peSensitive: true,
      strokeTiaSensitive: true,
      ekgSensitive: true,
      troponinLabSensitive: true,
      anticoagulationSensitive: true,
      syncopeSensitive: true,
      dyspneaSensitive: true,
      requiresCardiologyFollowUp: true,
      requiresEmergencyEscalation: true,
      requiresResultInterpretationCaution: true,
    },
    ...rest,
  });
}

const SYNTHETIC_CARDIO_EXTENDED_SAFE_TEXT = {
  en: {
    description:
      "You were evaluated in the emergency department for a cardiology or high-risk medical concern. Symptoms may evolve after discharge.",
    diagnosisInstructions:
      "Follow provider recommendations. Follow up with cardiology as directed. Take medications only as directed. Avoid driving or operating machinery as directed.",
    medicationTreatment: "Take medications only as prescribed or directed during this visit.",
    returnPrecautions:
      "Return immediately for chest pain, shortness of breath, worsening shortness of breath, swelling, weight gain, fainting, recurrent fainting, fainting again, severe weakness, numbness, confusion, new neurologic symptoms, one-sided weakness, one-sided symptoms, trouble speaking, severe headache, palpitations with dizziness, coughing blood, or one-sided leg swelling. Seek care for fall risk or injury from a fall. Call 911 for worsening symptoms.",
  },
  fr: {
    description:
      "Vous avez été pris en charge aux urgences pour un motif cardiovasculaire ou médical à risque élevé. Les symptômes peuvent évoluer après le congé.",
    diagnosisInstructions:
      "Suivez les recommandations du clinicien. Suivez le suivi en cardiologie selon les directives. Prenez les médicaments uniquement selon les directives. Évitez de conduire ou d'utiliser des machines selon les directives.",
    medicationTreatment:
      "Prenez les médicaments uniquement selon la prescription ou les indications reçues pendant cette visite.",
    returnPrecautions:
      "Retournez immédiatement en cas de douleur thoracique, d'essoufflement, d'enflure, de prise de poids, d'évanouissement, d'évanouissement récurrent, de faiblesse, d'engourdissement, de confusion, de nouveaux symptômes neurologiques, de faiblesse d'un côté, de difficulté à parler, de mal de tête sévère, de palpitations avec étourdissements, de cracher du sang ou d'enflure d'une jambe. Consultez en cas de risque de chute ou de blessure après une chute. Appelez le 911 en cas d'aggravation.",
  },
} as const;

function syntheticCardioExtendedTemplate(
  overrides: Partial<ProviderDischargeTemplate> & Pick<ProviderDischargeTemplate, "id">
): ProviderDischargeTemplate {
  const { id, ...rest } = overrides;
  return syntheticCardioHighRiskTemplate({
    id,
    suggestedText: {
      en: { ...SYNTHETIC_CARDIO_EXTENDED_SAFE_TEXT.en },
      fr: { ...SYNTHETIC_CARDIO_EXTENDED_SAFE_TEXT.fr },
    },
    cardioHighRiskSafety: {
      acsSensitive: true,
      peSensitive: true,
      strokeTiaSensitive: true,
      ekgSensitive: true,
      troponinLabSensitive: true,
      anticoagulationSensitive: true,
      syncopeSensitive: true,
      dyspneaSensitive: true,
      requiresCardiologyFollowUp: true,
      requiresEmergencyEscalation: true,
      requiresResultInterpretationCaution: true,
      requiresDrivingRestrictionCaution: true,
      requiresAnticoagulationPrecautions: true,
      requiresFluidStatusPrecautions: true,
      requiresNeurologicEscalation: true,
      requiresChestPainEscalation: true,
    },
    ...rest,
  });
}

const SYNTHETIC_INFECTIOUS_RISK_SAFE_TEXT = {
  en: {
    description:
      "You were evaluated in the emergency department for a possible infection. Symptoms may worsen after discharge.",
    diagnosisInstructions:
      "Follow provider recommendations and follow up as directed. This note does not replace provider documentation of test results.",
    medicationTreatment: "Take medications only as prescribed or directed during this visit.",
    returnPrecautions:
      "Return immediately or call 911 for fever, worsening fever, shaking chills, trouble breathing, worsening cough, chest pain, blue lips, confusion, severe headache, stiff neck, weakness, seizures, trouble waking up, spreading rash, skin peeling, swelling, breathing difficulty, facial swelling, unable to drink, worsening vomiting, worsening diarrhea, dehydration, decreased urination, dizziness, or weakness. Seek urgent care if symptoms worsen.",
  },
  fr: {
    description:
      "Vous avez été pris en charge aux urgences pour une possible infection. Les symptômes peuvent s'aggraver après le congé.",
    diagnosisInstructions:
      "Suivez les recommandations du clinicien et le suivi selon les directives. Cette note ne remplace pas la documentation clinicien des résultats d'examens.",
    medicationTreatment:
      "Prenez les médicaments uniquement selon la prescription ou les indications reçues pendant cette visite.",
    returnPrecautions:
      "Retournez immédiatement ou appelez le 911 en cas de fièvre, d'aggravation de la fièvre, de frissons, de difficulté à respirer, d'aggravation de la toux, de douleur thoracique, de lèvres bleues, de confusion, de mal de tête sévère, de raideur du cou, de faiblesse, de convulsions, de difficulté à réveiller, d'éruption qui s'aggrave, de peau qui pèle, d'enflure, d'enflure du visage, d'incapable de boire, de vomissements, de diarrhée, de déshydratation, de diminution des urines, d'étourdissements ou de faiblesse. Consultez en urgence si les symptômes s'aggravent.",
  },
} as const;

function syntheticInfectiousRiskTemplate(
  overrides: Partial<ProviderDischargeTemplate> & Pick<ProviderDischargeTemplate, "id">
): ProviderDischargeTemplate {
  const { id, ...rest } = overrides;
  return syntheticRegistryTemplate({
    id,
    specialtyCategory: "infectious_disease",
    riskCategory: "high",
    suggestedText: {
      en: { ...SYNTHETIC_INFECTIOUS_RISK_SAFE_TEXT.en },
      fr: { ...SYNTHETIC_INFECTIOUS_RISK_SAFE_TEXT.fr },
    },
    defaultFollowUps: [
      {
        ...newDefaultFollowUpRow(),
        id: "inf-pcp",
        specialty: "PRIMARY_CARE",
        timing: "within several days or as directed",
      },
      {
        ...newDefaultFollowUpRow(),
        id: "inf-id",
        specialty: "INFECTIOUS_DISEASE",
        timing: "as clinically appropriate",
      },
    ],
    infectiousRiskSafety: {
      sepsisSensitive: true,
      meningitisSensitive: true,
      pneumoniaSensitive: true,
      dehydrationSensitive: true,
      rashSensitive: true,
      requiresFeverEscalation: true,
      requiresHydrationEscalation: true,
      requiresRespiratoryEscalation: true,
      requiresNeurologicEscalation: true,
      requiresRashEscalation: true,
      requiresReturnIfWorsening: true,
      requiresPrimaryCareFollowUp: true,
      requiresInfectiousDiseaseFollowUp: true,
      requiresResultInterpretationCaution: true,
    },
    ...rest,
  });
}

const SYNTHETIC_RENAL_ELECTROLYTE_SAFE_TEXT = {
  en: {
    description:
      "You were evaluated in the emergency department for a kidney, urinary, or electrolyte concern. Symptoms may worsen after discharge.",
    diagnosisInstructions:
      "Follow provider recommendations and follow up as directed. This note does not replace provider documentation of test results.",
    medicationTreatment: "Take medications only as prescribed or directed during this visit.",
    returnPrecautions:
      "Return immediately or call 911 if unable to keep fluids down, worsening vomiting, dizziness, weakness, dehydration, missed dialysis, shortness of breath, swelling, chest pain, inability to urinate, worsening flank pain, fever, vomiting, palpitations, fainting, confusion, catheter not draining, blood in urine, or worsening pain. Seek urgent care if symptoms worsen.",
  },
  fr: {
    description:
      "Vous avez été pris en charge aux urgences pour un problème rénal, urinaire ou électrolytique. Les symptômes peuvent s'aggraver après le congé.",
    diagnosisInstructions:
      "Suivez les recommandations du clinicien et le suivi selon les directives. Cette note ne remplace pas la documentation clinicien des résultats d'examens.",
    medicationTreatment:
      "Prenez les médicaments uniquement selon la prescription ou les indications reçues pendant cette visite.",
    returnPrecautions:
      "Retournez immédiatement ou appelez le 911 en cas d'incapable de garder les liquides, vomissements, étourdissements, faiblesse, déshydratation, dialyse manquée, essoufflement, enflure, douleur thoracique, incapacité à uriner, douleur au flanc, fièvre, palpitations, évanouissement, confusion, cathéter ne draine pas, sang dans les urines ou douleur croissante. Consultez en urgence si les symptômes s'aggravent.",
  },
} as const;

function syntheticRenalElectrolyteTemplate(
  overrides: Partial<ProviderDischargeTemplate> & Pick<ProviderDischargeTemplate, "id">
): ProviderDischargeTemplate {
  const { id, ...rest } = overrides;
  return syntheticRegistryTemplate({
    id,
    specialtyCategory: "renal_urology",
    riskCategory: "high",
    suggestedText: {
      en: { ...SYNTHETIC_RENAL_ELECTROLYTE_SAFE_TEXT.en },
      fr: { ...SYNTHETIC_RENAL_ELECTROLYTE_SAFE_TEXT.fr },
    },
    defaultFollowUps: [
      {
        ...newDefaultFollowUpRow(),
        id: "renal-pcp",
        specialty: "PRIMARY_CARE",
        timing: "within several days or as directed",
      },
      {
        ...newDefaultFollowUpRow(),
        id: "renal-neph",
        specialty: "NEPHROLOGY",
        timing: "as clinically appropriate",
      },
      {
        ...newDefaultFollowUpRow(),
        id: "renal-uro",
        specialty: "UROLOGY",
        timing: "as clinically appropriate",
      },
    ],
    renalElectrolyteSafety: {
      akiSensitive: true,
      electrolyteSensitive: true,
      dehydrationSensitive: true,
      dialysisSensitive: true,
      renalColicSensitive: true,
      urinaryRetentionSensitive: true,
      utiSensitive: true,
      pyelonephritisSensitive: true,
      hematuriaSensitive: true,
      catheterSensitive: true,
      requiresHydrationPrecautions: true,
      requiresDialysisEscalation: true,
      requiresUrinaryObstructionEscalation: true,
      requiresElectrolyteEscalation: true,
      requiresCatheterPrecautions: true,
      requiresNephrologyFollowUp: true,
      requiresUrologyFollowUp: true,
      requiresResultInterpretationCaution: true,
    },
    ...rest,
  });
}

const SYNTHETIC_ENDOCRINE_METABOLIC_SAFE_TEXT = {
  en: {
    description:
      "You were evaluated in the emergency department for a diabetes or metabolic concern. Symptoms may worsen after discharge.",
    diagnosisInstructions:
      "Follow provider recommendations and follow up as directed. This note does not replace provider documentation of test results.",
    medicationTreatment:
      "Take insulin exactly as directed. Do not skip insulin. Continue medications as prescribed.",
    returnPrecautions:
      "Return immediately or call 911 for worsening weakness, confusion, vomiting, excessive thirst, excessive urination, fainting, seizures, trouble waking up, weakness, unable to keep fluids down, worsening vomiting, dehydration, or dizziness. Seek care for worsening symptoms.",
  },
  fr: {
    description:
      "Vous avez été pris en charge aux urgences pour un problème de diabète ou métabolique. Les symptômes peuvent s'aggraver après le congé.",
    diagnosisInstructions:
      "Suivez les recommandations du clinicien et le suivi selon les directives. Cette note ne remplace pas la documentation clinicien des résultats d'examens.",
    medicationTreatment:
      "Prenez l'insuline exactement comme prescrite. Ne sautez pas l'insuline. Continuez les médicaments selon la prescription.",
    returnPrecautions:
      "Retournez immédiatement ou appelez le 911 en cas de faiblesse qui s'aggrave, confusion, vomissements, soif excessive, urination fréquente, évanouissement, convulsions, difficulté à réveiller, faiblesse, incapable de garder les liquides, déshydratation ou étourdissements. Consultez pour aggravation des symptômes.",
  },
} as const;

const SYNTHETIC_NEUROLOGY_SAFE_TEXT = {
  en: {
    description:
      "You were evaluated in the emergency department for a neurologic concern. Symptoms may change after discharge.",
    diagnosisInstructions:
      "Follow provider recommendations and follow up as directed. This note does not replace provider documentation of imaging or test results.",
    medicationTreatment: "Take medications only as prescribed or directed during this visit.",
    returnPrecautions:
      "Return immediately for worsening weakness, numbness, confusion, trouble speaking, or severe headache. Avoid driving and avoid operating machinery; follow local driving restrictions. If you take a blood thinner and have a head injury or bleeding, seek immediate care. Watch for worsening headache, vomiting, confusion, difficulty waking up, or seizures. Discuss seizure recurrence risks; avoid swimming alone and avoid heights; seek emergency care if concerned. For stroke symptoms including facial droop, weakness, numbness, or trouble speaking, call 911.",
  },
  fr: {
    description:
      "Vous avez été pris en charge aux urgences pour un problème neurologique. Les symptômes peuvent évoluer après le congé.",
    diagnosisInstructions:
      "Suivez les recommandations du clinicien et le suivi selon les directives. Cette note ne remplace pas la documentation clinicien des résultats d'imagerie ou d'examens.",
    medicationTreatment: "Prenez les médicaments uniquement selon la prescription ou les indications reçues.",
    returnPrecautions:
      "Retournez immédiatement en cas de faiblesse qui s'aggrave, engourdissement, confusion, difficulté à parler ou mal de tête sévère. Évitez de conduire et évitez les machines; respectez les restrictions de conduite. Si vous prenez un anticoagulant et avez une blessure à la tête ou un saignement, consultez immédiatement. Surveillez l'aggravation du mal de tête, les vomissements, la confusion, la difficulté à réveiller ou les convulsions. Discutez la récidive de convulsions; évitez de nager seul et évitez les hauteurs; consultez en urgence si inquiétude. En cas de signes d'AVC incluant affaissement du visage, faiblesse, engourdissement ou difficulté à parler, appelez le 911.",
  },
} as const;

function syntheticNeurologyTemplate(
  overrides: Partial<ProviderDischargeTemplate> & Pick<ProviderDischargeTemplate, "id">
): ProviderDischargeTemplate {
  const { id, ...rest } = overrides;
  return syntheticRegistryTemplate({
    id,
    specialtyCategory: "neurology",
    riskCategory: "high",
    suggestedText: {
      en: { ...SYNTHETIC_NEUROLOGY_SAFE_TEXT.en },
      fr: { ...SYNTHETIC_NEUROLOGY_SAFE_TEXT.fr },
    },
    defaultFollowUps: [
      {
        ...newDefaultFollowUpRow(),
        id: "neuro-pcp",
        specialty: "PRIMARY_CARE",
        timing: "within several days or as directed",
      },
      {
        ...newDefaultFollowUpRow(),
        id: "neuro-neuro",
        specialty: "NEUROLOGY",
        timing: "as clinically appropriate",
      },
    ],
    neurologySafety: {
      seizureSensitive: true,
      strokeSensitive: true,
      tiaSensitive: true,
      headacheSensitive: true,
      concussionSensitive: true,
      syncopeSensitive: true,
      alteredMentalStatusSensitive: true,
      anticoagulationSensitive: true,
      neurologicDeficitSensitive: true,
      requiresNeurologicEscalation: true,
      requiresDrivingRestrictionPrecautions: true,
      requiresAnticoagulationPrecautions: true,
      requiresHeadInjuryEscalation: true,
      requiresSeizurePrecautions: true,
      requiresStrokeEscalation: true,
      requiresNeurologyFollowUp: true,
      requiresResultInterpretationCaution: true,
    },
    ...rest,
  });
}

function syntheticEndocrineMetabolicTemplate(
  overrides: Partial<ProviderDischargeTemplate> & Pick<ProviderDischargeTemplate, "id">
): ProviderDischargeTemplate {
  const { id, ...rest } = overrides;
  return syntheticRegistryTemplate({
    id,
    specialtyCategory: "endocrinology",
    riskCategory: "high",
    suggestedText: {
      en: { ...SYNTHETIC_ENDOCRINE_METABOLIC_SAFE_TEXT.en },
      fr: { ...SYNTHETIC_ENDOCRINE_METABOLIC_SAFE_TEXT.fr },
    },
    defaultFollowUps: [
      {
        ...newDefaultFollowUpRow(),
        id: "endo-pcp",
        specialty: "PRIMARY_CARE",
        timing: "within several days or as directed",
      },
      {
        ...newDefaultFollowUpRow(),
        id: "endo-endo",
        specialty: "ENDOCRINOLOGY",
        timing: "as clinically appropriate",
      },
    ],
    endocrineMetabolicSafety: {
      diabetesSensitive: true,
      dkaSensitive: true,
      hhsSensitive: true,
      hypoglycemiaSensitive: true,
      hyperglycemiaSensitive: true,
      dehydrationSensitive: true,
      insulinSensitive: true,
      metabolicSensitive: true,
      endocrineSensitive: true,
      requiresGlucoseEscalation: true,
      requiresHydrationEscalation: true,
      requiresInsulinPrecautions: true,
      requiresNeurologicEscalation: true,
      requiresDiabetesFollowUp: true,
      requiresEndocrinologyFollowUp: true,
      requiresResultInterpretationCaution: true,
    },
    ...rest,
  });
}

describe("edDisposition19Y", () => {
  describe("19Y.2 card model hardening", () => {
    it("new card includes sourceEncounterDiagnosisId", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-abc",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      expect(card.sourceEncounterDiagnosisId).toBe("dx-abc");
    });

    it("new card includes isPrimaryDiagnosis", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-abc",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      expect(card.isPrimaryDiagnosis).toBe(true);
    });

    it("new card includes displayOrder", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-abc",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 3,
        isPrimaryDiagnosis: false,
      });
      expect(card.displayOrder).toBe(3);
    });

    it("first encounter diagnosis is primary by default when normalized", () => {
      const form = normalizeTestForm({
        diagnosisRefs: [{ encounterDiagnosisId: "dx-1", code: "R07.9", label: "Chest pain", isPrimary: true }],
        diagnosisDocs: [
          {
            ...completeCard("doc-1", "dx-1", "R07.9", "Chest pain"),
            isPrimaryDiagnosis: false,
            displayOrder: -1,
          },
        ],
      });
      expect(form.diagnosisDocs[0]!.isPrimaryDiagnosis).toBe(true);
      expect(form.diagnosisDocs[0]!.displayOrder).toBe(0);
    });

    it("legacy encounterDiagnosisId hydrates into sourceEncounterDiagnosisId", () => {
      const form = hydrateProviderDischargeDocumentationForm({
        providerDischargeDiagnosisDocs: [
          {
            id: "d1",
            encounterDiagnosisId: "legacy-dx",
            code: "R07.9",
            displayName: "Chest pain",
            description: "x",
            diagnosisInstructions: "x",
            medicationTreatment: "x",
            returnPrecautions: "x",
            followUps: [{ id: "f1", specialty: "PRIMARY_CARE", name: "PCP", timing: "1 week", phone: "", address: "", comments: "" }],
          },
        ],
      });
      expect(form.diagnosisDocs[0]!.sourceEncounterDiagnosisId).toBe("legacy-dx");
    });

    it("missing displayOrder hydrates from selected diagnosis order", () => {
      const form = normalizeTestForm({
        diagnosisRefs: [
          { encounterDiagnosisId: "dx-a", code: "A", label: "A" },
          { encounterDiagnosisId: "dx-b", code: "B", label: "B" },
        ],
        diagnosisDocs: [
          { ...completeCard("c-b", "dx-b", "B", "B"), displayOrder: -1 },
          { ...completeCard("c-a", "dx-a", "A", "A"), displayOrder: -1 },
        ],
      });
      expect(form.diagnosisDocs.find((d) => d.sourceEncounterDiagnosisId === "dx-a")!.displayOrder).toBe(0);
      expect(form.diagnosisDocs.find((d) => d.sourceEncounterDiagnosisId === "dx-b")!.displayOrder).toBe(1);
    });

    it("missing isPrimaryDiagnosis hydrates with first selected card primary", () => {
      const form = normalizeTestForm({
        diagnosisRefs: [
          { encounterDiagnosisId: "dx-a", code: "A", label: "A", isPrimary: true },
          { encounterDiagnosisId: "dx-b", code: "B", label: "B" },
        ],
        diagnosisDocs: [
          { ...completeCard("c-a", "dx-a", "A", "A"), isPrimaryDiagnosis: false, displayOrder: 0 },
          { ...completeCard("c-b", "dx-b", "B", "B"), isPrimaryDiagnosis: false, displayOrder: 1 },
        ],
      });
      expect(form.diagnosisDocs.find((d) => d.sourceEncounterDiagnosisId === "dx-a")!.isPrimaryDiagnosis).toBe(true);
    });

    it("summary sorts primary first then displayOrder", () => {
      const form = formWithThreeSelected();
      form.diagnosisDocs[1]!.isPrimaryDiagnosis = true;
      form.diagnosisDocs[0]!.isPrimaryDiagnosis = false;
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
        documentedAt: "2026-05-18T18:00:00.000Z",
        documentedByDisplayName: "Dr A",
      });
      const block = buildProviderDischargeDocumentationSummaryBlock(merged, "en");
      const r10Idx = block!.lines.findIndex((l) => l.startsWith("R10.9"));
      const r07Idx = block!.lines.findIndex((l) => l.startsWith("R07.9"));
      expect(r10Idx).toBeGreaterThan(-1);
      expect(r07Idx).toBeGreaterThan(-1);
      expect(r10Idx).toBeLessThan(r07Idx);
      expect(block!.lines[r10Idx]).toContain("primary");
    });

    it("print/summary builder uses sorted selected docs (primary first)", () => {
      const cards = sortProviderDischargeDiagnosisCards([
        completeCard("c2", "dx-2", "R10.9", "Abdominal pain", { displayOrder: 1 }),
        completeCard("c1", "dx-1", "R07.9", "Chest pain", { isPrimaryDiagnosis: true, displayOrder: 0 }),
      ]);
      expect(cards[0]!.code).toBe("R07.9");
      expect(cards[0]!.isPrimaryDiagnosis).toBe(true);
    });
  });

  describe("19Y.2 template registry", () => {
    it("registry file exports PROVIDER_DISCHARGE_TEMPLATE_REGISTRY", () => {
      expect(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.length).toBeGreaterThan(0);
    });

    it("templates are versioned", () => {
      for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
        expect(template.version.trim()).not.toBe("");
      }
    });

    it("templates contain sourceReferences", () => {
      for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
        expect(template.sourceReferences.length).toBeGreaterThan(0);
        expect(template.sourceReferences[0]!.label.trim()).not.toBe("");
      }
    });

    it("exact ICD match beats family match", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R07.9", displayName: "Chest pain" });
      expect(resolved.matchLevel).toBe("icdExact");
      expect(resolved.template.id).toBe("chest_pain_v1");
    });

    it("family match beats keyword match", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R10.9", displayName: "Nausea" });
      expect(resolved.matchLevel).toBe("icdFamily");
      expect(resolved.template.id).toBe("abdominal_pain_v1");
    });

    it("keyword match beats generic fallback", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "Z99.99",
        displayName: "abdominal pain after meal",
      });
      expect(resolved.matchLevel).toBe("keyword");
      expect(resolved.template.id).toBe("abdominal_pain_v1");
    });

    it("generic fallback works when no other match exists", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "Z99.99", displayName: "Unspecified" });
      expect(resolved.matchLevel).toBe("generic");
      expect(resolved.template.id).toBe("generic_ed_discharge_v1");
    });

    it("template application stores templateMeta fields", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-1",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R07.9", displayName: "Chest pain" });
      const next = applyProviderDischargeTemplateToCard(card, resolved, {
        locale: "en",
        providerConfirmed: true,
        actor: { displayName: "Dr Test", appliedAt: "2026-05-18T18:00:00.000Z" },
        overwriteExisting: true,
      });
      expect(next.templateMeta?.templateId).toBe("chest_pain_v1");
      expect(next.templateMeta?.templateVersion).toBe("1.1.0");
      expect(next.templateMeta?.matchLevel).toBe("icdExact");
      expect(next.templateMeta?.sourceReferences.length).toBeGreaterThan(0);
      expect(next.templateMeta?.providerConfirmed).toBe(true);
      expect(next.templateMeta?.templateAppliedHash?.length).toBe(64);
      expect(next.templateMeta?.specialtyCategory).toBe("cardiology");
      expect(next.templateMeta?.riskCategory).toBe("moderate");
    });

    it("applying template does not overwrite non-empty provider text", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-1",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      card.description = "Provider-authored description";
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R07.9", displayName: "Chest pain" });
      const next = applyProviderDischargeTemplateToCard(card, resolved, { locale: "en", overwriteExisting: false });
      expect(next.description).toBe("Provider-authored description");
      expect(next.diagnosisInstructions.length).toBeGreaterThan(0);
    });

    it("legacy education adapter still resolves chest pain template", () => {
      const template = matchProviderDischargeEducationTemplate({ code: "R07.9", label: "Chest pain" });
      expect(template?.id).toBe("chest_pain_v1");
    });

    it("education templates include source metadata for each template", () => {
      for (const template of PROVIDER_DISCHARGE_EDUCATION_TEMPLATES) {
        expect(template.sources.length).toBeGreaterThan(0);
      }
    });
  });

  describe("19Y.2A template governance metadata", () => {
    const chestTemplate = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "chest_pain_v1")!;
    const genericTemplate = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find(
      (t) => t.id === "generic_ed_discharge_v1"
    )!;

    it("applying a template stores templateAppliedHash", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-1",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R07.9", displayName: "Chest pain" });
      const next = applyProviderDischargeTemplateToCard(card, resolved, { locale: "en", overwriteExisting: true });
      expect(next.templateMeta?.templateAppliedHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("templateAppliedHash is deterministic for same template version/content", () => {
      const a = computeProviderDischargeTemplateAppliedHash(chestTemplate, "en");
      const b = computeProviderDischargeTemplateAppliedHash(chestTemplate, "en");
      expect(a).toBe(b);
    });

    it("changing template content changes templateAppliedHash", () => {
      const base = computeProviderDischargeTemplateAppliedHash(chestTemplate, "en");
      const mutated = computeProviderDischargeTemplateAppliedHash({
        ...chestTemplate,
        suggestedText: {
          ...chestTemplate.suggestedText,
          en: { ...chestTemplate.suggestedText.en, description: "Different description text." },
        },
      }, "en");
      expect(mutated).not.toBe(base);
    });

    it("hash input includes sourceReferences", () => {
      const payload = buildProviderDischargeTemplateHashPayload(chestTemplate, "en");
      expect(payload.sourceReferences[0]?.url).toContain("medlineplus.gov");
      const withoutUrl = computeProviderDischargeTemplateAppliedHash({
        ...chestTemplate,
        sourceReferences: [{ label: chestTemplate.sourceReferences[0]!.label }],
      }, "en");
      expect(withoutUrl).not.toBe(computeProviderDischargeTemplateAppliedHash(chestTemplate, "en"));
    });

    it("hash input includes specialtyCategory and riskCategory", () => {
      const withCategories = computeProviderDischargeTemplateAppliedHash(chestTemplate, "en");
      const withoutCategories = computeProviderDischargeTemplateAppliedHash({
        ...chestTemplate,
        specialtyCategory: undefined,
        riskCategory: undefined,
        clinicalReviewStatus: undefined,
        effectiveFrom: undefined,
      }, "en");
      expect(withCategories).not.toBe(withoutCategories);
    });

    it("changing clinicalReviewStatus or effectiveFrom changes templateAppliedHash", () => {
      const base = computeProviderDischargeTemplateAppliedHash(chestTemplate, "en");
      const reviewChanged = computeProviderDischargeTemplateAppliedHash({
        ...chestTemplate,
        clinicalReviewStatus: "reviewed",
      }, "en");
      const dateChanged = computeProviderDischargeTemplateAppliedHash({
        ...chestTemplate,
        effectiveFrom: "2026-06-01",
      }, "en");
      expect(reviewChanged).not.toBe(base);
      expect(dateChanged).not.toBe(base);
    });

    it("hash payload includes governance review and effective dates", () => {
      const payload = buildProviderDischargeTemplateHashPayload(chestTemplate, "en");
      expect(payload.clinicalReviewStatus).toBe("draft");
      expect(payload.effectiveFrom).toBe("2026-05-18");
    });

    it("pure JS SHA-256 matches Node crypto for canonical template payload", () => {
      const canonical = providerDischargeTemplateHashCanonicalString(chestTemplate, "en");
      const nodeHash = createHash("sha256").update(canonical, "utf8").digest("hex");
      expect(computeProviderDischargeTemplateAppliedHash(chestTemplate, "en")).toBe(nodeHash);
    });

    it("existing cards without templateAppliedHash hydrate safely", () => {
      const form = hydrateProviderDischargeDocumentationForm({
        providerDischargeDiagnosisDocs: [
          {
            id: "d1",
            sourceEncounterDiagnosisId: "dx-1",
            code: "R07.9",
            displayName: "Chest pain",
            isPrimaryDiagnosis: true,
            displayOrder: 0,
            description: "Saved text",
            diagnosisInstructions: "Saved",
            medicationTreatment: "Saved",
            returnPrecautions: "Saved",
            followUps: [{ id: "f1", specialty: "PRIMARY_CARE", name: "PCP", timing: "1w", phone: "", address: "", comments: "" }],
            templateMeta: {
              templateId: "chest_pain_v1",
              templateVersion: "1.0.0",
              matchLevel: "icdExact",
              sourceReferences: ["MedlinePlus — Angina"],
            },
          },
        ],
      });
      expect(form.diagnosisDocs[0]!.templateMeta?.templateAppliedHash).toBeUndefined();
      expect(form.diagnosisDocs[0]!.description).toBe("Saved text");
    });

    it("chart export raw dischargeSummaryJson retains templateAppliedHash", () => {
      const form = formWithThreeSelected();
      form.diagnosisDocs[0]!.templateMeta = {
        templateId: "chest_pain_v1",
        templateVersion: "1.0.0",
        matchLevel: "icdExact",
        sourceReferences: ["MedlinePlus — Angina"],
        templateAppliedHash: computeProviderDischargeTemplateAppliedHash(chestTemplate, "en"),
        specialtyCategory: "cardiology",
        riskCategory: "moderate",
      };
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
        documentedAt: "2026-05-18T18:00:00.000Z",
        documentedByDisplayName: "Dr A",
      });
      const doc = (merged.providerDischargeDiagnosisDocs as Record<string, unknown>[])[0]!;
      expect(doc.templateMeta).toMatchObject({
        templateAppliedHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        specialtyCategory: "cardiology",
        riskCategory: "moderate",
      });
    });

    it("summary does not display templateAppliedHash", () => {
      const form = formWithThreeSelected();
      form.diagnosisDocs[0]!.templateMeta = {
        templateId: "chest_pain_v1",
        templateVersion: "1.0.0",
        matchLevel: "icdExact",
        sourceReferences: ["MedlinePlus — Angina"],
        templateAppliedHash: computeProviderDischargeTemplateAppliedHash(chestTemplate, "en"),
        specialtyCategory: "cardiology",
        riskCategory: "moderate",
      };
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
        documentedAt: "2026-05-18T18:00:00.000Z",
        documentedByDisplayName: "Dr A",
      });
      const block = buildProviderDischargeDocumentationSummaryBlock(merged, "en");
      expect(block?.lines.join("\n")).not.toContain("templateAppliedHash");
      expect(block?.lines.join("\n")).not.toMatch(/[a-f0-9]{64}/);
    });

    it("chest pain template has specialtyCategory cardiology", () => {
      expect(chestTemplate.specialtyCategory).toBe("cardiology");
    });

    it("generic template has riskCategory unspecified", () => {
      expect(genericTemplate.riskCategory).toBe("unspecified");
    });

    it("categories are not used for billing/coding decisions", () => {
      const billing = readFileSync(join(webRoot, "../../packages/shared/src/billingCaptureV1.ts"), "utf8");
      expect(billing).not.toContain("specialtyCategory");
      expect(billing).not.toContain("riskCategory");
      expect(billing).not.toContain("templateAppliedHash");
    });

    it("React UI components do not contain template governance metadata", () => {
      const uiFiles = [
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        join(webRoot, "src/features/emergency/EmergencyDispositionPanel.tsx"),
        join(webRoot, "src/features/emergency/providerDischargeDocumentationSummary.ts"),
      ];
      for (const file of uiFiles) {
        const source = readFileSync(file, "utf8");
        expect(source).not.toContain("templateAppliedHash");
        expect(source).not.toContain("specialtyCategory");
        expect(source).not.toContain("riskCategory");
      }
    });
  });

  describe("19Y.1A per-diagnosis behavior (preserved)", () => {
    it("selecting three diagnoses yields three independent cards", () => {
      expect(getSelectedDiagnosisDocs(formWithThreeSelected())).toHaveLength(3);
    });

    it("blocks save when any selected diagnosis is missing required fields", () => {
      const form = formWithThreeSelected();
      form.diagnosisDocs[1]!.description = "";
      expect(validateProviderDischargeDocumentation(form, validationMessages)).not.toBeNull();
    });

    it("allows save when all selected diagnosis cards are complete", () => {
      expect(validateProviderDischargeDocumentation(formWithThreeSelected(), validationMessages)).toBeNull();
    });

    it("legacy single shared fields hydrate into first card safely", () => {
      const form = hydrateProviderDischargeDocumentationForm({
        dischargeDiagnosisSummary: "Legacy description",
        dischargeInstructions: "Legacy instructions",
        medicationInstructions: "Legacy meds",
        returnPrecautions: "Legacy precautions",
        providerDischargeDiagnosisRefs: [
          { encounterDiagnosisId: "dx-legacy", code: "R07.9", label: "Chest pain", isPrimary: true },
        ],
      });
      expect(form.diagnosisDocs[0]!.description).toBe("Legacy description");
      expect(form.diagnosisDocs[0]!.sourceEncounterDiagnosisId).toBe("dx-legacy");
    });

    it("save merge writes structured per-diagnosis docs with hardened metadata", () => {
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, formWithThreeSelected(), {
        documentedAt: "2026-05-18T18:00:00.000Z",
        documentedByDisplayName: "Dr Test",
      });
      const docs = merged.providerDischargeDiagnosisDocs as Record<string, unknown>[];
      expect(docs[0]!.sourceEncounterDiagnosisId).toBeTruthy();
      expect(docs[0]!.isPrimaryDiagnosis).toBe(true);
      expect(typeof docs[0]!.displayOrder).toBe("number");
    });

    it("medication treatment text does not create order/eRx/MAR identifiers", () => {
      const form = formWithThreeSelected();
      form.diagnosisDocs[0]!.medicationTreatment = "Ibuprofen 400 mg PO q6h PRN pain";
      const json = JSON.stringify(
        mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
          documentedAt: new Date().toISOString(),
          documentedByDisplayName: "Dr Test",
        })
      );
      expect(json).not.toContain('"orderId"');
      expect(json).not.toContain('"marAction"');
    });
  });

  describe("19Y.3 Batch 1 ED diagnosis templates", () => {
    const FORBIDDEN_FABRICATED_PATTERNS = [
      /troponin/i,
      /\bACS ruled out\b/i,
      /\bCT (was|is) normal\b/i,
      /\bpatient improved\b/i,
      /\bconsult (was|performed)\b/i,
      /critical care provided/i,
      /\b992\d{2}\b/,
      /\bCPT\b/,
      /\bE\/M level\b/i,
    ];

    const batchTemplates = () =>
      BATCH_1_ED_DISCHARGE_TEMPLATE_IDS.map(
        (id) => PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === id)!
      );

    it("all 6 Batch 1 templates exist", () => {
      expect(BATCH_1_ED_DISCHARGE_TEMPLATE_IDS).toHaveLength(6);
      for (const id of BATCH_1_ED_DISCHARGE_TEMPLATE_IDS) {
        expect(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.some((t) => t.id === id)).toBe(true);
      }
    });

    it("each Batch 1 template has version", () => {
      for (const template of batchTemplates()) {
        expect(template.version.trim()).not.toBe("");
      }
    });

    it("each Batch 1 template has sourceReferences", () => {
      for (const template of batchTemplates()) {
        expect(template.sourceReferences.length).toBeGreaterThan(0);
      }
    });

    it("each Batch 1 template has specialtyCategory", () => {
      for (const template of batchTemplates()) {
        expect(template.specialtyCategory?.trim()).toBeTruthy();
      }
    });

    it("each Batch 1 template has riskCategory", () => {
      for (const template of batchTemplates()) {
        expect(template.riskCategory?.trim()).toBeTruthy();
      }
    });

    it("each Batch 1 template produces deterministic templateAppliedHash", () => {
      for (const template of batchTemplates()) {
        const a = computeProviderDischargeTemplateAppliedHash(template, "en");
        const b = computeProviderDischargeTemplateAppliedHash(template, "en");
        expect(a).toBe(b);
        expect(a).toMatch(/^[a-f0-9]{64}$/);
      }
    });

    it("chest pain exact R07.9 resolves to chest pain template", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R07.9", displayName: "Chest pain" });
      expect(resolved.template.id).toBe("chest_pain_v1");
      expect(resolved.matchLevel).toBe("icdExact");
    });

    it("chest pain R07 family resolves to chest pain template", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R07.2", displayName: "Precordial pain" });
      expect(resolved.template.id).toBe("chest_pain_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("abdominal pain R10 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R10.84", displayName: "Generalized pain" });
      expect(resolved.template.id).toBe("abdominal_pain_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("headache R51 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R51.9", displayName: "Headache" });
      expect(resolved.template.id).toBe("headache_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("URI/cough J06 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "J06.9", displayName: "URI" });
      expect(resolved.template.id).toBe("uri_cough_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("URI/cough R05 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R05.9", displayName: "Cough" });
      expect(resolved.template.id).toBe("uri_cough_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("UTI N39.0 exact resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "N39.0", displayName: "UTI" });
      expect(resolved.template.id).toBe("uti_v1");
      expect(resolved.matchLevel).toBe("icdExact");
    });

    it("UTI R30 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R30.0", displayName: "Dysuria" });
      expect(resolved.template.id).toBe("uti_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("wound/laceration injury families resolve correctly", () => {
      for (const code of ["S01.01", "S41.012", "S61.1", "T14.1"]) {
        const resolved = resolveProviderDischargeTemplateForDiagnosis({ code, displayName: "Laceration" });
        expect(resolved.template.id).toBe("wound_laceration_v1");
        expect(["icdExact", "icdFamily"]).toContain(resolved.matchLevel);
      }
    });

    it("exact match beats family", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "N39.0", displayName: "UTI" });
      expect(resolved.matchLevel).toBe("icdExact");
    });

    it("family beats keyword", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R51.9", displayName: "migraine headache" });
      expect(resolved.matchLevel).toBe("icdFamily");
      expect(resolved.template.id).toBe("headache_v1");
    });

    it("keyword beats generic", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "Z99.99", displayName: "persistent cough" });
      expect(resolved.matchLevel).toBe("keyword");
      expect(resolved.template.id).toBe("uri_cough_v1");
    });

    it("generic fallback is hospital-grade (not empty)", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "Z99.99", displayName: "Unspecified" });
      expect(resolved.matchLevel).toBe("generic");
      const body = getProviderDischargeSuggestedTextBody(resolved.template, "en");
      expect(body.description).toContain("[diagnosis]");
      expect(body.returnPrecautions).toContain("Return to the emergency department immediately");
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-generic",
        code: "Z99.99",
        displayName: "Unspecified",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "en",
      });
      expect(card.description).toContain("Unspecified");
      expect(card.diagnosisInstructions.trim().length).toBeGreaterThan(20);
      expect(card.medicationTreatment).toContain("Do not start, stop, or change");
    });

    it("template text does not contain fabricated test/result language", () => {
      for (const template of batchTemplates()) {
        const blob = JSON.stringify(template.suggestedText.en);
        for (const pattern of FORBIDDEN_FABRICATED_PATTERNS) {
          expect(blob).not.toMatch(pattern);
        }
      }
    });

    it("template text does not contain billing code / CPT / E/M level language", () => {
      for (const template of batchTemplates()) {
        const blob = JSON.stringify(template);
        expect(blob).not.toMatch(/\b992\d{2}\b/);
        expect(blob).not.toMatch(/\bCPT\b/);
        expect(blob).not.toMatch(/E\/M level/i);
      }
    });

    it("React UI files do not contain template paragraphs", () => {
      const uiSource = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      for (const fragment of PROVIDER_DISCHARGE_REGISTRY_PARAGRAPH_FRAGMENTS) {
        expect(uiSource).not.toContain(fragment);
      }
    });

    it("applying template fills diagnosis-card fields only", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-1",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R07.9", displayName: "Chest pain" });
      const next = applyProviderDischargeTemplateToCard(card, resolved, { locale: "en", overwriteExisting: true });
      expect(next.description.trim()).not.toBe("");
      expect(next.diagnosisInstructions.trim()).not.toBe("");
      expect(next.medicationTreatment.trim()).not.toBe("");
      expect(next.returnPrecautions).toBe("");
      expect(next.followUps).toEqual([]);
    });

    it("return precautions/follow-up merge into shared bottom planning only", () => {
      const form = emptyProviderDischargeDocumentationForm();
      const chest = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "chest_pain_v1")!;
      const merged = mergeTemplateSharedFieldsIntoForm(form, extractSharedFieldsFromTemplate(chest, "en"));
      expect(merged.returnPrecautions).toContain("Return immediately");
      expect(merged.followUps.length).toBeGreaterThan(0);
    });

    it("provider-entered text is not overwritten on template apply", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-1",
        code: "R51.9",
        displayName: "Headache",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      card.description = "Clinician note retained";
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R51.9", displayName: "Headache" });
      const next = applyProviderDischargeTemplateToCard(card, resolved, { locale: "en", overwriteExisting: false });
      expect(next.description).toBe("Clinician note retained");
    });
  });

  describe("19Y.4 Batch 2 high-volume ED diagnosis templates", () => {
    const batch2Templates = () =>
      BATCH_2_ED_DISCHARGE_TEMPLATE_IDS.map(
        (id) => PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === id)!
      );

    it("all 8 Batch 2 templates exist", () => {
      expect(BATCH_2_ED_DISCHARGE_TEMPLATE_IDS).toHaveLength(8);
      for (const id of BATCH_2_ED_DISCHARGE_TEMPLATE_IDS) {
        expect(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.some((t) => t.id === id)).toBe(true);
      }
    });

    it("each Batch 2 template has governance metadata", () => {
      for (const template of batch2Templates()) {
        expect(template.version.trim()).not.toBe("");
        expect(template.clinicalReviewStatus).toBe("draft");
        expect(template.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(template.sourceReferences.length).toBeGreaterThan(0);
        expect(template.specialtyCategory?.trim()).toBeTruthy();
        expect(template.riskCategory?.trim()).toBeTruthy();
      }
    });

    it("all Batch 2 templates pass registry validator", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("Batch 2 registry has no unsafe phrases", () => {
      for (const template of batch2Templates()) {
        expect(scanProviderDischargeTemplateUnsafePhrases(template)).toEqual([]);
      }
    });

    it("nausea/vomiting R11 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R11.2", displayName: "Nausea" });
      expect(resolved.template.id).toBe("nausea_vomiting_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("nausea/vomiting keyword resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "Z99.99", displayName: "persistent vomiting" });
      expect(resolved.template.id).toBe("nausea_vomiting_v1");
      expect(resolved.matchLevel).toBe("keyword");
    });

    it("gastroenteritis R19.7 exact resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R19.7", displayName: "Diarrhea" });
      expect(resolved.template.id).toBe("gastroenteritis_v1");
      expect(resolved.matchLevel).toBe("icdExact");
    });

    it("gastroenteritis A08 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "A08.4", displayName: "Viral gastroenteritis" });
      expect(resolved.template.id).toBe("gastroenteritis_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("back pain M54 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "M54.5", displayName: "Low back pain" });
      expect(resolved.template.id).toBe("back_pain_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("dental pain keyword resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "Z99.99", displayName: "severe toothache" });
      expect(resolved.template.id).toBe("dental_pain_v1");
      expect(resolved.matchLevel).toBe("keyword");
    });

    it("otitis/pharyngitis H66 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "H66.9", displayName: "Otitis media" });
      expect(resolved.template.id).toBe("otitis_pharyngitis_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("hypertension I10 exact resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "I10", displayName: "Hypertension" });
      expect(resolved.template.id).toBe("hypertension_v1");
      expect(resolved.matchLevel).toBe("icdExact");
    });

    it("cellulitis L03 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "L03.90", displayName: "Cellulitis" });
      expect(resolved.template.id).toBe("cellulitis_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("dehydration E86.0 exact resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "E86.0", displayName: "Dehydration" });
      expect(resolved.template.id).toBe("dehydration_v1");
      expect(resolved.matchLevel).toBe("icdExact");
    });

    it("dehydration keyword resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "Z99.99", displayName: "volume depletion" });
      expect(resolved.template.id).toBe("dehydration_v1");
      expect(resolved.matchLevel).toBe("keyword");
    });

    it("generic fallback still works after Batch 2 expansion", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "Z99.99", displayName: "Unspecified" });
      expect(resolved.matchLevel).toBe("generic");
    });

    it("applying Batch 2 template fills diagnosis-card fields only", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-1",
        code: "R11.2",
        displayName: "Nausea and vomiting",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R11.2", displayName: "Nausea and vomiting" });
      const next = applyProviderDischargeTemplateToCard(card, resolved, { locale: "en", overwriteExisting: true });
      expect(next.description.trim()).not.toBe("");
      expect(next.returnPrecautions).toBe("");
      expect(next.followUps).toEqual([]);
    });

    it("Batch 2 shared return precautions merge at bottom only", () => {
      const form = emptyProviderDischargeDocumentationForm();
      const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "dehydration_v1")!;
      const merged = mergeTemplateSharedFieldsIntoForm(form, extractSharedFieldsFromTemplate(template, "en"));
      expect(merged.returnPrecautions).toContain("cannot keep fluids down");
      expect(merged.followUps.length).toBeGreaterThan(0);
    });

    it("provider-entered text is not overwritten on Batch 2 apply", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-1",
        code: "M54.5",
        displayName: "Back pain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      card.description = "Clinician-authored back pain note";
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "M54.5", displayName: "Back pain" });
      const next = applyProviderDischargeTemplateToCard(card, resolved, { locale: "en", overwriteExisting: false });
      expect(next.description).toBe("Clinician-authored back pain note");
    });

    it("React UI does not contain Batch 2 template paragraphs", () => {
      const uiSource = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      for (const fragment of PROVIDER_DISCHARGE_REGISTRY_PARAGRAPH_FRAGMENTS) {
        expect(uiSource).not.toContain(fragment);
      }
    });
  });

  describe("19Y.5 Batch 3 moderate-risk ED diagnosis templates", () => {
    const batch3Templates = () =>
      BATCH_3_ED_DISCHARGE_TEMPLATE_IDS.map(
        (id) => PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === id)!
      );

    it("all 10 Batch 3 templates exist", () => {
      expect(BATCH_3_ED_DISCHARGE_TEMPLATE_IDS).toHaveLength(10);
      for (const id of BATCH_3_ED_DISCHARGE_TEMPLATE_IDS) {
        expect(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.some((t) => t.id === id)).toBe(true);
      }
    });

    it("each Batch 3 template has EN and FR suggestedText", () => {
      for (const template of batch3Templates()) {
        expect(template.suggestedText.en.description.trim()).not.toBe("");
        expect(template.suggestedText.fr.description.trim()).not.toBe("");
      }
    });

    it("each Batch 3 template has governance metadata", () => {
      for (const template of batch3Templates()) {
        expect(template.version.trim()).not.toBe("");
        expect(template.clinicalReviewStatus).toBe("draft");
        expect(template.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(template.sourceReferences.length).toBeGreaterThan(0);
        expect(template.specialtyCategory?.trim()).toBeTruthy();
        expect(template.riskCategory?.trim()).toBeTruthy();
      }
    });

    it("all Batch 3 templates pass registry validator", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("Batch 3 registry has no unsafe phrases in EN or FR", () => {
      for (const template of batch3Templates()) {
        expect(scanProviderDischargeTemplateUnsafePhrases(template, "en")).toEqual([]);
        expect(scanProviderDischargeTemplateUnsafePhrases(template, "fr")).toEqual([]);
      }
    });

    it("asthma J45 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "J45.909", displayName: "Asthma" });
      expect(resolved.template.id).toBe("asthma_exacerbation_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("asthma keyword resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "Z99.99", displayName: "wheezing" });
      expect(resolved.template.id).toBe("asthma_exacerbation_v1");
      expect(resolved.matchLevel).toBe("keyword");
    });

    it("COPD J44 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "J44.9", displayName: "COPD" });
      expect(resolved.template.id).toBe("copd_exacerbation_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("bronchitis J20 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "J20.9", displayName: "Bronchitis" });
      expect(resolved.template.id).toBe("bronchitis_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("pneumonia J18 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "J18.9", displayName: "Pneumonia" });
      expect(resolved.template.id).toBe("pneumonia_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("syncope R55 exact resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R55", displayName: "Syncope" });
      expect(resolved.template.id).toBe("syncope_v1");
      expect(resolved.matchLevel).toBe("icdExact");
    });

    it("dizziness R42 exact resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R42", displayName: "Dizziness" });
      expect(resolved.template.id).toBe("vertigo_dizziness_v1");
      expect(resolved.matchLevel).toBe("icdExact");
    });

    it("vertigo H81 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "H81.10", displayName: "Vertigo" });
      expect(resolved.template.id).toBe("vertigo_dizziness_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("kidney stone N20 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "N20.0", displayName: "Kidney stone" });
      expect(resolved.template.id).toBe("kidney_stone_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("constipation K59 exact resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "K59.00", displayName: "Constipation" });
      expect(resolved.template.id).toBe("constipation_v1");
      expect(resolved.matchLevel).toBe("icdExact");
    });

    it("allergic reaction T78.40 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "T78.40XA", displayName: "Allergic reaction" });
      expect(resolved.template.id).toBe("allergic_reaction_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("allergic reaction L50 keyword resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "L50.9", displayName: "hives" });
      expect(resolved.template.id).toBe("allergic_reaction_v1");
      expect(["icdFamily", "keyword"]).toContain(resolved.matchLevel);
    });

    it("minor head injury S06.0 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "S06.0X0A", displayName: "Concussion" });
      expect(resolved.template.id).toBe("minor_head_injury_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("exact match beats family when both apply", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R55", displayName: "Fainting" });
      expect(resolved.template.id).toBe("syncope_v1");
      expect(resolved.matchLevel).toBe("icdExact");
    });

    it("applying Batch 3 template fills diagnosis-card fields only", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-1",
        code: "J45.909",
        displayName: "Asthma exacerbation",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "J45.909", displayName: "Asthma exacerbation" });
      const next = applyProviderDischargeTemplateToCard(card, resolved, { locale: "en", overwriteExisting: true });
      expect(next.description.trim()).not.toBe("");
      expect(next.returnPrecautions).toBe("");
      expect(next.followUps).toEqual([]);
    });

    it("Batch 3 shared return precautions merge at bottom only", () => {
      const form = emptyProviderDischargeDocumentationForm();
      const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "pneumonia_v1")!;
      const merged = mergeTemplateSharedFieldsIntoForm(form, extractSharedFieldsFromTemplate(template, "en"));
      expect(merged.returnPrecautions).toContain("shortness of breath");
      expect(merged.followUps.length).toBeGreaterThan(0);
    });

    it("provider-entered text is not overwritten on Batch 3 apply", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-1",
        code: "R55",
        displayName: "Syncope",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      card.description = "Clinician syncope note";
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R55", displayName: "Syncope" });
      const next = applyProviderDischargeTemplateToCard(card, resolved, { locale: "en", overwriteExisting: false });
      expect(next.description).toBe("Clinician syncope note");
    });

    it("React UI does not contain Batch 3 template paragraphs", () => {
      const uiSource = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      for (const fragment of PROVIDER_DISCHARGE_REGISTRY_PARAGRAPH_FRAGMENTS) {
        expect(uiSource).not.toContain(fragment);
      }
    });
  });

  describe("19Y.5A discharge template autofill correctness", () => {
    const woundTemplate = () => PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "wound_laceration_v1")!;
    const asthmaTemplate = () => PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "asthma_exacerbation_v1")!;
    const bronchitisTemplate = () => PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "bronchitis_v1")!;

    it("J45.901 resolves to asthma_exacerbation_v1", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "J45.901",
        displayName: "Asthma exacerbation",
      });
      expect(resolved.template.id).toBe("asthma_exacerbation_v1");
    });

    it("J45.901 applied EN text contains asthma/breathing language", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-asthma",
        code: "J45.901",
        displayName: "Asthma exacerbation",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "en",
      });
      const blob = `${card.description} ${card.diagnosisInstructions}`.toLowerCase();
      expect(blob).toMatch(/asthma|wheezing|breathing/);
    });

    it("J45.901 applied EN text does NOT contain wound/laceration/dressing language", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-asthma",
        code: "J45.901",
        displayName: "Asthma exacerbation",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "en",
      });
      const blob = `${card.description} ${card.diagnosisInstructions} ${card.medicationTreatment}`.toLowerCase();
      expect(blob).not.toMatch(/wound|laceration|dressing/);
    });

    it("J45.901 applied FR text contains asthma/asthme language", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-asthma",
        code: "J45.901",
        displayName: "Asthma exacerbation",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "fr",
      });
      const blob = `${card.description} ${card.diagnosisInstructions}`.toLowerCase();
      expect(blob).toMatch(/asthme|respiratoires/);
    });

    it("J45.901 applied FR text does NOT contain plaie/lacération/pansement", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-asthma",
        code: "J45.901",
        displayName: "Asthma exacerbation",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "fr",
      });
      const blob = `${card.description} ${card.diagnosisInstructions} ${card.medicationTreatment}`.toLowerCase();
      expect(blob).not.toMatch(/plaie|lacération|pansement/);
    });

    it("J40 resolves to bronchitis_v1", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "J40",
        displayName: "Bronchitis",
      });
      expect(resolved.template.id).toBe("bronchitis_v1");
    });

    it("J40 applied EN text contains bronchitis/cough language", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-bronch",
        code: "J40",
        displayName: "Bronchitis",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "en",
      });
      const blob = `${card.description} ${card.diagnosisInstructions}`.toLowerCase();
      expect(blob).toMatch(/bronchitis|cough|breathing/);
    });

    it("J40 applied EN text does NOT contain wound/laceration/dressing language", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-bronch",
        code: "J40",
        displayName: "Bronchitis",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "en",
      });
      const blob = `${card.description} ${card.diagnosisInstructions} ${card.medicationTreatment}`.toLowerCase();
      expect(blob).not.toMatch(/wound|laceration|dressing/);
    });

    it("J40 applied FR text contains bronchite/toux language", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-bronch",
        code: "J40",
        displayName: "Bronchitis",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "fr",
      });
      const blob = `${card.description} ${card.diagnosisInstructions}`.toLowerCase();
      expect(blob).toMatch(/bronchite|toux/);
    });

    it("J40 applied FR text does NOT contain plaie/lacération/pansement", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-bronch",
        code: "J40",
        displayName: "Bronchitis",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "fr",
      });
      const blob = `${card.description} ${card.diagnosisInstructions} ${card.medicationTreatment}`.toLowerCase();
      expect(blob).not.toMatch(/plaie|lacération|pansement/);
    });

    it("wound/laceration diagnoses still resolve to wound_laceration_v1", () => {
      for (const code of ["S01.01", "S41.012", "T14.1"]) {
        const resolved = resolveProviderDischargeTemplateForDiagnosis({ code, displayName: "Laceration" });
        expect(resolved.template.id).toBe("wound_laceration_v1");
      }
    });

    it("wound/laceration text still contains wound/laceration language", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-wound",
        code: "S01.01",
        displayName: "Laceration",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "en",
      });
      const blob = `${card.description} ${card.diagnosisInstructions}`.toLowerCase();
      expect(blob).toMatch(/wound|laceration/);
    });

    it("every registry template passes expected content marker validation", () => {
      for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
        expect(validateProviderDischargeTemplateContentIntegrity(template)).toEqual([]);
      }
    });

    it("every non-generic registry template has a content integrity rule", () => {
      for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
        if (template.id === "generic_ed_discharge_v1") continue;
        expect(PROVIDER_DISCHARGE_TEMPLATE_CONTENT_INTEGRITY[template.id]).toBeTruthy();
      }
    });

    it("wound template body fails asthma integrity if mis-pointed", () => {
      expect(foreignTemplateBodyFailsIntegrityRule(woundTemplate(), "asthma_exacerbation_v1")).toBe(true);
      expect(foreignTemplateBodyFailsIntegrityRule(asthmaTemplate(), "asthma_exacerbation_v1")).toBe(false);
    });

    it("resolver returns distinct template IDs for asthma, bronchitis, wound, chest pain", () => {
      const ids = [
        resolveProviderDischargeTemplateForDiagnosis({ code: "J45.901", displayName: "Asthma exacerbation" }).template.id,
        resolveProviderDischargeTemplateForDiagnosis({ code: "J40", displayName: "Bronchitis" }).template.id,
        resolveProviderDischargeTemplateForDiagnosis({ code: "S01.01", displayName: "Laceration" }).template.id,
        resolveProviderDischargeTemplateForDiagnosis({ code: "R07.9", displayName: "Chest pain" }).template.id,
      ];
      expect(new Set(ids).size).toBe(4);
    });

    it("ensure card sync updates only the matching diagnosis card with correct template", () => {
      const woundCard = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-shared",
        code: "S01.01",
        displayName: "Laceration",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "en",
      });
      const form = emptyProviderDischargeDocumentationForm();
      form.diagnosisDocs = [woundCard];

      const asthmaRef = {
        encounterDiagnosisId: "dx-shared",
        code: "J45.901",
        label: "Asthma exacerbation",
        isPrimary: true,
      };
      const synced = ensureProviderDischargeCardForRef(form, asthmaRef, {
        applyTemplate: true,
        locale: "en",
        isPrimary: true,
        displayOrder: 0,
      });
      expect(synced.id).toBe(woundCard.id);
      expect(synced.templateMeta?.templateId).toBe("asthma_exacerbation_v1");
      expect(synced.description.toLowerCase()).toContain("asthma");
      expect(synced.description.toLowerCase()).not.toContain("laceration");
    });

    it("ensure card sync cannot keep wound text on asthma card after diagnosis identity change", () => {
      const form = emptyProviderDischargeDocumentationForm();
      const staleCard = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-shared",
        code: "S01.01",
        displayName: "Laceration",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "en",
      });
      staleCard.code = "J45.901";
      staleCard.displayName = "Asthma exacerbation";
      form.diagnosisDocs = [staleCard];

      const ref = {
        encounterDiagnosisId: "dx-shared",
        code: "J45.901",
        label: "Asthma exacerbation",
        isPrimary: true,
      };
      const synced = ensureProviderDischargeCardForRef(form, ref, {
        applyTemplate: true,
        locale: "en",
        isPrimary: true,
        displayOrder: 0,
      });
      expect(expectedProviderDischargeTemplateIdForDiagnosis("J45.901", "Asthma exacerbation")).toBe(
        "asthma_exacerbation_v1"
      );
      expect(synced.description.toLowerCase()).toContain("asthma");
      expect(synced.description.toLowerCase()).not.toMatch(/wound|laceration|dressing/);
    });

    it("shared return precautions/follow-up still merge at bottom only", () => {
      const form = emptyProviderDischargeDocumentationForm();
      const template = bronchitisTemplate();
      const merged = mergeTemplateSharedFieldsIntoForm(form, extractSharedFieldsFromTemplate(template, "en"));
      expect(merged.returnPrecautions.trim()).not.toBe("");
      expect(form.diagnosisDocs).toEqual([]);
    });

    it("provider-entered text is not overwritten unless explicit refresh", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-1",
        code: "J45.901",
        displayName: "Asthma exacerbation",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: false,
        locale: "en",
      });
      card.description = "Clinician-authored asthma note";
      card.templateMeta = {
        templateId: "asthma_exacerbation_v1",
        templateVersion: "1.0.0",
        matchLevel: "icdFamily",
        sourceReferences: [],
        providerConfirmed: true,
      };
      const next = applyProviderDischargeTemplateToCardByDiagnosis(card, {
        locale: "en",
        overwriteExisting: false,
      });
      expect(next.description).toBe("Clinician-authored asthma note");
    });

    it("legacy wound flat fields re-sync to asthma template when diagnosis ref changes", () => {
      const form = hydrateProviderDischargeDocumentationForm({
        dischargeDiagnosisSummary: "Your laceration or wound was evaluated in the emergency department.",
        dischargeInstructions: "Keep the wound clean and dry.",
        medicationInstructions: "Take wound-related antibiotics only as prescribed.",
        providerDischargeDiagnosisRefs: [
          { encounterDiagnosisId: "dx-legacy", code: "J45.901", label: "Asthma exacerbation", isPrimary: true },
        ],
      });
      expect(form.diagnosisDocs[0]!.code).toBe("J45.901");
      expect(form.diagnosisDocs[0]!.description.toLowerCase()).toContain("laceration");

      const synced = ensureProviderDischargeCardForRef(form, form.diagnosisRefs[0]!, {
        applyTemplate: true,
        locale: "en",
        isPrimary: true,
        displayOrder: 0,
      });
      expect(synced.templateMeta?.templateId).toBe("asthma_exacerbation_v1");
      expect(synced.description.toLowerCase()).toContain("asthma");
      expect(synced.description.toLowerCase()).not.toContain("laceration");
    });
  });

  describe("19Y.5B diagnosis identity immutability guard", () => {
    it("new cards stamp immutable creation identity and sync version", () => {
      const form = emptyProviderDischargeDocumentationForm();
      const ref = {
        encounterDiagnosisId: "dx-new",
        code: "J45.901",
        label: "Asthma exacerbation",
        isPrimary: true,
      };
      const card = ensureProviderDischargeCardForRef(form, ref, {
        applyTemplate: true,
        locale: "en",
        isPrimary: true,
        displayOrder: 0,
      });
      expect(card.resolvedDiagnosisCodeAtCreation).toBe("J45.901");
      expect(card.resolvedDiagnosisLabelAtCreation).toBe("Asthma exacerbation");
      expect(card.resolvedTemplateIdAtCreation).toBe("asthma_exacerbation_v1");
      expect(card.cardTemplateSyncVersion).toBe(PROVIDER_DISCHARGE_CARD_TEMPLATE_SYNC_VERSION);
    });

    it("creation identity fields are not overwritten on later sync", () => {
      const form = emptyProviderDischargeDocumentationForm();
      const woundRef = {
        encounterDiagnosisId: "dx-shared",
        code: "S01.01",
        label: "Laceration",
        isPrimary: true,
      };
      const woundCard = ensureProviderDischargeCardForRef(form, woundRef, {
        applyTemplate: true,
        locale: "en",
        isPrimary: true,
        displayOrder: 0,
      });
      expect(woundCard.resolvedDiagnosisCodeAtCreation).toBe("S01.01");
      expect(woundCard.resolvedTemplateIdAtCreation).toBe("wound_laceration_v1");

      const asthmaRef = {
        encounterDiagnosisId: "dx-shared",
        code: "J45.901",
        label: "Asthma exacerbation",
        isPrimary: true,
      };
      form.diagnosisDocs = [woundCard];
      const synced = ensureProviderDischargeCardForRef(form, asthmaRef, {
        applyTemplate: true,
        locale: "en",
        isPrimary: true,
        displayOrder: 0,
      });
      expect(synced.resolvedDiagnosisCodeAtCreation).toBe("S01.01");
      expect(synced.resolvedDiagnosisLabelAtCreation).toBe("Laceration");
      expect(synced.resolvedTemplateIdAtCreation).toBe("wound_laceration_v1");
      expect(synced.code).toBe("J45.901");
      expect(synced.templateMeta?.templateId).toBe("asthma_exacerbation_v1");
    });

    it("identity validator allows auto-sync when diagnosis drifts and providerConfirmed is false", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-1",
        code: "S01.01",
        displayName: "Laceration",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "en",
      });
      const stamped = stampProviderDischargeCardCreationIdentity(card, {
        code: "S01.01",
        label: "Laceration",
        templateId: "wound_laceration_v1",
      });
      const ref = {
        encounterDiagnosisId: "dx-1",
        code: "J45.901",
        label: "Asthma exacerbation",
        isPrimary: true,
      };
      const evaluation = evaluateProviderDischargeCardIdentitySync(stamped, ref);
      expect(evaluation.diagnosisIdentityDrifted).toBe(true);
      expect(evaluation.allowAutoSync).toBe(true);
      expect(evaluation.staleDiagnosisIdentityWarning).toBe(false);
    });

    it("identity validator surfaces warning-only state when providerConfirmed is true", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-1",
        code: "S01.01",
        displayName: "Laceration",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "en",
      });
      card.templateMeta = {
        ...card.templateMeta!,
        providerConfirmed: true,
      };
      const stamped = stampProviderDischargeCardCreationIdentity(card, {
        code: "S01.01",
        label: "Laceration",
        templateId: "wound_laceration_v1",
      });
      const ref = {
        encounterDiagnosisId: "dx-1",
        code: "J45.901",
        label: "Asthma exacerbation",
        isPrimary: true,
      };
      const evaluation = evaluateProviderDischargeCardIdentitySync(stamped, ref);
      expect(evaluation.diagnosisIdentityDrifted).toBe(true);
      expect(evaluation.allowAutoSync).toBe(false);
      expect(evaluation.staleDiagnosisIdentityWarning).toBe(true);

      const form = emptyProviderDischargeDocumentationForm();
      form.diagnosisDocs = [stamped];
      const synced = ensureProviderDischargeCardForRef(form, ref, {
        applyTemplate: true,
        locale: "en",
        isPrimary: true,
        displayOrder: 0,
      });
      expect(synced.staleDiagnosisIdentityWarning).toBe(true);
      expect(synced.description.toLowerCase()).toContain("laceration");
      expect(synced.templateMeta?.templateId).toBe("wound_laceration_v1");
    });

    it("creation identity metadata persists through save merge", () => {
      const form = emptyProviderDischargeDocumentationForm();
      const ref = {
        encounterDiagnosisId: "dx-save",
        code: "J40",
        label: "Bronchitis",
        isPrimary: true,
      };
      const card = ensureProviderDischargeCardForRef(form, ref, {
        applyTemplate: true,
        locale: "en",
        isPrimary: true,
        displayOrder: 0,
      });
      form.diagnosisRefs = [ref];
      form.diagnosisDocs = [card];
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
        documentedAt: "2026-05-18T18:00:00.000Z",
        documentedByDisplayName: "Dr Test",
      });
      const docs = merged.providerDischargeDiagnosisDocs as Record<string, unknown>[];
      expect(docs[0]!.resolvedDiagnosisCodeAtCreation).toBe("J40");
      expect(docs[0]!.resolvedDiagnosisLabelAtCreation).toBe("Bronchitis");
      expect(docs[0]!.resolvedTemplateIdAtCreation).toBe("bronchitis_v1");
      expect(docs[0]!.cardTemplateSyncVersion).toBe(PROVIDER_DISCHARGE_CARD_TEMPLATE_SYNC_VERSION);
    });

    it("legacy cards backfill creation identity once without mutating after drift", () => {
      const legacy = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-legacy",
        code: "S01.01",
        displayName: "Laceration",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "en",
      });
      expect(legacy.resolvedDiagnosisCodeAtCreation).toBeUndefined();

      const form = emptyProviderDischargeDocumentationForm();
      form.diagnosisDocs = [legacy];
      const ref = {
        encounterDiagnosisId: "dx-legacy",
        code: "S01.01",
        label: "Laceration",
        isPrimary: true,
      };
      const synced = ensureProviderDischargeCardForRef(form, ref, {
        applyTemplate: false,
        locale: "en",
        isPrimary: true,
        displayOrder: 0,
      });
      expect(synced.resolvedDiagnosisCodeAtCreation).toBe("S01.01");
      expect(synced.cardTemplateSyncVersion).toBe(PROVIDER_DISCHARGE_CARD_TEMPLATE_SYNC_VERSION);

      const driftRef = { ...ref, code: "J40", label: "Bronchitis" };
      const drifted = ensureProviderDischargeCardForRef(
        { ...form, diagnosisDocs: [synced] },
        driftRef,
        { applyTemplate: true, locale: "en", isPrimary: true, displayOrder: 0 }
      );
      expect(drifted.resolvedDiagnosisCodeAtCreation).toBe("S01.01");
      expect(drifted.code).toBe("J40");
    });
  });

  describe("19Y.6 Batch 4 higher-risk ED diagnosis templates", () => {
    const batch4Templates = () =>
      BATCH_4_ED_DISCHARGE_TEMPLATE_IDS.map(
        (id) => PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === id)!
      );

    it("all 10 Batch 4 templates exist", () => {
      expect(BATCH_4_ED_DISCHARGE_TEMPLATE_IDS).toHaveLength(10);
      for (const id of BATCH_4_ED_DISCHARGE_TEMPLATE_IDS) {
        expect(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.some((t) => t.id === id)).toBe(true);
      }
    });

    it("each Batch 4 template has EN and FR suggestedText", () => {
      for (const template of batch4Templates()) {
        expect(template.suggestedText.en.description.trim()).not.toBe("");
        expect(template.suggestedText.fr.description.trim()).not.toBe("");
      }
    });

    it("each Batch 4 template has governance metadata", () => {
      for (const template of batch4Templates()) {
        expect(template.version.trim()).not.toBe("");
        expect(template.clinicalReviewStatus).toBe("draft");
        expect(template.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(template.sourceReferences.length).toBeGreaterThan(0);
        expect(template.specialtyCategory?.trim()).toBeTruthy();
        expect(template.riskCategory?.trim()).toBeTruthy();
      }
    });

    it("all Batch 4 templates pass registry validator", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("Batch 4 registry has no unsafe phrases in EN or FR", () => {
      for (const template of batch4Templates()) {
        expect(scanProviderDischargeTemplateUnsafePhrases(template, "en")).toEqual([]);
        expect(scanProviderDischargeTemplateUnsafePhrases(template, "fr")).toEqual([]);
      }
    });

    it("unsafe phrase scanner blocks stroke ruled out language", () => {
      const hits = scanProviderDischargeTemplateUnsafePhrases(
        syntheticRegistryTemplate({
          id: "unsafe-stroke-ruled-out",
          suggestedText: {
            en: {
              description: "Stroke ruled out today.",
              diagnosisInstructions: "Rest.",
              medicationTreatment: "None.",
              returnPrecautions: "Return if worse.",
            },
            fr: {
              description: "Texte.",
              diagnosisInstructions: "Repos.",
              medicationTreatment: "Aucun.",
              returnPrecautions: "Reconsultez.",
            },
          },
        }),
        "en"
      );
      expect(hits.length).toBeGreaterThan(0);
    });

    it("TIA/stroke-like G45 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "G45.9", displayName: "TIA" });
      expect(resolved.template.id).toBe("tia_stroke_like_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("TIA/stroke-like keyword resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "Z99.99",
        displayName: "transient ischemic attack",
      });
      expect(resolved.template.id).toBe("tia_stroke_like_v1");
      expect(resolved.matchLevel).toBe("keyword");
    });

    it("seizure R56 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R56.9", displayName: "Seizure" });
      expect(resolved.template.id).toBe("seizure_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("palpitations R00.2 exact resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R00.2", displayName: "Palpitations" });
      expect(resolved.template.id).toBe("palpitations_v1");
      expect(resolved.matchLevel).toBe("icdExact");
    });

    it("shortness of breath R06.02 exact resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R06.02", displayName: "Dyspnea" });
      expect(resolved.template.id).toBe("shortness_of_breath_v1");
      expect(resolved.matchLevel).toBe("icdExact");
    });

    it("chest wall pain R07.89 exact resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R07.89", displayName: "Chest wall pain" });
      expect(resolved.template.id).toBe("chest_wall_pain_v1");
      expect(resolved.matchLevel).toBe("icdExact");
    });

    it("epistaxis R04.0 exact resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R04.0", displayName: "Epistaxis" });
      expect(resolved.template.id).toBe("epistaxis_v1");
      expect(resolved.matchLevel).toBe("icdExact");
    });

    it("hypoglycemia E16.2 exact resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "E16.2", displayName: "Hypoglycemia" });
      expect(resolved.template.id).toBe("hypoglycemia_v1");
      expect(resolved.matchLevel).toBe("icdExact");
    });

    it("hyperglycemia R73 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R73.9", displayName: "Hyperglycemia" });
      expect(resolved.template.id).toBe("hyperglycemia_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("alcohol intoxication F10 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "F10.129", displayName: "Intoxication" });
      expect(resolved.template.id).toBe("alcohol_intoxication_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("anxiety/panic F41 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "F41.9", displayName: "Anxiety" });
      expect(resolved.template.id).toBe("anxiety_panic_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("exact match beats family for chest wall vs chest pain R07 codes", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R07.89", displayName: "Costochondritis" });
      expect(resolved.template.id).toBe("chest_wall_pain_v1");
      expect(resolved.matchLevel).toBe("icdExact");
    });

    it("applying Batch 4 template fills diagnosis-card fields only", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-1",
        code: "R56.9",
        displayName: "Seizure",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R56.9", displayName: "Seizure" });
      const next = applyProviderDischargeTemplateToCard(card, resolved, { locale: "en", overwriteExisting: true });
      expect(next.description.trim()).not.toBe("");
      expect(next.returnPrecautions).toBe("");
      expect(next.followUps).toEqual([]);
    });

    it("Batch 4 shared return precautions merge at bottom only", () => {
      const form = emptyProviderDischargeDocumentationForm();
      const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "tia_stroke_like_v1")!;
      const merged = mergeTemplateSharedFieldsIntoForm(form, extractSharedFieldsFromTemplate(template, "en"));
      expect(merged.returnPrecautions).toContain("facial droop");
      expect(merged.followUps.length).toBeGreaterThan(0);
    });

    it("provider-entered text is not overwritten on Batch 4 apply", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-1",
        code: "R00.2",
        displayName: "Palpitations",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      card.description = "Clinician palpitations note";
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R00.2", displayName: "Palpitations" });
      const next = applyProviderDischargeTemplateToCard(card, resolved, { locale: "en", overwriteExisting: false });
      expect(next.description).toBe("Clinician palpitations note");
    });

    it("React UI does not contain Batch 4 template paragraphs", () => {
      const uiSource = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      for (const fragment of PROVIDER_DISCHARGE_REGISTRY_PARAGRAPH_FRAGMENTS) {
        expect(uiSource).not.toContain(fragment);
      }
    });
  });

  describe("19Y.6A pediatric discharge template governance hardening", () => {
    it("ProviderDischargeTemplate supports ageRange metadata", () => {
      const template = syntheticRegistryTemplate({
        id: "adult_only_test_v1",
        ageRange: { label: "adult" },
      });
      expect(template.ageRange?.label).toBe("adult");
    });

    it("existing non-pediatric registry templates still validate", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("pediatric template without ageRange fails validation", () => {
      const result = validateProviderDischargeTemplateRegistry([
        syntheticRegistryTemplate({ id: "pediatric_fever_v1" }),
      ]);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("must define ageRange"))).toBe(true);
    });

    it("invalid ageRange fails validation", () => {
      expect(
        validateProviderDischargeTemplateAgeRange({
          id: "bad-range",
          ageRange: { label: "pediatric", minAgeDays: 100, maxAgeDays: 10 },
        }).length
      ).toBeGreaterThan(0);
      expect(
        validateProviderDischargeTemplateAgeRange({
          id: "negative-range",
          ageRange: { label: "adult", minAgeDays: -1 },
        }).length
      ).toBeGreaterThan(0);
      expect(
        validateProviderDischargeTemplateAgeRange({
          id: "adult-pediatric-label",
          ageRange: { label: "pediatric", minAgeDays: 7000 },
        }).some((e) => e.includes("adult-only"))
      ).toBe(true);
    });

    it("pediatric template without caregiverInstructions fails validation", () => {
      const base = syntheticPediatricTemplate({ id: "pediatric_no_caregiver_v1" });
      const template = syntheticPediatricTemplate({
        id: "pediatric_no_caregiver_v1",
        suggestedText: {
          en: { ...base.suggestedText.en, caregiverInstructions: "" },
          fr: { ...base.suggestedText.fr, caregiverInstructions: "" },
        },
      });
      const errors = validateProviderDischargePediatricTemplateGovernance(template);
      expect(errors.some((e) => e.includes("caregiverInstructions"))).toBe(true);
    });

    it("pediatric EN missing caregiver/parent/guardian wording fails", () => {
      const body = syntheticPediatricTemplate({ id: "pediatric_en_bad_v1" }).suggestedText.en;
      const bad = {
        ...body,
        diagnosisInstructions: "Follow instructions.",
        returnPrecautions: "Return if worse.",
        caregiverInstructions: "Monitor closely.",
      };
      expect(scanProviderDischargePediatricCaregiverWording("pediatric_en_bad_v1", "en", bad).length).toBeGreaterThan(
        0
      );
    });

    it("pediatric FR missing parent/tuteur/responsable/accompagnant wording fails", () => {
      const body = syntheticPediatricTemplate({ id: "pediatric_fr_bad_v1" }).suggestedText.fr;
      const bad = {
        ...body,
        diagnosisInstructions: "Suivez les consignes.",
        returnPrecautions: "Reconsultez si aggravation.",
        caregiverInstructions: "Surveillez de près.",
      };
      expect(scanProviderDischargePediatricCaregiverWording("pediatric_fr_bad_v1", "fr", bad).length).toBeGreaterThan(
        0
      );
    });

    it("pediatric template missing escalation language fails", () => {
      const body = syntheticPediatricTemplate({ id: "pediatric_escalation_bad_v1" }).suggestedText.en;
      const bad = {
        ...body,
        returnPrecautions: "Follow up with your clinician if concerned.",
      };
      expect(
        scanProviderDischargePediatricEscalationLanguage("pediatric_escalation_bad_v1", "en", bad).length
      ).toBeGreaterThan(0);
    });

    it("pediatric template with mg/kg fails dosing guard", () => {
      const body = {
        ...syntheticPediatricTemplate({ id: "pediatric_dose_bad_v1" }).suggestedText.en,
        medicationTreatment: "Give 10 mg/kg every dose.",
      };
      expect(scanProviderDischargePediatricForbiddenDosing("pediatric_dose_bad_v1", "en", body).length).toBeGreaterThan(
        0
      );
    });

    it("pediatric template with every 6 hours dosing fails", () => {
      const body = {
        ...syntheticPediatricTemplate({ id: "pediatric_interval_bad_v1" }).suggestedText.en,
        medicationTreatment: "Give medicine every 6 hours.",
      };
      expect(
        scanProviderDischargePediatricForbiddenDosing("pediatric_interval_bad_v1", "en", body).length
      ).toBeGreaterThan(0);
    });

    it("pediatric template with adult dose fails", () => {
      const base = syntheticPediatricTemplate({ id: "pediatric_unsafe_phrase_v1" });
      const template = syntheticPediatricTemplate({
        id: "pediatric_unsafe_phrase_v1",
        suggestedText: {
          en: {
            ...base.suggestedText.en,
            medicationTreatment: "Use standard adult dose unless directed otherwise.",
          },
          fr: base.suggestedText.fr,
        },
      });
      const errors = validateProviderDischargePediatricTemplateGovernance(template);
      expect(errors.some((e) => e.includes("adult-dose") || e.includes("unsafe phrase"))).toBe(true);
    });

    it("safe pediatric medication wording passes dosing guard", () => {
      const template = syntheticPediatricTemplate({ id: "pediatric_safe_med_v1" });
      expect(validateProviderDischargePediatricTemplateGovernance(template)).toEqual([]);
    });

    it("caregiverInstructions are included in locale-specific hash payload", () => {
      const template = syntheticPediatricTemplate({ id: "pediatric_hash_v1" });
      const payload = buildProviderDischargeTemplateHashPayload(template, "en");
      expect(payload.caregiverInstructions).toContain("Caregiver:");
    });

    it("changing caregiverInstructions changes locale hash", () => {
      const base = syntheticPediatricTemplate({ id: "pediatric_hash_drift_v1" });
      const baseHash = computeProviderDischargeTemplateAppliedHash(base, "en");
      const mutated = {
        ...base,
        suggestedText: {
          ...base.suggestedText,
          en: {
            ...base.suggestedText.en,
            caregiverInstructions: "Caregiver: updated instruction text for hash drift test.",
          },
        },
      };
      expect(computeProviderDischargeTemplateAppliedHash(mutated, "en")).not.toBe(baseHash);
      expect(computeProviderDischargeTemplateAppliedHash(mutated, "fr")).toBe(
        computeProviderDischargeTemplateAppliedHash(base, "fr")
      );
    });

    it("caregiverInstructions do not affect adult templates unless present", () => {
      const chest = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "chest_pain_v1")!;
      expect(chest.suggestedText.en.caregiverInstructions).toBeUndefined();
      const applied = buildAppliedDiagnosisInstructionsFromTemplateBody(chest.suggestedText.en);
      expect(applied).toBe(chest.suggestedText.en.diagnosisInstructions);
      const payload = buildProviderDischargeTemplateHashPayload(chest, "en");
      expect(payload.caregiverInstructions).toBeUndefined();
    });

    it("caregiverInstructions append to diagnosisInstructions on pediatric apply", () => {
      const template = syntheticPediatricTemplate({ id: "pediatric_apply_v1" });
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-ped",
        code: "R50.9",
        displayName: "Fever",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      const resolved = { template, matchLevel: "keyword" as const };
      const next = applyProviderDischargeTemplateToCard(card, resolved, { locale: "en", overwriteExisting: true });
      expect(next.diagnosisInstructions).toContain(template.suggestedText.en.diagnosisInstructions);
      expect(next.diagnosisInstructions).toContain("Caregiver:");
    });

    it("no pediatric-specific provider disposition UI behavior was added", () => {
      const uiSource = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      expect(uiSource).not.toMatch(/\bageRange\b/);
      expect(uiSource).not.toMatch(/caregiverInstructions/);
      expect(uiSource).not.toMatch(/pediatric_/);
    });
  });

  describe("19Y.7 Batch 5 pediatric-safe ED discharge templates", () => {
    const batchTemplates = () =>
      BATCH_5_PEDIATRIC_ED_DISCHARGE_TEMPLATE_IDS.map(
        (id) => PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === id)!
      );

    it("all 10 pediatric templates exist", () => {
      expect(BATCH_5_PEDIATRIC_ED_DISCHARGE_TEMPLATE_IDS).toHaveLength(10);
      for (const id of BATCH_5_PEDIATRIC_ED_DISCHARGE_TEMPLATE_IDS) {
        expect(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.some((t) => t.id === id)).toBe(true);
      }
    });

    it("full registry validates with pediatric batch included", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("each pediatric template has EN/FR bodies, ageRange, caregiverInstructions, and escalationSeverity", () => {
      for (const template of batchTemplates()) {
        expect(template.suggestedText.en.description.trim()).not.toBe("");
        expect(template.suggestedText.fr.description.trim()).not.toBe("");
        expect(template.ageRange?.label).toBe("pediatric");
        expect(template.suggestedText.en.caregiverInstructions?.trim()).toBeTruthy();
        expect(template.suggestedText.fr.caregiverInstructions?.trim()).toBeTruthy();
        expect(template.escalationSeverity).toMatch(/^(routine|urgent|emergency)$/);
        expect(template.requiresCaregiverAcknowledgement).toBe(true);
      }
    });

    it("each pediatric template passes pediatric governance scans", () => {
      for (const template of batchTemplates()) {
        const errors = validateProviderDischargePediatricTemplateGovernance(template);
        expect(errors, template.id).toEqual([]);
      }
    });

    it("pediatric fever R50.9 resolves to pediatric fever template", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R50.9", displayName: "Fever" });
      expect(resolved.template.id).toBe("pediatric_fever_v1");
      expect(resolved.matchLevel).toBe("icdExact");
    });

    it("pediatric asthma keyword resolves to pediatric asthma template", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        displayName: "Pediatric asthma flare",
      });
      expect(resolved.template.id).toBe("pediatric_asthma_exacerbation_v1");
      expect(resolved.matchLevel).toBe("keyword");
    });

    it("pediatric otitis H66.90 resolves to pediatric otitis template", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "H66.90",
        displayName: "Otitis media",
      });
      expect(resolved.template.id).toBe("pediatric_otitis_media_v1");
    });

    it("template apply uses active locale and stores appliedLocale + hash", () => {
      const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "pediatric_fever_v1")!;
      const cardFr = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-pf",
        code: "R50.9",
        displayName: "Fever",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "fr",
        actor: { displayName: "Dr Test", appliedAt: "2026-05-18T18:00:00.000Z" },
      });
      expect(cardFr.description).toContain("Votre enfant");
      expect(cardFr.templateMeta?.appliedLocale).toBe("fr");
      expect(cardFr.templateMeta?.templateAppliedHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("no React UI paragraph hardcoding for pediatric templates", () => {
      const uiSource = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      expect(uiSource).not.toContain("Your child was evaluated in the emergency department for fever");
      expect(uiSource).not.toContain("Votre enfant a été pris en charge aux urgences pour de la fièvre");
    });
  });

  describe("19Y.7A pediatric clinical safety hardening", () => {
    const batchTemplates = () =>
      BATCH_5_PEDIATRIC_ED_DISCHARGE_TEMPLATE_IDS.map(
        (id) => PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === id)!
      );

    it("pediatric templates validate with new governance fields", () => {
      for (const template of batchTemplates()) {
        expect(template.minimumEscalationLevel).toMatch(/^(routine|urgent|emergency)$/);
        expect(template.requiredDangerSignCategories?.length).toBeGreaterThan(0);
      }
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("observation window hours validation works for minor head injury", () => {
      const head = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "pediatric_minor_head_injury_v1")!;
      expect(head.requiresCaregiverObservationWindow).toBe(true);
      expect(head.caregiverObservationWindowHours).toBe(24);
      expect(validateProviderDischargePediatricTemplateGovernance(head)).toEqual([]);
    });

    it("invalid observation window fails when hours missing or non-positive", () => {
      const head = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "pediatric_minor_head_injury_v1")!;
      const missingHours = { ...head, caregiverObservationWindowHours: undefined };
      expect(
        validateProviderDischargePediatricTemplateGovernance(missingHours).some((e) =>
          e.includes("caregiverObservationWindowHours")
        )
      ).toBe(true);

      const zeroHours = { ...head, caregiverObservationWindowHours: 0 };
      expect(validateProviderDischargePediatricTemplateGovernance(zeroHours).length).toBeGreaterThan(0);

      const orphanHours = syntheticPediatricTemplate({
        id: "pediatric_orphan_window_v1",
        requiresCaregiverObservationWindow: undefined,
        caregiverObservationWindowHours: 12,
      });
      expect(
        validateProviderDischargePediatricTemplateGovernance(orphanHours).some((e) =>
          e.includes("requiresCaregiverObservationWindow")
        )
      ).toBe(true);
    });

    it("emergency escalation cannot downgrade to routine minimumEscalationLevel", () => {
      const head = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "pediatric_minor_head_injury_v1")!;
      const downgraded = { ...head, minimumEscalationLevel: "routine" as const };
      expect(
        validateProviderDischargePediatricTemplateGovernance(downgraded).some((e) =>
          e.includes("cannot set minimumEscalationLevel to routine")
        )
      ).toBe(true);
    });

    it("minor head injury template requires observation window metadata", () => {
      const head = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "pediatric_minor_head_injury_v1")!;
      expect(head.requiresCaregiverObservationWindow).toBe(true);
      expect(head.requiresReevaluationWarning).toBe(true);
      expect(head.minimumEscalationLevel).toBe("urgent");
      expect(head.escalationSeverity).toBe("emergency");
    });

    it("minor head injury includes neurologic danger signs EN/FR", () => {
      const head = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "pediatric_minor_head_injury_v1")!;
      for (const locale of ["en", "fr"] as const) {
        const body = head.suggestedText[locale];
        expect(scanProviderDischargePediatricRequiredDangerSignCategories(head, locale, body)).toEqual([]);
      }
    });

    it("fever template includes dehydration warnings EN/FR", () => {
      const fever = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "pediatric_fever_v1")!;
      for (const locale of ["en", "fr"] as const) {
        const body = fever.suggestedText[locale];
        expect(scanProviderDischargePediatricDehydrationDangerSigns(fever.id, locale, body)).toEqual([]);
      }
    });

    it("gastroenteritis includes dehydration warnings EN/FR", () => {
      const gastro = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "pediatric_gastroenteritis_v1")!;
      for (const locale of ["en", "fr"] as const) {
        const body = gastro.suggestedText[locale];
        expect(scanProviderDischargePediatricDehydrationDangerSigns(gastro.id, locale, body)).toEqual([]);
      }
    });

    it("pediatric asthma includes breathing escalation wording", () => {
      const asthma = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "pediatric_asthma_exacerbation_v1")!;
      expect(asthma.requiresReevaluationWarning).toBe(true);
      for (const locale of ["en", "fr"] as const) {
        const body = asthma.suggestedText[locale];
        expect(scanProviderDischargePediatricRequiredDangerSignCategories(asthma, locale, body)).toEqual([]);
        expect(scanProviderDischargePediatricEscalationLanguage(asthma.id, locale, body)).toEqual([]);
      }
    });

    it("pediatric templates missing urgent escalation fail", () => {
      const body = syntheticPediatricTemplate({ id: "pediatric_no_escalation_v1" }).suggestedText.en;
      const bad = { ...body, returnPrecautions: "Follow up with your clinician if concerned." };
      expect(scanProviderDischargePediatricEscalationLanguage("pediatric_no_escalation_v1", "en", bad).length).toBeGreaterThan(
        0
      );
    });

    it("pediatric templates missing required danger categories fail", () => {
      const head = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "pediatric_minor_head_injury_v1")!;
      const bad = { ...head.suggestedText.en, returnPrecautions: "Return if pain worsens." };
      expect(
        scanProviderDischargePediatricRequiredDangerSignCategories(head, "en", bad).some((e) => e.includes("seizure"))
      ).toBe(true);
    });

    it("pediatric neurologic validator emits warnings for missing wording and none for head injury", () => {
      const head = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "pediatric_minor_head_injury_v1")!;
      expect(scanProviderDischargePediatricNeurologicWarnings(head.id, "en", head.suggestedText.en)).toEqual([]);

      const sparse = syntheticPediatricTemplate({ id: "pediatric_neuro_sparse_v1" });
      expect(
        scanProviderDischargePediatricNeurologicWarnings(
          "pediatric_fever_v1",
          "en",
          sparse.suggestedText.en
        ).length
      ).toBeGreaterThan(0);

      const registryWarnings = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(scanProviderDischargePediatricTemplateGovernanceWarnings(head)).toEqual([]);
      expect(registryWarnings.warnings.some((w) => w.includes("neurologic warning"))).toBe(true);
    });

    it("pediatric dehydration validator works EN", () => {
      const fever = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "pediatric_fever_v1")!;
      expect(
        scanProviderDischargePediatricDehydrationDangerSigns(fever.id, "en", fever.suggestedText.en)
      ).toEqual([]);
      const bad = { ...fever.suggestedText.en, returnPrecautions: "Return immediately if breathing worsens." };
      expect(scanProviderDischargePediatricDehydrationDangerSigns(fever.id, "en", bad).length).toBeGreaterThan(0);
    });

    it("pediatric dehydration validator works FR", () => {
      const fever = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "pediatric_fever_v1")!;
      expect(
        scanProviderDischargePediatricDehydrationDangerSigns(fever.id, "fr", fever.suggestedText.fr)
      ).toEqual([]);
      const bad = {
        ...fever.suggestedText.fr,
        description: "Test.",
        diagnosisInstructions: "Suivez les consignes.",
        medicationTreatment: "Médicaments selon prescription.",
        returnPrecautions: "Retournez immédiatement si la respiration s'aggrave.",
        caregiverInstructions: "Surveillez votre enfant.",
      };
      expect(scanProviderDischargePediatricDehydrationDangerSigns(fever.id, "fr", bad).length).toBeGreaterThan(0);
    });

    it("snapshot hashes update intentionally when pediatric safety semantics change", () => {
      const base = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en");
      const mutated = computeProviderDischargeRegistryGovernanceSnapshotHash(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.map((t) =>
          t.id === "pediatric_fever_v1" ?
            { ...t, minimumEscalationLevel: "emergency" as const }
          : t
        ),
        "en"
      );
      expect(mutated).not.toBe(base);
    });

    it("templateAppliedHash includes pediatric governance semantics", () => {
      const fever = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "pediatric_fever_v1")!;
      const baseHash = computeProviderDischargeTemplateAppliedHash(fever, "en");
      const payload = buildProviderDischargeTemplateHashPayload(fever, "en");
      expect(payload.minimumEscalationLevel).toBe("urgent");
      expect(payload.requiredDangerSignCategories?.length).toBeGreaterThan(0);

      const stripped = {
        ...fever,
        minimumEscalationLevel: undefined,
        requiredDangerSignCategories: undefined,
      };
      expect(computeProviderDischargeTemplateAppliedHash(stripped, "en")).not.toBe(baseHash);
    });

    it("existing adult templates still validate", () => {
      const adultIds = [
        ...BATCH_1_ED_DISCHARGE_TEMPLATE_IDS,
        ...BATCH_2_ED_DISCHARGE_TEMPLATE_IDS,
        ...BATCH_3_ED_DISCHARGE_TEMPLATE_IDS,
        ...BATCH_4_ED_DISCHARGE_TEMPLATE_IDS,
      ];
      const adults = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.filter((t) => adultIds.includes(t.id as never));
      const result = validateProviderDischargeTemplateRegistry(adults);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("governance snapshot includes pediatric safety semantics fields", () => {
      const snapshot = buildProviderDischargeRegistryGovernanceSnapshot(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en");
      const head = snapshot.find((row) => row.id === "pediatric_minor_head_injury_v1") as Record<string, unknown>;
      expect(head.minimumEscalationLevel).toBe("urgent");
      expect(head.requiresCaregiverObservationWindow).toBe(true);
      expect(head.caregiverObservationWindowHours).toBe(24);
      expect(head.requiredDangerSignCategories).toEqual([
        "confusion_behavior",
        "persistent_vomiting",
        "seizure",
        "trouble_waking",
      ]);
    });
  });

  describe("19Y.8 Batch 6 higher-risk pediatric ED discharge templates", () => {
    const batchTemplates = () =>
      BATCH_6_PEDIATRIC_HIGHER_RISK_ED_DISCHARGE_TEMPLATE_IDS.map(
        (id) => PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === id)!
      );

    it("all 10 higher-risk pediatric templates exist", () => {
      expect(BATCH_6_PEDIATRIC_HIGHER_RISK_ED_DISCHARGE_TEMPLATE_IDS).toHaveLength(10);
      for (const id of BATCH_6_PEDIATRIC_HIGHER_RISK_ED_DISCHARGE_TEMPLATE_IDS) {
        expect(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.some((t) => t.id === id)).toBe(true);
      }
    });

    it("full registry validates with batch 6 included", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("each batch 6 template has EN/FR bodies and pediatric governance metadata", () => {
      for (const template of batchTemplates()) {
        expect(template.suggestedText.en.description.trim()).not.toBe("");
        expect(template.suggestedText.fr.description.trim()).not.toBe("");
        expect(template.ageRange?.label).toBe("pediatric");
        expect(template.requiresCaregiverAcknowledgement).toBe(true);
        expect(template.escalationSeverity).toMatch(/^(routine|urgent|emergency)$/);
        expect(template.minimumEscalationLevel).toMatch(/^(routine|urgent|emergency)$/);
        expect(template.requiredDangerSignCategories?.length).toBeGreaterThan(0);
        expect(template.riskCategory).toBe("high");
      }
    });

    it("each batch 6 template has caregiverInstructions and passes pediatric governance", () => {
      for (const template of batchTemplates()) {
        expect(template.suggestedText.en.caregiverInstructions?.trim()).toBeTruthy();
        expect(template.suggestedText.fr.caregiverInstructions?.trim()).toBeTruthy();
        expect(validateProviderDischargePediatricTemplateGovernance(template), template.id).toEqual([]);
      }
    });

    it("batch 6 templates pass escalation, dosing, unsafe phrase, and danger-sign scans", () => {
      for (const template of batchTemplates()) {
        expect(scanProviderDischargeTemplateUnsafePhrases(template)).toEqual([]);
        for (const locale of ["en", "fr"] as const) {
          const body = template.suggestedText[locale];
          expect(scanProviderDischargePediatricEscalationLanguage(template.id, locale, body)).toEqual([]);
          expect(scanProviderDischargePediatricForbiddenDosing(template.id, locale, body)).toEqual([]);
          expect(scanProviderDischargePediatricRequiredDangerSignCategories(template, locale, body)).toEqual([]);
        }
      }
    });

    it("febrile seizure R56.00 resolves to pediatric febrile seizure template", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "R56.00",
        displayName: "Febrile convulsion",
      });
      expect(resolved.template.id).toBe("pediatric_febrile_seizure_v1");
      expect(resolved.matchLevel).toBe("icdExact");
    });

    it("pediatric abdominal pain keyword resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        displayName: "Pediatric abdominal pain",
      });
      expect(resolved.template.id).toBe("pediatric_abdominal_pain_v1");
      expect(resolved.matchLevel).toBe("keyword");
    });

    it("RSV bronchiolitis J21.0 resolves to pediatric RSV template", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "J21.0",
        displayName: "Bronchiolitis",
      });
      expect(resolved.template.id).toBe("pediatric_rsv_bronchiolitis_v1");
    });

    it("croup J05.0 resolves to pediatric croup template", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "J05.0",
        displayName: "Croup",
      });
      expect(resolved.template.id).toBe("pediatric_croup_v1");
    });

    it("template apply uses active locale and stores hash for batch 6 template", () => {
      const cardFr = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-pfs",
        code: "R56.00",
        displayName: "Febrile seizure",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "fr",
        actor: { displayName: "Dr Test", appliedAt: "2026-05-18T18:00:00.000Z" },
      });
      expect(cardFr.description).toContain("crise convulsive fébrile");
      expect(cardFr.templateMeta?.appliedLocale).toBe("fr");
      expect(cardFr.templateMeta?.templateAppliedHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("intentional batch 6 governance change updates snapshot hash", () => {
      const base = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en");
      const mutated = computeProviderDischargeRegistryGovernanceSnapshotHash(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.map((t) =>
          t.id === "pediatric_croup_v1" ?
            { ...t, minimumEscalationLevel: "emergency" as const }
          : t
        ),
        "en"
      );
      expect(mutated).not.toBe(base);
    });

    it("no React UI paragraph hardcoding for batch 6 templates", () => {
      const uiSource = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      expect(uiSource).not.toContain("Your child was evaluated in the emergency department after a febrile seizure");
      expect(uiSource).not.toContain("Votre enfant a été pris en charge aux urgences pour un croup");
    });

    it("batch 6 templates have no forbidden clinical certainty phrases", () => {
      const forbidden = ["ruled out", "benign", "nothing serious", "safe for discharge", "normal exam", "negative for"];
      for (const template of batchTemplates()) {
        for (const locale of ["en", "fr"] as const) {
          const blob = JSON.stringify(template.suggestedText[locale]).toLowerCase();
          for (const phrase of forbidden) {
            expect(blob, `${template.id} ${locale}`).not.toContain(phrase);
          }
        }
      }
    });
  });

  describe("19Y.9 OB/GYN discharge template governance hardening", () => {
    it("ProviderDischargeTemplate supports obGynSafety metadata", () => {
      const template = syntheticObGynTemplate({ id: "obgyn_metadata_v1" });
      expect(template.obGynSafety?.pregnancySensitive).toBe(true);
      expect(template.obGynSafety?.requiresOBGynFollowUp).toBe(true);
    });

    it("OB/GYN synthetic template without obGynSafety fails", () => {
      const template = syntheticRegistryTemplate({
        id: "obgyn_missing_safety_v1",
        specialtyCategory: "obgyn",
      });
      const errors = validateProviderDischargeObGynTemplateGovernance(template);
      expect(errors.some((e) => e.includes("must define obGynSafety"))).toBe(true);
    });

    it("pregnancy-sensitive template missing pregnancy status documentation flag fails", () => {
      const template = syntheticObGynTemplate({
        id: "obgyn_pregnancy_doc_v1",
        obGynSafety: {
          pregnancySensitive: true,
          requiresOBGynFollowUp: true,
        },
      });
      expect(
        validateProviderDischargeObGynTemplateGovernance(template).some((e) =>
          e.includes("requiresPregnancyStatusDocumentation")
        )
      ).toBe(true);
    });

    it("ectopic-sensitive template missing ectopic precautions fails", () => {
      const template = syntheticObGynTemplate({
        id: "obgyn_ectopic_watch_v1",
        obGynSafety: {
          pregnancySensitive: true,
          requiresPregnancyStatusDocumentation: true,
          requiresOBGynFollowUp: true,
        },
      });
      expect(
        validateProviderDischargeObGynTemplateGovernance(template).some((e) =>
          e.includes("requiresEctopicPrecautions")
        )
      ).toBe(true);
    });

    it("bleeding-sensitive template missing bleeding precautions fails", () => {
      const template = syntheticObGynTemplate({
        id: "obgyn_bleeding_watch_v1",
        obGynSafety: {
          pregnancySensitive: true,
          requiresPregnancyStatusDocumentation: true,
          requiresOBGynFollowUp: true,
          requiresBleedingPrecautions: false,
        },
      });
      expect(
        validateProviderDischargeObGynTemplateGovernance(template).some((e) =>
          e.includes("requiresBleedingPrecautions")
        )
      ).toBe(true);
    });

    it("pelvic-pain template missing pelvic pain precautions fails", () => {
      const template = syntheticObGynTemplate({
        id: "obgyn_pelvic_pain_v1",
        obGynSafety: {
          pregnancySensitive: true,
          requiresPregnancyStatusDocumentation: true,
          requiresOBGynFollowUp: true,
          requiresPelvicPainPrecautions: false,
        },
      });
      expect(
        validateProviderDischargeObGynTemplateGovernance(template).some((e) =>
          e.includes("requiresPelvicPainPrecautions")
        )
      ).toBe(true);
    });

    it("OB/GYN follow-up requirement fails when no OB/GYN follow-up row exists", () => {
      const template = syntheticObGynTemplate({
        id: "obgyn_followup_missing_v1",
        defaultFollowUps: [],
        obGynSafety: {
          pregnancySensitive: true,
          requiresPregnancyStatusDocumentation: true,
          requiresOBGynFollowUp: true,
        },
      });
      expect(
        validateProviderDischargeObGynTemplateGovernance(template).some((e) =>
          e.includes("requiresOBGynFollowUp but no OB/GYN")
        )
      ).toBe(true);
    });

    it("OB/GYN follow-up requirement passes with OB/GYN row", () => {
      const template = syntheticObGynTemplate({ id: "obgyn_followup_ok_v1" });
      expect(validateProviderDischargeObGynTemplateGovernance(template)).toEqual([]);
    });

    it("forbidden phrase ectopic ruled out fails", () => {
      const body = syntheticObGynTemplate({ id: "obgyn_bad_ectopic_v1" }).suggestedText.en;
      const bad = { ...body, returnPrecautions: "Ectopic ruled out during this visit." };
      expect(
        scanProviderDischargeObGynPregnancyForbiddenPhrases("obgyn_bad_ectopic_v1", "en", bad).some((e) =>
          e.includes("ectopic-ruled-out")
        )
      ).toBe(true);
    });

    it("forbidden phrase pregnancy ruled out fails", () => {
      const body = syntheticObGynTemplate({ id: "obgyn_bad_pregnancy_v1" }).suggestedText.en;
      const bad = { ...body, diagnosisInstructions: "Pregnancy ruled out today." };
      expect(
        scanProviderDischargeObGynPregnancyForbiddenPhrases("obgyn_bad_pregnancy_v1", "en", bad).some((e) =>
          e.includes("pregnancy-ruled-out")
        )
      ).toBe(true);
    });

    it("forbidden phrase hCG negative fails", () => {
      const body = syntheticObGynTemplate({ id: "obgyn_bad_hcg_v1" }).suggestedText.en;
      const bad = { ...body, diagnosisInstructions: "hCG negative in the ED." };
      expect(
        scanProviderDischargeObGynPregnancyForbiddenPhrases("obgyn_bad_hcg_v1", "en", bad).some((e) =>
          e.includes("hcg-negative")
        )
      ).toBe(true);
    });

    it("forbidden phrase ultrasound normal fails", () => {
      const body = syntheticObGynTemplate({ id: "obgyn_bad_us_v1" }).suggestedText.en;
      const bad = { ...body, description: "Ultrasound normal during evaluation." };
      expect(
        scanProviderDischargeObGynPregnancyForbiddenPhrases("obgyn_bad_us_v1", "en", bad).some((e) =>
          e.includes("ultrasound-normal")
        )
      ).toBe(true);
    });

    it("safe escalation wording passes EN", () => {
      const template = syntheticObGynTemplate({ id: "obgyn_escalation_en_v1" });
      expect(
        scanProviderDischargeObGynEscalationLanguage(
          template.id,
          "en",
          template.suggestedText.en
        )
      ).toEqual([]);
    });

    it("safe escalation wording passes FR", () => {
      const template = syntheticObGynTemplate({ id: "obgyn_escalation_fr_v1" });
      expect(
        scanProviderDischargeObGynEscalationLanguage(
          template.id,
          "fr",
          template.suggestedText.fr
        )
      ).toEqual([]);
    });

    it("obGynSafety metadata included in registry snapshot/hash", () => {
      const template = syntheticObGynTemplate({ id: "obgyn_hash_v1" });
      const payload = buildProviderDischargeTemplateHashPayload(template, "en");
      expect(payload.obGynSafety).toEqual({
        pregnancySensitive: true,
        requiresBleedingPrecautions: true,
        requiresOBGynFollowUp: true,
        requiresPelvicPainPrecautions: true,
        requiresPregnancyStatusDocumentation: true,
      });

      const snapshot = buildProviderDischargeRegistryGovernanceSnapshot(
        [...PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, template],
        "en"
      );
      const row = snapshot.find((entry) => entry.id === "obgyn_hash_v1") as Record<string, unknown>;
      expect(row.obGynSafety).toEqual(payload.obGynSafety);

      const base = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en");
      const withObGyn = computeProviderDischargeRegistryGovernanceSnapshotHash(
        [...PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, template],
        "en"
      );
      expect(withObGyn).not.toBe(base);
    });

    it("existing adult and pediatric templates still validate", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("19Y.10 Batch 7 OB/GYN higher-risk ED discharge templates", () => {
    const batchTemplates = () =>
      BATCH_7_OBGYN_ED_DISCHARGE_TEMPLATE_IDS.map(
        (id) => PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === id)!
      );

    it("all 10 OB/GYN templates exist with EN/FR bodies and obGynSafety", () => {
      expect(BATCH_7_OBGYN_ED_DISCHARGE_TEMPLATE_IDS).toHaveLength(10);
      for (const template of batchTemplates()) {
        expect(template.suggestedText.en.description.trim()).not.toBe("");
        expect(template.suggestedText.fr.description.trim()).not.toBe("");
        expect(template.obGynSafety).toBeTruthy();
        expect(template.specialtyCategory).toBe("obgyn");
      }
    });

    it("full registry validates with batch 7 included", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("each batch 7 template passes OB/GYN governance and has follow-up when required", () => {
      for (const template of batchTemplates()) {
        expect(validateProviderDischargeObGynTemplateGovernance(template), template.id).toEqual([]);
        if (template.obGynSafety?.requiresOBGynFollowUp) {
          expect(template.defaultFollowUps?.some((row) => row.specialty === "OBGYN")).toBe(true);
        }
      }
    });

    it("escalation wording passes EN and FR for all batch 7 templates", () => {
      for (const template of batchTemplates()) {
        expect(scanProviderDischargeObGynEscalationLanguage(template.id, "en", template.suggestedText.en)).toEqual(
          []
        );
        expect(scanProviderDischargeObGynEscalationLanguage(template.id, "fr", template.suggestedText.fr)).toEqual(
          []
        );
      }
    });

    it("forbidden pregnancy and ectopic certainty phrases fail scanners", () => {
      const body = batchTemplates()[0]!.suggestedText.en;
      expect(
        scanProviderDischargeObGynPregnancyForbiddenPhrases("obgyn_test", "en", {
          ...body,
          diagnosisInstructions: "Pregnancy ruled out today.",
        }).length
      ).toBeGreaterThan(0);
      expect(
        scanProviderDischargeObGynPregnancyForbiddenPhrases("obgyn_test", "en", {
          ...body,
          returnPrecautions: "Ectopic ruled out during evaluation.",
        }).length
      ).toBeGreaterThan(0);
      expect(
        scanProviderDischargeObGynPregnancyForbiddenPhrases("obgyn_test", "en", {
          ...body,
          description: "Miscarriage occurred during this visit.",
        }).length
      ).toBeGreaterThan(0);
    });

    it("forbidden hCG and ultrasound result phrases fail", () => {
      const body = batchTemplates()[0]!.suggestedText.en;
      expect(
        scanProviderDischargeObGynPregnancyForbiddenPhrases("obgyn_test", "en", {
          ...body,
          diagnosisInstructions: "hCG negative in the ED.",
        }).some((e) => e.includes("hcg-negative"))
      ).toBe(true);
      expect(
        scanProviderDischargeObGynPregnancyForbiddenPhrases("obgyn_test", "en", {
          ...body,
          description: "Ultrasound normal during evaluation.",
        }).some((e) => e.includes("ultrasound-normal"))
      ).toBe(true);
    });

    it("privacy validators pass for vaginitis template", () => {
      const vaginitis = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "obgyn_vaginitis_v1")!;
      expect(vaginitis.obGynSafety?.requiresSexualHealthPrivacyWarning).toBe(true);
      for (const locale of ["en", "fr"] as const) {
        expect(scanProviderDischargeObGynPrivacyContent(vaginitis.id, locale, vaginitis.suggestedText[locale])).toEqual(
          []
        );
      }
    });

    it("batch 7 templates have no dosing language or fabricated results", () => {
      const forbiddenResults = ["hcg negative", "ultrasound normal", "fetal heart tones", "ruled out", "mg/kg"];
      for (const template of batchTemplates()) {
        for (const locale of ["en", "fr"] as const) {
          expect(scanProviderDischargePediatricForbiddenDosing(template.id, locale, template.suggestedText[locale])).toEqual(
            []
          );
          const blob = JSON.stringify(template.suggestedText[locale]).toLowerCase();
          for (const phrase of forbiddenResults) {
            expect(blob, `${template.id} ${locale}`).not.toContain(phrase);
          }
        }
      }
    });

    it("vaginal bleeding N93.9 resolves to OB/GYN vaginal bleeding template", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "N93.9",
        displayName: "Vaginal bleeding",
      });
      expect(resolved.template.id).toBe("obgyn_vaginal_bleeding_v1");
      expect(resolved.matchLevel).toBe("icdExact");
    });

    it("OB/GYN pelvic pain keyword resolves without adult abdominal pain collision", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        displayName: "obgyn pelvic pain",
      });
      expect(resolved.template.id).toBe("obgyn_pelvic_pain_v1");
      expect(resolved.matchLevel).toBe("keyword");
    });

    it("apply uses active locale for batch 7 template", () => {
      const cardFr = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-ovb",
        code: "N93.9",
        displayName: "Vaginal bleeding",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "fr",
        actor: { displayName: "Dr Test", appliedAt: "2026-05-18T18:00:00.000Z" },
      });
      expect(cardFr.description).toContain("saignements vaginaux");
      expect(cardFr.templateMeta?.appliedLocale).toBe("fr");
      expect(cardFr.templateMeta?.templateAppliedHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("intentional batch 7 addition updates registry snapshot hash", () => {
      const base = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en");
      const withoutObGyn = computeProviderDischargeRegistryGovernanceSnapshotHash(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.filter((t) => !t.id.startsWith("obgyn_")),
        "en"
      );
      expect(base).not.toBe(withoutObGyn);
    });

    it("no React UI hardcoding for batch 7 OB/GYN templates", () => {
      const uiSource = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      expect(uiSource).not.toContain("You were evaluated in the emergency department for vaginal bleeding");
      expect(uiSource).not.toContain("Vous avez été pris en charge aux urgences pour des saignements vaginaux");
    });

    it("existing adult and pediatric templates still validate", () => {
      const nonObGyn = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.filter((t) => !t.id.startsWith("obgyn_"));
      const result = validateProviderDischargeTemplateRegistry(nonObGyn);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("19Y.11 behavioral health & substance-use discharge governance hardening", () => {
    it("ProviderDischargeTemplate supports behavioralHealthSafety metadata", () => {
      const template = syntheticBehavioralHealthTemplate({ id: "behavioral_health_metadata_v1" });
      expect(template.behavioralHealthSafety?.requiresCrisisResources).toBe(true);
      expect(template.behavioralHealthSafety?.requiresBehavioralHealthFollowUp).toBe(true);
    });

    it("synthetic BH template without behavioralHealthSafety fails when specialty is behavioral_health", () => {
      const template = syntheticRegistryTemplate({
        id: "behavioral_health_missing_governance_v1",
        specialtyCategory: "behavioral_health",
      });
      const errors = validateProviderDischargeBehavioralHealthTemplateGovernance(template);
      expect(errors.some((e) => e.includes("must define behavioralHealthSafety"))).toBe(true);
    });

    it("suicide/self-harm template missing crisis resources fails", () => {
      const template = syntheticBehavioralHealthTemplate({
        id: "behavioral_health_self_harm_v1",
        behavioralHealthSafety: {
          requiresSelfHarmEscalation: true,
          requiresBehavioralHealthFollowUp: true,
        },
      });
      expect(
        validateProviderDischargeBehavioralHealthTemplateGovernance(template).some((e) =>
          e.includes("requiresCrisisResources")
        )
      ).toBe(true);
    });

    it("substance-use template missing substance-use resources fails", () => {
      const template = syntheticBehavioralHealthTemplate({
        id: "behavioral_health_substance_use_v1",
        behavioralHealthSafety: {
          requiresCrisisResources: true,
          requiresBehavioralHealthFollowUp: true,
        },
      });
      expect(
        validateProviderDischargeBehavioralHealthTemplateGovernance(template).some((e) =>
          e.includes("requiresSubstanceUseResources")
        )
      ).toBe(true);
    });

    it("withdrawal-sensitive template missing withdrawal precautions fails", () => {
      const template = syntheticBehavioralHealthTemplate({
        id: "behavioral_health_withdrawal_v1",
        behavioralHealthSafety: {
          requiresCrisisResources: true,
          requiresBehavioralHealthFollowUp: true,
        },
      });
      expect(
        validateProviderDischargeBehavioralHealthTemplateGovernance(template).some((e) =>
          e.includes("requiresWithdrawalPrecautions")
        )
      ).toBe(true);
    });

    it("behavioral-health follow-up requirement fails without BH follow-up", () => {
      const template = syntheticBehavioralHealthTemplate({
        id: "behavioral_health_followup_missing_v1",
        defaultFollowUps: [
          {
            ...newDefaultFollowUpRow(),
            id: "pc-follow",
            specialty: "PRIMARY_CARE",
            timing: "within 1 week",
          },
        ],
      });
      expect(
        validateProviderDischargeBehavioralHealthTemplateGovernance(template).some((e) =>
          e.includes("requiresBehavioralHealthFollowUp")
        )
      ).toBe(true);
    });

    it("behavioral-health follow-up passes with BH follow-up", () => {
      const template = syntheticBehavioralHealthTemplate({
        id: "behavioral_health_followup_ok_v1",
        defaultFollowUps: [
          {
            ...newDefaultFollowUpRow(),
            id: "psych-follow",
            specialty: "PSYCHIATRY",
            timing: "within 1 week",
          },
        ],
      });
      expect(validateProviderDischargeBehavioralHealthTemplateGovernance(template)).toEqual([]);
    });

    it("forbidden phrase psychiatrically cleared fails", () => {
      const body = syntheticBehavioralHealthTemplate({ id: "behavioral_health_bad_cleared_v1" }).suggestedText.en;
      const hits = scanProviderDischargeBehavioralHealthForbiddenPhrases(
        "behavioral_health_bad_cleared_v1",
        "en",
        { ...body, description: "Patient is psychiatrically cleared for discharge." }
      );
      expect(hits.some((h) => h.includes("psychiatrically-cleared"))).toBe(true);
    });

    it("forbidden phrase denies SI fails", () => {
      const body = syntheticBehavioralHealthTemplate({ id: "behavioral_health_bad_si_v1" }).suggestedText.en;
      const hits = scanProviderDischargeBehavioralHealthForbiddenPhrases("behavioral_health_bad_si_v1", "en", {
        ...body,
        diagnosisInstructions: "Patient denies SI.",
      });
      expect(hits.some((h) => h.includes("denies-si"))).toBe(true);
    });

    it("forbidden phrase safe for discharge fails", () => {
      const body = syntheticBehavioralHealthTemplate({ id: "behavioral_health_bad_safe_v1" }).suggestedText.en;
      const hits = scanProviderDischargeBehavioralHealthForbiddenPhrases("behavioral_health_bad_safe_v1", "en", {
        ...body,
        returnPrecautions: "Patient is safe for discharge.",
      });
      expect(hits.some((h) => h.includes("safe-for-discharge"))).toBe(true);
    });

    it("forbidden phrase clinically sober fails", () => {
      const body = syntheticBehavioralHealthTemplate({ id: "behavioral_health_bad_sober_v1" }).suggestedText.en;
      const hits = scanProviderDischargeBehavioralHealthForbiddenPhrases("behavioral_health_bad_sober_v1", "en", {
        ...body,
        description: "Patient is clinically sober.",
      });
      expect(hits.some((h) => h.includes("clinically-sober"))).toBe(true);
    });

    it("forbidden phrase has capacity fails", () => {
      const body = syntheticBehavioralHealthTemplate({ id: "behavioral_health_bad_capacity_v1" }).suggestedText.en;
      const hits = scanProviderDischargeBehavioralHealthForbiddenPhrases("behavioral_health_bad_capacity_v1", "en", {
        ...body,
        diagnosisInstructions: "Patient has capacity for discharge decisions.",
      });
      expect(hits.some((h) => h.includes("has-capacity"))).toBe(true);
    });

    it("safe escalation wording passes", () => {
      const template = syntheticBehavioralHealthTemplate({ id: "behavioral_health_escalation_en_v1" });
      expect(
        scanProviderDischargeBehavioralHealthEscalationLanguage(
          template.id,
          "en",
          template.suggestedText.en
        )
      ).toEqual([]);
      expect(validateProviderDischargeBehavioralHealthTemplateGovernance(template)).toEqual([]);
    });

    it("FR escalation wording passes", () => {
      const template = syntheticBehavioralHealthTemplate({ id: "behavioral_health_escalation_fr_v1" });
      expect(
        scanProviderDischargeBehavioralHealthEscalationLanguage(
          template.id,
          "fr",
          template.suggestedText.fr
        )
      ).toEqual([]);
    });

    it("behavioralHealthSafety metadata included in registry snapshot/hash", () => {
      const template = syntheticBehavioralHealthTemplate({ id: "behavioral_health_hash_v1" });
      const payload = buildProviderDischargeTemplateHashPayload(template, "en");
      expect(payload.behavioralHealthSafety).toEqual({
        requiresBehavioralHealthFollowUp: true,
        requiresCrisisResources: true,
        requiresHomicideRiskEscalation: true,
        requiresSelfHarmEscalation: true,
        requiresSubstanceUseResources: true,
        requiresWithdrawalPrecautions: true,
      });

      const snapshot = buildProviderDischargeRegistryGovernanceSnapshot(
        [...PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, template],
        "en"
      );
      const row = snapshot.find((entry) => entry.id === "behavioral_health_hash_v1") as Record<string, unknown>;
      expect(row.behavioralHealthSafety).toEqual(payload.behavioralHealthSafety);

      const base = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en");
      const withBh = computeProviderDischargeRegistryGovernanceSnapshotHash(
        [...PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, template],
        "en"
      );
      expect(withBh).not.toBe(base);
    });

    it("existing adult/pediatric/OB templates still validate", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("anxiety_panic_v1 behavioral_health specialty still validates without behavioralHealthSafety", () => {
      const anxiety = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "anxiety_panic_v1")!;
      expect(anxiety.specialtyCategory).toBe("behavioral_health");
      expect(anxiety.behavioralHealthSafety).toBeUndefined();
      expect(validateProviderDischargeBehavioralHealthTemplateGovernance(anxiety)).toEqual([]);
    });
  });

  describe("19Y.12 Batch 8 behavioral health & substance-use ED discharge templates", () => {
    const batchTemplates = () =>
      BATCH_8_BEHAVIORAL_HEALTH_ED_DISCHARGE_TEMPLATE_IDS.map(
        (id) => PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === id)!
      );

    const forbiddenBhPhrases = [
      "psychiatrically cleared",
      "denies si",
      "clinically sober",
      "safe for discharge",
      "has capacity",
      "intoxication resolved",
      "low risk for suicide",
      "no suicidal ideation",
      "medically cleared",
    ];

    const forbiddenFabricated = [
      "psychiatric consult completed",
      "safety plan completed",
      "ruled out",
      "denies hi",
    ];

    it("all 10 behavioral health templates exist", () => {
      expect(BATCH_8_BEHAVIORAL_HEALTH_ED_DISCHARGE_TEMPLATE_IDS).toHaveLength(10);
      for (const id of BATCH_8_BEHAVIORAL_HEALTH_ED_DISCHARGE_TEMPLATE_IDS) {
        expect(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.some((t) => t.id === id)).toBe(true);
      }
    });

    it("EN/FR bodies exist for batch 8 templates", () => {
      for (const template of batchTemplates()) {
        expect(template.suggestedText.en.description.trim()).not.toBe("");
        expect(template.suggestedText.fr.description.trim()).not.toBe("");
      }
    });

    it("behavioralHealthSafety metadata exists on all batch 8 templates", () => {
      for (const template of batchTemplates()) {
        expect(template.behavioralHealthSafety).toBeTruthy();
        expect(validateProviderDischargeBehavioralHealthTemplateGovernance(template)).toEqual([]);
      }
    });

    it("crisis-resource requirements enforced on crisis templates", () => {
      const suicidal = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find(
        (t) => t.id === "behavioral_health_suicidal_ideation_precautions_v1"
      )!;
      expect(suicidal.behavioralHealthSafety?.requiresCrisisResources).toBe(true);
      for (const locale of ["en", "fr"] as const) {
        expect(
          scanProviderDischargeBehavioralHealthForbiddenPhrases(suicidal.id, locale, suicidal.suggestedText[locale])
        ).toEqual([]);
      }
    });

    it("BH follow-up rows enforced when requiresBehavioralHealthFollowUp", () => {
      for (const template of batchTemplates()) {
        if (template.behavioralHealthSafety?.requiresBehavioralHealthFollowUp) {
          const specialties = (template.defaultFollowUps ?? []).map((row) => row.specialty.toUpperCase());
          expect(
            specialties.some((s) =>
              ["BEHAVIORAL_HEALTH", "PSYCHIATRY", "CRISIS_CLINIC", "SUBSTANCE_USE", "SUBSTANCE_USE_TREATMENT"].includes(s)
            )
          ).toBe(true);
        }
      }
    });

    it("substance-use resource requirements enforced", () => {
      const substance = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find(
        (t) => t.id === "behavioral_health_substance_use_resources_v1"
      )!;
      expect(substance.behavioralHealthSafety?.requiresSubstanceUseResources).toBe(true);
      expect(validateProviderDischargeBehavioralHealthTemplateGovernance(substance)).toEqual([]);
    });

    it("withdrawal precaution requirements enforced", () => {
      const withdrawal = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find(
        (t) => t.id === "behavioral_health_alcohol_withdrawal_precautions_v1"
      )!;
      expect(withdrawal.behavioralHealthSafety?.requiresWithdrawalPrecautions).toBe(true);
      expect(validateProviderDischargeBehavioralHealthTemplateGovernance(withdrawal)).toEqual([]);
    });

    it("forbidden phrase psychiatrically cleared fails", () => {
      const body = batchTemplates()[0].suggestedText.en;
      expect(
        scanProviderDischargeBehavioralHealthForbiddenPhrases("bh_bad", "en", {
          ...body,
          description: "Patient is psychiatrically cleared.",
        }).length
      ).toBeGreaterThan(0);
    });

    it("forbidden phrase denies SI fails", () => {
      const body = batchTemplates()[0].suggestedText.en;
      expect(
        scanProviderDischargeBehavioralHealthForbiddenPhrases("bh_bad", "en", {
          ...body,
          diagnosisInstructions: "Patient denies SI.",
        }).length
      ).toBeGreaterThan(0);
    });

    it("forbidden phrase clinically sober fails", () => {
      const body = batchTemplates()[0].suggestedText.en;
      expect(
        scanProviderDischargeBehavioralHealthForbiddenPhrases("bh_bad", "en", {
          ...body,
          description: "Patient is clinically sober.",
        }).length
      ).toBeGreaterThan(0);
    });

    it("forbidden phrase safe for discharge fails", () => {
      const body = batchTemplates()[0].suggestedText.en;
      expect(
        scanProviderDischargeBehavioralHealthForbiddenPhrases("bh_bad", "en", {
          ...body,
          returnPrecautions: "Patient is safe for discharge.",
        }).length
      ).toBeGreaterThan(0);
    });

    it("forbidden phrase has capacity fails", () => {
      const body = batchTemplates()[0].suggestedText.en;
      expect(
        scanProviderDischargeBehavioralHealthForbiddenPhrases("bh_bad", "en", {
          ...body,
          diagnosisInstructions: "Patient has capacity.",
        }).length
      ).toBeGreaterThan(0);
    });

    it("escalation wording passes EN for batch 8 templates", () => {
      for (const template of batchTemplates()) {
        expect(
          scanProviderDischargeBehavioralHealthEscalationLanguage(
            template.id,
            "en",
            template.suggestedText.en
          )
        ).toEqual([]);
      }
    });

    it("escalation wording passes FR for batch 8 templates", () => {
      for (const template of batchTemplates()) {
        expect(
          scanProviderDischargeBehavioralHealthEscalationLanguage(
            template.id,
            "fr",
            template.suggestedText.fr
          )
        ).toEqual([]);
      }
    });

    it("privacy validators pass for privacy-sensitive batch 8 templates", () => {
      for (const template of batchTemplates()) {
        if (!template.behavioralHealthSafety?.requiresPrivacySensitiveWording) continue;
        for (const locale of ["en", "fr"] as const) {
          expect(
            scanProviderDischargeBehavioralHealthPrivacyContent(template.id, locale, template.suggestedText[locale])
          ).toEqual([]);
        }
      }
    });

    it("no fabricated findings or forbidden certainty language in batch 8 templates", () => {
      for (const template of batchTemplates()) {
        for (const locale of ["en", "fr"] as const) {
          const blob = JSON.stringify(template.suggestedText[locale]).toLowerCase();
          for (const phrase of [...forbiddenBhPhrases, ...forbiddenFabricated]) {
            expect(blob, `${template.id} ${locale}`).not.toContain(phrase);
          }
        }
      }
    });

    it("no mapping collisions with adult anxiety or alcohol intoxication templates", () => {
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "F41.9", displayName: "Anxiety disorder, unspecified" })
          .template.id
      ).toBe("anxiety_panic_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "F41.0", displayName: "Panic disorder" }).template.id
      ).toBe("behavioral_health_anxiety_panic_symptoms_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "F10.129", displayName: "Alcohol intoxication" })
          .template.id
      ).toBe("alcohol_intoxication_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({
          displayName: "bh alcohol intoxication follow-up",
        }).template.id
      ).toBe("behavioral_health_alcohol_intoxication_follow_up_v1");
    });

    it("apply uses active locale for batch 8 template", () => {
      const cardFr = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-bh-dep",
        code: "F32.9",
        displayName: "Depressive episode",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "fr",
        actor: { displayName: "Dr Test", appliedAt: "2026-05-18T18:00:00.000Z" },
      });
      expect(cardFr.description).toContain("aggravation de la dépression");
      expect(cardFr.templateMeta?.appliedLocale).toBe("fr");
      expect(cardFr.templateMeta?.templateAppliedHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("intentional batch 8 addition updates registry snapshot hash", () => {
      const base = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en");
      const withoutBh = computeProviderDischargeRegistryGovernanceSnapshotHash(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.filter((t) => !t.id.startsWith("behavioral_health_")),
        "en"
      );
      expect(base).not.toBe(withoutBh);
    });

    it("existing adult/pediatric/OB templates still validate", () => {
      const nonBh = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.filter((t) => !t.id.startsWith("behavioral_health_"));
      const result = validateProviderDischargeTemplateRegistry(nonBh);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("19Y.13 trauma & MSK discharge template governance hardening", () => {
    it("ProviderDischargeTemplate supports traumaMskSafety metadata", () => {
      const template = syntheticTraumaMskTemplate({ id: "trauma_msk_metadata_v1" });
      expect(template.traumaMskSafety?.requiresFracturePrecautions).toBe(true);
      expect(template.traumaMskSafety?.requiresOrthopedicFollowUp).toBe(true);
    });

    it("trauma synthetic template missing traumaMskSafety fails", () => {
      const template = syntheticRegistryTemplate({
        id: "trauma_msk_missing_governance_v1",
        specialtyCategory: "orthopedics",
      });
      const errors = validateProviderDischargeTraumaMskTemplateGovernance(template);
      expect(errors.some((e) => e.includes("must define traumaMskSafety"))).toBe(true);
    });

    it("imaging-sensitive template missing imagingSensitive flag fails", () => {
      const template = syntheticTraumaMskTemplate({
        id: "trauma_msk_imaging_v1",
        traumaMskSafety: {
          requiresOrthopedicFollowUp: true,
        },
      });
      expect(
        validateProviderDischargeTraumaMskTemplateGovernance(template).some((e) =>
          e.includes("imagingSensitive")
        )
      ).toBe(true);
    });

    it("fracture-sensitive template missing fracture precautions fails", () => {
      const template = syntheticTraumaMskTemplate({
        id: "trauma_msk_fracture_v1",
        traumaMskSafety: {
          imagingSensitive: true,
          requiresOrthopedicFollowUp: true,
        },
      });
      expect(
        validateProviderDischargeTraumaMskTemplateGovernance(template).some((e) =>
          e.includes("requiresFracturePrecautions")
        )
      ).toBe(true);
    });

    it("neurovascular-sensitive template missing neurovascular precautions fails", () => {
      const template = syntheticTraumaMskTemplate({
        id: "trauma_msk_neurovascular_v1",
        traumaMskSafety: {
          imagingSensitive: true,
          requiresOrthopedicFollowUp: true,
        },
      });
      expect(
        validateProviderDischargeTraumaMskTemplateGovernance(template).some((e) =>
          e.includes("requiresNeurovascularPrecautions")
        )
      ).toBe(true);
    });

    it("compartment-sensitive template missing compartment precautions fails", () => {
      const template = syntheticTraumaMskTemplate({
        id: "trauma_msk_compartment_v1",
        traumaMskSafety: {
          imagingSensitive: true,
          requiresOrthopedicFollowUp: true,
        },
      });
      expect(
        validateProviderDischargeTraumaMskTemplateGovernance(template).some((e) =>
          e.includes("requiresCompartmentSyndromePrecautions")
        )
      ).toBe(true);
    });

    it("splint/cast-sensitive template missing splint precautions fails", () => {
      const template = syntheticTraumaMskTemplate({
        id: "trauma_msk_splint_v1",
        traumaMskSafety: {
          imagingSensitive: true,
          requiresOrthopedicFollowUp: true,
        },
      });
      expect(
        validateProviderDischargeTraumaMskTemplateGovernance(template).some((e) =>
          e.includes("requiresSplintCastPrecautions")
        )
      ).toBe(true);
    });

    it("head/neck/spine-sensitive template missing escalation wording fails", () => {
      const template = syntheticTraumaMskTemplate({
        id: "trauma_msk_head_neck_v1",
        traumaMskSafety: {
          imagingSensitive: true,
          requiresHeadNeckSpineEscalation: true,
          requiresOrthopedicFollowUp: true,
        },
        suggestedText: {
          en: {
            description: "Trauma evaluation.",
            diagnosisInstructions: "Follow instructions.",
            medicationTreatment: "As directed.",
            returnPrecautions: "Return if worse.",
          },
          fr: {
            description: "Évaluation traumatique.",
            diagnosisInstructions: "Suivez les instructions.",
            medicationTreatment: "Selon indications.",
            returnPrecautions: "Reconsultez si aggravation.",
          },
        },
      });
      expect(
        validateProviderDischargeTraumaMskTemplateGovernance(template).some((e) =>
          e.includes("head/neck/spine escalation")
        )
      ).toBe(true);
    });

    it("orthopedic follow-up requirement fails without ortho follow-up", () => {
      const template = syntheticTraumaMskTemplate({
        id: "trauma_msk_followup_missing_v1",
        defaultFollowUps: [
          {
            ...newDefaultFollowUpRow(),
            id: "pc-follow",
            specialty: "CARDIOLOGY",
            timing: "within 1 week",
          },
        ],
      });
      expect(
        validateProviderDischargeTraumaMskTemplateGovernance(template).some((e) =>
          e.includes("requiresOrthopedicFollowUp")
        )
      ).toBe(true);
    });

    it("orthopedic follow-up passes with ortho row", () => {
      const template = syntheticTraumaMskTemplate({ id: "trauma_msk_followup_ok_v1" });
      expect(validateProviderDischargeTraumaMskTemplateGovernance(template)).toEqual([]);
    });

    it("forbidden phrase fracture ruled out fails", () => {
      const body = syntheticTraumaMskTemplate({ id: "trauma_msk_bad_fracture_v1" }).suggestedText.en;
      const hits = scanProviderDischargeTraumaMskForbiddenPhrases("trauma_msk_bad_fracture_v1", "en", {
        ...body,
        description: "Fracture ruled out in the ED.",
      });
      expect(hits.some((h) => h.includes("fracture-ruled-out"))).toBe(true);
    });

    it("forbidden phrase x-ray normal fails", () => {
      const body = syntheticTraumaMskTemplate({ id: "trauma_msk_bad_xray_v1" }).suggestedText.en;
      const hits = scanProviderDischargeTraumaMskForbiddenPhrases("trauma_msk_bad_xray_v1", "en", {
        ...body,
        diagnosisInstructions: "X-ray normal during evaluation.",
      });
      expect(hits.some((h) => h.includes("x-ray-normal"))).toBe(true);
    });

    it("forbidden phrase neurovascularly intact fails", () => {
      const body = syntheticTraumaMskTemplate({ id: "trauma_msk_bad_neuro_v1" }).suggestedText.en;
      const hits = scanProviderDischargeTraumaMskForbiddenPhrases("trauma_msk_bad_neuro_v1", "en", {
        ...body,
        diagnosisInstructions: "Neurovascularly intact on exam.",
      });
      expect(hits.some((h) => h.includes("neurovascularly-intact"))).toBe(true);
    });

    it("forbidden phrase cleared for sports fails", () => {
      const body = syntheticTraumaMskTemplate({ id: "trauma_msk_bad_sports_v1" }).suggestedText.en;
      const hits = scanProviderDischargeTraumaMskForbiddenPhrases("trauma_msk_bad_sports_v1", "en", {
        ...body,
        returnWorkSchool: "Cleared for sports.",
      });
      expect(hits.some((h) => h.includes("cleared-for-sports"))).toBe(true);
    });

    it("forbidden phrase cervical spine cleared fails", () => {
      const body = syntheticTraumaMskTemplate({ id: "trauma_msk_bad_spine_v1" }).suggestedText.en;
      const hits = scanProviderDischargeTraumaMskForbiddenPhrases("trauma_msk_bad_spine_v1", "en", {
        ...body,
        description: "Cervical spine cleared.",
      });
      expect(hits.some((h) => h.includes("cervical-spine-cleared"))).toBe(true);
    });

    it("escalation wording passes EN", () => {
      const template = syntheticTraumaMskTemplate({ id: "trauma_msk_escalation_en_v1" });
      expect(
        scanProviderDischargeTraumaMskEscalationLanguage(
          template.id,
          "en",
          template.suggestedText.en
        )
      ).toEqual([]);
      expect(validateProviderDischargeTraumaMskTemplateGovernance(template)).toEqual([]);
    });

    it("escalation wording passes FR", () => {
      const template = syntheticTraumaMskTemplate({ id: "trauma_msk_escalation_fr_v1" });
      expect(
        scanProviderDischargeTraumaMskEscalationLanguage(
          template.id,
          "fr",
          template.suggestedText.fr
        )
      ).toEqual([]);
    });

    it("traumaMskSafety metadata included in registry snapshot/hash", () => {
      const template = syntheticTraumaMskTemplate({ id: "trauma_msk_hash_v1" });
      const payload = buildProviderDischargeTemplateHashPayload(template, "en");
      expect(payload.traumaMskSafety).toEqual({
        imagingSensitive: true,
        requiresCompartmentSyndromePrecautions: true,
        requiresFracturePrecautions: true,
        requiresHeadNeckSpineEscalation: true,
        requiresNeurovascularPrecautions: true,
        requiresOrthopedicFollowUp: true,
        requiresReturnActivityRestrictions: true,
        requiresSplintCastPrecautions: true,
      });

      const snapshot = buildProviderDischargeRegistryGovernanceSnapshot(
        [...PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, template],
        "en"
      );
      const row = snapshot.find((entry) => entry.id === "trauma_msk_hash_v1") as Record<string, unknown>;
      expect(row.traumaMskSafety).toEqual(payload.traumaMskSafety);

      const base = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en");
      const withMsk = computeProviderDischargeRegistryGovernanceSnapshotHash(
        [...PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, template],
        "en"
      );
      expect(withMsk).not.toBe(base);
    });

    it("existing adult/pediatric/OB/BH templates still validate", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("minor_head_injury_v1 and wound templates still validate without traumaMskSafety", () => {
      const head = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "minor_head_injury_v1")!;
      const wound = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "wound_laceration_v1")!;
      expect(validateProviderDischargeTraumaMskTemplateGovernance(head)).toEqual([]);
      expect(validateProviderDischargeTraumaMskTemplateGovernance(wound)).toEqual([]);
    });
  });

  describe("19Y.15 cardiology & high-risk medical discharge template governance hardening", () => {
    it("ProviderDischargeTemplate supports cardioHighRiskSafety metadata", () => {
      const template = syntheticCardioHighRiskTemplate({ id: "cardio_metadata_v1" });
      expect(template.cardioHighRiskSafety?.acsSensitive).toBe(true);
      expect(template.cardioHighRiskSafety?.requiresCardiologyFollowUp).toBe(true);
      expect(template.cardioHighRiskSafety?.requiresResultInterpretationCaution).toBe(true);
    });

    it("cardio/high-risk synthetic template missing cardioHighRiskSafety fails", () => {
      const template = syntheticRegistryTemplate({
        id: "cardio_missing_governance_v1",
        specialtyCategory: "cardiology",
        riskCategory: "high",
      });
      const errors = validateProviderDischargeCardioHighRiskTemplateGovernance(template);
      expect(errors.some((e) => e.includes("must define cardioHighRiskSafety"))).toBe(true);
    });

    it("ACS-sensitive template missing ACS flag fails", () => {
      const template = syntheticCardioHighRiskTemplate({
        id: "cardio_acs_watch_v1",
        cardioHighRiskSafety: {
          requiresCardiologyFollowUp: true,
          requiresEmergencyEscalation: true,
        },
      });
      expect(
        validateProviderDischargeCardioHighRiskTemplateGovernance(template).some((e) =>
          e.includes("acsSensitive")
        )
      ).toBe(true);
    });

    it("PE-sensitive template missing PE flag fails", () => {
      const template = syntheticCardioHighRiskTemplate({
        id: "cardio_pe_watch_v1",
        cardioHighRiskSafety: {
          requiresCardiologyFollowUp: true,
          requiresEmergencyEscalation: true,
        },
      });
      expect(
        validateProviderDischargeCardioHighRiskTemplateGovernance(template).some((e) =>
          e.includes("peSensitive")
        )
      ).toBe(true);
    });

    it("stroke/TIA-sensitive template missing stroke flag fails", () => {
      const template = syntheticCardioHighRiskTemplate({
        id: "cardio_stroke_tia_watch_v1",
        cardioHighRiskSafety: {
          requiresCardiologyFollowUp: true,
          requiresEmergencyEscalation: true,
        },
      });
      expect(
        validateProviderDischargeCardioHighRiskTemplateGovernance(template).some((e) =>
          e.includes("strokeTiaSensitive")
        )
      ).toBe(true);
    });

    it("EKG-sensitive template missing EKG flag fails", () => {
      const template = syntheticCardioHighRiskTemplate({
        id: "cardio_ekg_result_v1",
        cardioHighRiskSafety: {
          requiresCardiologyFollowUp: true,
          requiresEmergencyEscalation: true,
        },
      });
      expect(
        validateProviderDischargeCardioHighRiskTemplateGovernance(template).some((e) =>
          e.includes("ekgSensitive")
        )
      ).toBe(true);
    });

    it("troponin/lab-sensitive template missing lab flag fails", () => {
      const template = syntheticCardioHighRiskTemplate({
        id: "cardio_troponin_result_v1",
        cardioHighRiskSafety: {
          requiresCardiologyFollowUp: true,
          requiresEmergencyEscalation: true,
        },
      });
      expect(
        validateProviderDischargeCardioHighRiskTemplateGovernance(template).some((e) =>
          e.includes("troponinLabSensitive")
        )
      ).toBe(true);
    });

    it("anticoagulation-sensitive template missing anticoagulation flag fails", () => {
      const template = syntheticCardioHighRiskTemplate({
        id: "cardio_anticoagulation_v1",
        cardioHighRiskSafety: {
          requiresCardiologyFollowUp: true,
          requiresEmergencyEscalation: true,
        },
      });
      expect(
        validateProviderDischargeCardioHighRiskTemplateGovernance(template).some((e) =>
          e.includes("anticoagulationSensitive")
        )
      ).toBe(true);
    });

    it("syncope-sensitive template missing syncope flag fails", () => {
      const template = syntheticCardioHighRiskTemplate({
        id: "cardio_syncope_v1",
        cardioHighRiskSafety: {
          requiresCardiologyFollowUp: true,
          requiresEmergencyEscalation: true,
        },
      });
      expect(
        validateProviderDischargeCardioHighRiskTemplateGovernance(template).some((e) =>
          e.includes("syncopeSensitive")
        )
      ).toBe(true);
    });

    it("dyspnea-sensitive template missing dyspnea flag fails", () => {
      const template = syntheticCardioHighRiskTemplate({
        id: "cardio_dyspnea_v1",
        cardioHighRiskSafety: {
          requiresCardiologyFollowUp: true,
          requiresEmergencyEscalation: true,
        },
      });
      expect(
        validateProviderDischargeCardioHighRiskTemplateGovernance(template).some((e) =>
          e.includes("dyspneaSensitive")
        )
      ).toBe(true);
    });

    it("cardiology follow-up requirement fails without cardiology/appropriate follow-up", () => {
      const template = syntheticCardioHighRiskTemplate({
        id: "cardio_followup_missing_v1",
        defaultFollowUps: [
          {
            ...newDefaultFollowUpRow(),
            id: "cardio-neuro-only",
            specialty: "NEUROLOGY",
            timing: "within several days",
          },
        ],
        cardioHighRiskSafety: {
          requiresCardiologyFollowUp: true,
          requiresEmergencyEscalation: true,
        },
      });
      expect(
        validateProviderDischargeCardioHighRiskTemplateGovernance(template).some((e) =>
          e.includes("requiresCardiologyFollowUp")
        )
      ).toBe(true);
    });

    it("cardiology follow-up passes with cardiology row", () => {
      const template = syntheticCardioHighRiskTemplate({ id: "cardio_followup_ok_v1" });
      expect(validateProviderDischargeCardioHighRiskTemplateGovernance(template)).toEqual([]);
    });

    it('forbidden phrase "ACS ruled out" fails', () => {
      const body = syntheticCardioHighRiskTemplate({ id: "cardio_bad_acs_v1" }).suggestedText.en;
      const bad = { ...body, description: `${body.description} ACS ruled out.` };
      expect(scanProviderDischargeCardioHighRiskForbiddenPhrases("cardio_bad_acs_v1", "en", bad)).not.toEqual([]);
    });

    it('forbidden phrase "troponins negative" fails', () => {
      const body = syntheticCardioHighRiskTemplate({ id: "cardio_bad_trop_v1" }).suggestedText.en;
      const bad = { ...body, diagnosisInstructions: "Troponins negative today." };
      expect(scanProviderDischargeCardioHighRiskForbiddenPhrases("cardio_bad_trop_v1", "en", bad)).not.toEqual([]);
    });

    it('forbidden phrase "EKG normal" fails', () => {
      const body = syntheticCardioHighRiskTemplate({ id: "cardio_bad_ekg_v1" }).suggestedText.en;
      const bad = { ...body, diagnosisInstructions: "EKG normal during visit." };
      expect(scanProviderDischargeCardioHighRiskForbiddenPhrases("cardio_bad_ekg_v1", "en", bad)).not.toEqual([]);
    });

    it('forbidden phrase "PE ruled out" fails', () => {
      const body = syntheticCardioHighRiskTemplate({ id: "cardio_bad_pe_v1" }).suggestedText.en;
      const bad = { ...body, description: `${body.description} PE ruled out.` };
      expect(scanProviderDischargeCardioHighRiskForbiddenPhrases("cardio_bad_pe_v1", "en", bad)).not.toEqual([]);
    });

    it('forbidden phrase "low cardiac risk" fails', () => {
      const body = syntheticCardioHighRiskTemplate({ id: "cardio_bad_risk_v1" }).suggestedText.en;
      const bad = { ...body, description: `${body.description} Low cardiac risk.` };
      expect(scanProviderDischargeCardioHighRiskForbiddenPhrases("cardio_bad_risk_v1", "en", bad)).not.toEqual([]);
    });

    it('forbidden phrase "safe for discharge" fails', () => {
      const body = syntheticCardioHighRiskTemplate({ id: "cardio_bad_safe_v1" }).suggestedText.en;
      const bad = { ...body, returnPrecautions: `${body.returnPrecautions} Safe for discharge.` };
      expect(scanProviderDischargeCardioHighRiskForbiddenPhrases("cardio_bad_safe_v1", "en", bad)).not.toEqual([]);
    });

    it("safe escalation wording passes EN", () => {
      const template = syntheticCardioHighRiskTemplate({ id: "cardio_escalation_en_v1" });
      expect(
        scanProviderDischargeCardioHighRiskEscalationLanguage(
          template.id,
          "en",
          template.suggestedText.en
        )
      ).toEqual([]);
    });

    it("safe escalation wording passes FR", () => {
      const template = syntheticCardioHighRiskTemplate({ id: "cardio_escalation_fr_v1" });
      expect(
        scanProviderDischargeCardioHighRiskEscalationLanguage(
          template.id,
          "fr",
          template.suggestedText.fr
        )
      ).toEqual([]);
    });

    it("cardioHighRiskSafety metadata included in registry snapshot/hash", () => {
      const template = syntheticCardioHighRiskTemplate({ id: "cardio_hash_v1" });
      const payload = buildProviderDischargeTemplateHashPayload(template, "en");
      expect(payload.cardioHighRiskSafety).toEqual({
        acsSensitive: true,
        anticoagulationSensitive: true,
        dyspneaSensitive: true,
        ekgSensitive: true,
        peSensitive: true,
        requiresCardiologyFollowUp: true,
        requiresEmergencyEscalation: true,
        requiresResultInterpretationCaution: true,
        strokeTiaSensitive: true,
        syncopeSensitive: true,
        troponinLabSensitive: true,
      });

      const snapshot = buildProviderDischargeRegistryGovernanceSnapshot(
        [...PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, template],
        "en"
      );
      const row = snapshot.find((entry) => entry.id === "cardio_hash_v1") as Record<string, unknown>;
      expect(row.cardioHighRiskSafety).toEqual(payload.cardioHighRiskSafety);

      const base = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en");
      const withCardio = computeProviderDischargeRegistryGovernanceSnapshotHash(
        [...PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, template],
        "en"
      );
      expect(withCardio).not.toBe(base);
    });

    it("result interpretation caution blocks normal/negative result language", () => {
      const template = syntheticCardioHighRiskTemplate({ id: "cardio_result_interp_v1" });
      const bad = {
        ...template.suggestedText.en,
        diagnosisInstructions: "Normal EKG and negative troponin during this visit.",
      };
      expect(
        scanProviderDischargeCardioResultInterpretationForbiddenPhrases(
          template.id,
          "en",
          bad
        )
      ).not.toEqual([]);
    });

    it("existing adult/pediatric/OB/BH/trauma templates still validate", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("legacy high-risk neurology/pulmonology templates validate without cardioHighRiskSafety", () => {
      const tia = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "tia_stroke_like_v1")!;
      const seizure = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "seizure_v1")!;
      const sob = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "shortness_of_breath_v1")!;
      expect(validateProviderDischargeCardioHighRiskTemplateGovernance(tia)).toEqual([]);
      expect(validateProviderDischargeCardioHighRiskTemplateGovernance(seizure)).toEqual([]);
      expect(validateProviderDischargeCardioHighRiskTemplateGovernance(sob)).toEqual([]);
    });
  });

  describe("19Y.15A cardiology high-risk template governance extension", () => {
    it("cardioHighRiskSafety metadata supports the 5 new extension fields", () => {
      const template = syntheticCardioExtendedTemplate({ id: "cardio_extension_metadata_v1" });
      expect(template.cardioHighRiskSafety?.requiresDrivingRestrictionCaution).toBe(true);
      expect(template.cardioHighRiskSafety?.requiresAnticoagulationPrecautions).toBe(true);
      expect(template.cardioHighRiskSafety?.requiresFluidStatusPrecautions).toBe(true);
      expect(template.cardioHighRiskSafety?.requiresNeurologicEscalation).toBe(true);
      expect(template.cardioHighRiskSafety?.requiresChestPainEscalation).toBe(true);
    });

    it("hash includes true values only in stable sorted key order", () => {
      const template = syntheticCardioExtendedTemplate({ id: "cardio_extension_hash_v1" });
      const payload = buildProviderDischargeTemplateHashPayload(template, "en");
      const safety = payload.cardioHighRiskSafety ?? {};
      expect(safety).toEqual({
        acsSensitive: true,
        anticoagulationSensitive: true,
        dyspneaSensitive: true,
        ekgSensitive: true,
        peSensitive: true,
        requiresAnticoagulationPrecautions: true,
        requiresCardiologyFollowUp: true,
        requiresChestPainEscalation: true,
        requiresDrivingRestrictionCaution: true,
        requiresEmergencyEscalation: true,
        requiresFluidStatusPrecautions: true,
        requiresNeurologicEscalation: true,
        requiresResultInterpretationCaution: true,
        strokeTiaSensitive: true,
        syncopeSensitive: true,
        troponinLabSensitive: true,
      });
      expect(Object.keys(safety)).toEqual([
        "acsSensitive",
        "anticoagulationSensitive",
        "dyspneaSensitive",
        "ekgSensitive",
        "peSensitive",
        "requiresAnticoagulationPrecautions",
        "requiresCardiologyFollowUp",
        "requiresChestPainEscalation",
        "requiresDrivingRestrictionCaution",
        "requiresEmergencyEscalation",
        "requiresFluidStatusPrecautions",
        "requiresNeurologicEscalation",
        "requiresResultInterpretationCaution",
        "strokeTiaSensitive",
        "syncopeSensitive",
        "troponinLabSensitive",
      ]);
    });

    it("chest pain escalation missing fails", () => {
      const template = syntheticCardioExtendedTemplate({
        id: "cardio_extension_chest_pain_missing_v1",
        suggestedText: {
          en: {
            ...SYNTHETIC_CARDIO_EXTENDED_SAFE_TEXT.en,
            returnPrecautions: "Return for shortness of breath only.",
          },
          fr: { ...SYNTHETIC_CARDIO_EXTENDED_SAFE_TEXT.fr },
        },
      });
      expect(
        validateProviderDischargeCardioHighRiskTemplateGovernance(template).some((e) =>
          e.includes("chest pain")
        )
      ).toBe(true);
    });

    it("chest pain escalation present passes", () => {
      const template = syntheticCardioExtendedTemplate({ id: "cardio_extension_chest_pain_ok_v1" });
      expect(
        scanProviderDischargeCardioChestPainEscalationLanguage(
          template.id,
          "en",
          template.suggestedText.en
        )
      ).toEqual([]);
      expect(
        scanProviderDischargeCardioChestPainEscalationLanguage(
          template.id,
          "fr",
          template.suggestedText.fr
        )
      ).toEqual([]);
    });

    it("syncope recurrence/fall-risk missing fails", () => {
      const template = syntheticCardioExtendedTemplate({
        id: "cardio_extension_syncope_missing_v1",
        cardioHighRiskSafety: {
          syncopeSensitive: true,
        },
        suggestedText: {
          en: {
            ...SYNTHETIC_CARDIO_EXTENDED_SAFE_TEXT.en,
            returnPrecautions: "Return immediately for chest pain. Call 911.",
          },
          fr: { ...SYNTHETIC_CARDIO_EXTENDED_SAFE_TEXT.fr },
        },
      });
      expect(
        validateProviderDischargeCardioHighRiskTemplateGovernance(template).some((e) =>
          e.includes("syncope")
        )
      ).toBe(true);
    });

    it("CHF/fluid warning missing fails", () => {
      const template = syntheticCardioExtendedTemplate({
        id: "cardio_extension_fluid_missing_v1",
        cardioHighRiskSafety: {
          requiresFluidStatusPrecautions: true,
        },
        suggestedText: {
          en: {
            ...SYNTHETIC_CARDIO_EXTENDED_SAFE_TEXT.en,
            returnPrecautions: "Return immediately for chest pain. Call 911.",
          },
          fr: {
            ...SYNTHETIC_CARDIO_EXTENDED_SAFE_TEXT.fr,
            returnPrecautions: "Retournez immédiatement. Appelez le 911.",
          },
        },
      });
      expect(
        scanProviderDischargeCardioFluidStatusPrecautions(template.id, "en", template.suggestedText.en)
      ).not.toEqual([]);
      expect(
        scanProviderDischargeCardioFluidStatusPrecautions(template.id, "fr", template.suggestedText.fr)
      ).not.toEqual([]);
    });

    it("PE/DVT unsafe phrase fails", () => {
      const body = syntheticCardioExtendedTemplate({ id: "cardio_extension_pe_bad_v1" }).suggestedText.en;
      const bad = { ...body, description: `${body.description} DVT ruled out.` };
      expect(scanProviderDischargeCardioPeForbiddenPhrases("cardio_extension_pe_bad_v1", "en", bad)).not.toEqual(
        []
      );
    });

    it("neuro escalation missing fails", () => {
      const template = syntheticCardioExtendedTemplate({
        id: "cardio_extension_neuro_missing_v1",
        cardioHighRiskSafety: {
          requiresNeurologicEscalation: true,
        },
        suggestedText: {
          en: {
            ...SYNTHETIC_CARDIO_EXTENDED_SAFE_TEXT.en,
            returnPrecautions: "Return immediately for chest pain. Call 911.",
          },
          fr: {
            ...SYNTHETIC_CARDIO_EXTENDED_SAFE_TEXT.fr,
            returnPrecautions: "Retournez immédiatement. Appelez le 911.",
          },
        },
      });
      expect(
        scanProviderDischargeCardioNeurologicEscalationLanguage(
          template.id,
          "en",
          template.suggestedText.en
        )
      ).not.toEqual([]);
    });

    it("anticoag unsafe phrase fails", () => {
      const body = syntheticCardioExtendedTemplate({ id: "cardio_extension_anticoag_bad_v1" }).suggestedText.en;
      const bad = { ...body, medicationTreatment: "Anticoagulation not needed." };
      expect(
        scanProviderDischargeCardioAnticoagForbiddenPhrases("cardio_extension_anticoag_bad_v1", "en", bad)
      ).not.toEqual([]);
    });

    it("driving caution missing fails", () => {
      const template = syntheticCardioExtendedTemplate({
        id: "cardio_extension_driving_missing_v1",
        cardioHighRiskSafety: {
          requiresDrivingRestrictionCaution: true,
        },
        suggestedText: {
          en: {
            ...SYNTHETIC_CARDIO_EXTENDED_SAFE_TEXT.en,
            diagnosisInstructions: "Follow provider recommendations.",
          },
          fr: {
            ...SYNTHETIC_CARDIO_EXTENDED_SAFE_TEXT.fr,
            diagnosisInstructions: "Suivez les recommandations du clinicien.",
          },
        },
      });
      expect(
        scanProviderDischargeCardioDrivingRestrictionCaution(
          template.id,
          "en",
          template.suggestedText.en
        )
      ).not.toEqual([]);
    });

    it("FR equivalents pass for extension validators", () => {
      const template = syntheticCardioExtendedTemplate({ id: "cardio_extension_fr_ok_v1" });
      expect(
        scanProviderDischargeCardioChestPainEscalationLanguage(
          template.id,
          "fr",
          template.suggestedText.fr
        )
      ).toEqual([]);
      expect(
        scanProviderDischargeCardioSyncopePrecautions(template.id, "fr", template.suggestedText.fr)
      ).toEqual([]);
      expect(
        scanProviderDischargeCardioFluidStatusPrecautions(template.id, "fr", template.suggestedText.fr)
      ).toEqual([]);
      expect(
        scanProviderDischargeCardioNeurologicEscalationLanguage(
          template.id,
          "fr",
          template.suggestedText.fr
        )
      ).toEqual([]);
      expect(
        scanProviderDischargeCardioDrivingRestrictionCaution(
          template.id,
          "fr",
          template.suggestedText.fr
        )
      ).toEqual([]);
    });

    it("extended synthetic template passes full governance validation", () => {
      const template = syntheticCardioExtendedTemplate({ id: "cardio_extension_full_ok_v1" });
      expect(validateProviderDischargeCardioHighRiskTemplateGovernance(template)).toEqual([]);
    });

    it("existing templates still validate", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("19Y.17 infectious disease & sepsis-risk discharge template governance hardening", () => {
    it("ProviderDischargeTemplate supports infectiousRiskSafety metadata", () => {
      const template = syntheticInfectiousRiskTemplate({ id: "infectious_metadata_v1" });
      expect(template.infectiousRiskSafety?.sepsisSensitive).toBe(true);
      expect(template.infectiousRiskSafety?.requiresReturnIfWorsening).toBe(true);
      expect(template.infectiousRiskSafety?.requiresResultInterpretationCaution).toBe(true);
    });

    it("infectious candidate missing infectiousRiskSafety fails", () => {
      const template = syntheticRegistryTemplate({
        id: "infectious_missing_governance_v1",
        specialtyCategory: "infectious_disease",
      });
      const errors = validateProviderDischargeInfectiousRiskTemplateGovernance(template);
      expect(errors.some((e) => e.includes("must define infectiousRiskSafety"))).toBe(true);
    });

    it("sepsis-sensitive template missing sepsis flag fails", () => {
      const template = syntheticInfectiousRiskTemplate({
        id: "sepsis_watch_v1",
        infectiousRiskSafety: {
          requiresReturnIfWorsening: true,
        },
      });
      expect(
        validateProviderDischargeInfectiousRiskTemplateGovernance(template).some((e) =>
          e.includes("sepsisSensitive")
        )
      ).toBe(true);
    });

    it("meningitis-sensitive template missing neuro escalation fails", () => {
      const template = syntheticInfectiousRiskTemplate({
        id: "infectious_meningitis_watch_v1",
        infectiousRiskSafety: {
          meningitisSensitive: true,
          requiresReturnIfWorsening: true,
        },
      });
      expect(
        validateProviderDischargeInfectiousRiskTemplateGovernance(template).some((e) =>
          e.includes("requiresNeurologicEscalation")
        )
      ).toBe(true);
    });

    it("pneumonia-sensitive template missing respiratory escalation fails", () => {
      const template = syntheticInfectiousRiskTemplate({
        id: "respiratory_infectious_pneumonia_v1",
        infectiousRiskSafety: {
          pneumoniaSensitive: true,
          requiresReturnIfWorsening: true,
        },
      });
      expect(
        validateProviderDischargeInfectiousRiskTemplateGovernance(template).some((e) =>
          e.includes("requiresRespiratoryEscalation")
        )
      ).toBe(true);
    });

    it("dehydration-sensitive template missing hydration escalation fails", () => {
      const template = syntheticInfectiousRiskTemplate({
        id: "gi_infectious_dehydration_v1",
        infectiousRiskSafety: {
          dehydrationSensitive: true,
          requiresReturnIfWorsening: true,
        },
      });
      expect(
        validateProviderDischargeInfectiousRiskTemplateGovernance(template).some((e) =>
          e.includes("requiresHydrationEscalation")
        )
      ).toBe(true);
    });

    it("rash-sensitive template missing rash escalation fails", () => {
      const template = syntheticInfectiousRiskTemplate({
        id: "infectious_rash_v1",
        infectiousRiskSafety: {
          rashSensitive: true,
          requiresReturnIfWorsening: true,
        },
      });
      expect(
        validateProviderDischargeInfectiousRiskTemplateGovernance(template).some((e) =>
          e.includes("requiresRashEscalation")
        )
      ).toBe(true);
    });

    it("requiresReturnIfWorsening enforcement passes", () => {
      const template = syntheticInfectiousRiskTemplate({ id: "infectious_return_ok_v1" });
      expect(
        scanProviderDischargeInfectiousReturnIfWorseningLanguage(
          template.id,
          "en",
          template.suggestedText.en
        )
      ).toEqual([]);
      expect(
        scanProviderDischargeInfectiousReturnIfWorseningLanguage(
          template.id,
          "fr",
          template.suggestedText.fr
        )
      ).toEqual([]);
    });

    it("requiresPrimaryCareFollowUp enforcement passes", () => {
      const template = syntheticInfectiousRiskTemplate({
        id: "infectious_pcp_followup_ok_v1",
        infectiousRiskSafety: {
          requiresPrimaryCareFollowUp: true,
          requiresReturnIfWorsening: true,
        },
      });
      expect(validateProviderDischargeInfectiousRiskTemplateGovernance(template)).toEqual([]);
    });

    it("requiresPrimaryCareFollowUp fails without appropriate follow-up row", () => {
      const template = syntheticInfectiousRiskTemplate({
        id: "infectious_pcp_followup_missing_v1",
        defaultFollowUps: [
          {
            ...newDefaultFollowUpRow(),
            id: "inf-id-only",
            specialty: "INFECTIOUS_DISEASE",
            timing: "within several days",
          },
        ],
        infectiousRiskSafety: {
          requiresPrimaryCareFollowUp: true,
          requiresReturnIfWorsening: true,
        },
      });
      expect(
        validateProviderDischargeInfectiousRiskTemplateGovernance(template).some((e) =>
          e.includes("requiresPrimaryCareFollowUp")
        )
      ).toBe(true);
    });

    it("requiresInfectiousDiseaseFollowUp enforcement passes", () => {
      const template = syntheticInfectiousRiskTemplate({
        id: "infectious_id_followup_ok_v1",
        infectiousRiskSafety: {
          requiresInfectiousDiseaseFollowUp: true,
          requiresReturnIfWorsening: true,
        },
      });
      expect(validateProviderDischargeInfectiousRiskTemplateGovernance(template)).toEqual([]);
    });

    it('forbidden phrase "sepsis ruled out" fails', () => {
      const body = syntheticInfectiousRiskTemplate({ id: "infectious_bad_sepsis_v1" }).suggestedText.en;
      expect(
        scanProviderDischargeInfectiousRiskForbiddenPhrases("infectious_bad_sepsis_v1", "en", {
          ...body,
          description: "Sepsis ruled out in the ED.",
        }).length
      ).toBeGreaterThan(0);
    });

    it('forbidden phrase "cultures negative" fails', () => {
      const body = syntheticInfectiousRiskTemplate({ id: "infectious_bad_culture_v1" }).suggestedText.en;
      expect(
        scanProviderDischargeInfectiousRiskForbiddenPhrases("infectious_bad_culture_v1", "en", {
          ...body,
          diagnosisInstructions: "Cultures negative today.",
        }).length
      ).toBeGreaterThan(0);
    });

    it('forbidden phrase "viral illness confirmed" fails', () => {
      const body = syntheticInfectiousRiskTemplate({ id: "infectious_bad_viral_v1" }).suggestedText.en;
      expect(
        scanProviderDischargeInfectiousRiskForbiddenPhrases("infectious_bad_viral_v1", "en", {
          ...body,
          description: "Viral illness confirmed.",
        }).length
      ).toBeGreaterThan(0);
    });

    it('forbidden phrase "antibiotics not needed" fails', () => {
      const body = syntheticInfectiousRiskTemplate({ id: "infectious_bad_abx_v1" }).suggestedText.en;
      expect(
        scanProviderDischargeInfectiousRiskForbiddenPhrases("infectious_bad_abx_v1", "en", {
          ...body,
          medicationTreatment: "Antibiotics not needed.",
        }).length
      ).toBeGreaterThan(0);
    });

    it('forbidden phrase "chest x-ray normal" fails', () => {
      const body = syntheticInfectiousRiskTemplate({ id: "infectious_bad_xray_v1" }).suggestedText.en;
      expect(
        scanProviderDischargeInfectiousRiskForbiddenPhrases("infectious_bad_xray_v1", "en", {
          ...body,
          diagnosisInstructions: "Chest x-ray normal during visit.",
        }).length
      ).toBeGreaterThan(0);
    });

    it('forbidden phrase "infection resolved" fails', () => {
      const body = syntheticInfectiousRiskTemplate({ id: "infectious_bad_resolved_v1" }).suggestedText.en;
      expect(
        scanProviderDischargeInfectiousRiskForbiddenPhrases("infectious_bad_resolved_v1", "en", {
          ...body,
          description: "Infection resolved during visit.",
        }).length
      ).toBeGreaterThan(0);
    });

    it("EN escalation wording passes", () => {
      const template = syntheticInfectiousRiskTemplate({ id: "infectious_escalation_en_v1" });
      expect(
        scanProviderDischargeInfectiousFeverEscalationLanguage(
          template.id,
          "en",
          template.suggestedText.en
        )
      ).toEqual([]);
      expect(
        scanProviderDischargeInfectiousHydrationEscalationLanguage(
          template.id,
          "en",
          template.suggestedText.en
        )
      ).toEqual([]);
      expect(
        scanProviderDischargeInfectiousRespiratoryEscalationLanguage(
          template.id,
          "en",
          template.suggestedText.en
        )
      ).toEqual([]);
      expect(validateProviderDischargeInfectiousRiskTemplateGovernance(template)).toEqual([]);
    });

    it("FR escalation wording passes", () => {
      const template = syntheticInfectiousRiskTemplate({ id: "infectious_escalation_fr_v1" });
      expect(
        scanProviderDischargeInfectiousFeverEscalationLanguage(
          template.id,
          "fr",
          template.suggestedText.fr
        )
      ).toEqual([]);
      expect(
        scanProviderDischargeInfectiousNeurologicEscalationLanguage(
          template.id,
          "fr",
          template.suggestedText.fr
        )
      ).toEqual([]);
      expect(
        scanProviderDischargeInfectiousRashEscalationLanguage(
          template.id,
          "fr",
          template.suggestedText.fr
        )
      ).toEqual([]);
    });

    it("infectiousRiskSafety metadata included in registry snapshot/hash", () => {
      const template = syntheticInfectiousRiskTemplate({ id: "infectious_hash_v1" });
      const payload = buildProviderDischargeTemplateHashPayload(template, "en");
      expect(payload.infectiousRiskSafety).toEqual({
        dehydrationSensitive: true,
        meningitisSensitive: true,
        pneumoniaSensitive: true,
        rashSensitive: true,
        requiresFeverEscalation: true,
        requiresHydrationEscalation: true,
        requiresInfectiousDiseaseFollowUp: true,
        requiresNeurologicEscalation: true,
        requiresPrimaryCareFollowUp: true,
        requiresRashEscalation: true,
        requiresRespiratoryEscalation: true,
        requiresResultInterpretationCaution: true,
        requiresReturnIfWorsening: true,
        sepsisSensitive: true,
      });

      const snapshot = buildProviderDischargeRegistryGovernanceSnapshot(
        [...PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, template],
        "en"
      );
      const row = snapshot.find((entry) => entry.id === "infectious_hash_v1") as Record<string, unknown>;
      expect(row.infectiousRiskSafety).toEqual(payload.infectiousRiskSafety);

      const base = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en");
      const withInfectious = computeProviderDischargeRegistryGovernanceSnapshotHash(
        [...PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, template],
        "en"
      );
      expect(withInfectious).not.toBe(base);
    });

    it("result interpretation caution blocks reassuring result language", () => {
      const template = syntheticInfectiousRiskTemplate({ id: "infectious_result_interp_v1" });
      expect(
        scanProviderDischargeInfectiousResultInterpretationForbiddenPhrases(
          template.id,
          "en",
          {
            ...template.suggestedText.en,
            diagnosisInstructions: "Reassuring labs and infection excluded.",
          }
        ).length
      ).toBeGreaterThan(0);
    });

    it("existing adult/pediatric/OB/BH/trauma/cardio templates still validate", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("legacy pneumonia and gastroenteritis templates validate without infectiousRiskSafety", () => {
      const pneumonia = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "pneumonia_v1")!;
      const gastro = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "gastroenteritis_v1")!;
      expect(validateProviderDischargeInfectiousRiskTemplateGovernance(pneumonia)).toEqual([]);
      expect(validateProviderDischargeInfectiousRiskTemplateGovernance(gastro)).toEqual([]);
    });
  });

  describe("19Y.19 renal/urology/electrolyte governance", () => {
    it("candidate detection applies only to renal_, urology_, electrolyte_ prefixes", () => {
      expect(isRenalElectrolyteProviderDischargeTemplateCandidate({ id: "renal_aki_v1" })).toBe(true);
      expect(isRenalElectrolyteProviderDischargeTemplateCandidate({ id: "urology_stone_v1" })).toBe(true);
      expect(isRenalElectrolyteProviderDischargeTemplateCandidate({ id: "electrolyte_k_v1" })).toBe(true);
      expect(isRenalElectrolyteProviderDischargeTemplateCandidate({ id: "dialysis_return_precautions_v1" })).toBe(true);
      expect(isRenalElectrolyteProviderDischargeTemplateCandidate({ id: "chest_pain_v1" })).toBe(false);
      expect(isRenalElectrolyteProviderDischargeTemplateCandidate({ id: "uti_v1" })).toBe(false);
    });

    it("renal candidate missing renalElectrolyteSafety fails", () => {
      const template = syntheticRegistryTemplate({ id: "renal_missing_governance_v1" });
      const errors = validateProviderDischargeRenalElectrolyteTemplateGovernance(template);
      expect(errors.some((e) => e.includes("must define renalElectrolyteSafety"))).toBe(true);
    });

    it("AKI forbidden phrases are blocked in suggested text", () => {
      const template = syntheticRenalElectrolyteTemplate({ id: "renal_aki_forbidden_v1" });
      const hits = scanProviderDischargeRenalElectrolyteForbiddenPhrases(template.id, "en", {
        ...template.suggestedText.en,
        diagnosisInstructions: "AKI resolved and renal function normal with creatinine normal.",
      });
      expect(hits.some((h) => h.includes("aki-resolved"))).toBe(true);
      expect(hits.some((h) => h.includes("renal-function-normal"))).toBe(true);
      expect(hits.some((h) => h.includes("creatinine-normal"))).toBe(true);
    });

    it("electrolyte forbidden phrases are blocked in suggested text", () => {
      const template = syntheticRenalElectrolyteTemplate({ id: "electrolyte_forbidden_v1" });
      const hits = scanProviderDischargeRenalElectrolyteForbiddenPhrases(template.id, "en", {
        ...template.suggestedText.en,
        returnPrecautions: "Potassium normal, sodium normal, magnesium normal, phosphorus normal, electrolytes normal.",
      });
      expect(hits.some((h) => h.includes("potassium-normal"))).toBe(true);
      expect(hits.some((h) => h.includes("electrolytes-normal"))).toBe(true);
    });

    it("dialysis forbidden phrases are blocked in suggested text", () => {
      const template = syntheticRenalElectrolyteTemplate({ id: "renal_dialysis_forbidden_v1" });
      const hits = scanProviderDischargeRenalElectrolyteForbiddenPhrases(template.id, "en", {
        ...template.suggestedText.en,
        description: "Dialysis not needed and kidneys stable.",
      });
      expect(hits.some((h) => h.includes("dialysis-not-needed"))).toBe(true);
      expect(hits.some((h) => h.includes("kidneys-stable"))).toBe(true);
    });

    it("obstruction forbidden phrases are blocked in suggested text", () => {
      const template = syntheticRenalElectrolyteTemplate({ id: "urology_obstruction_forbidden_v1" });
      const hits = scanProviderDischargeRenalElectrolyteForbiddenPhrases(template.id, "en", {
        ...template.suggestedText.en,
        diagnosisInstructions: "No obstruction, stone passed, and no kidney stone.",
      });
      expect(hits.some((h) => h.includes("no-obstruction"))).toBe(true);
      expect(hits.some((h) => h.includes("stone-passed"))).toBe(true);
      expect(hits.some((h) => h.includes("no-kidney-stone"))).toBe(true);
    });

    it("UTI forbidden phrases are blocked in suggested text", () => {
      const template = syntheticRenalElectrolyteTemplate({ id: "urology_uti_forbidden_v1" });
      const hits = scanProviderDischargeRenalElectrolyteForbiddenPhrases(template.id, "en", {
        ...template.suggestedText.en,
        description: "Infection cleared, UTI ruled out, pyelonephritis ruled out, urine normal.",
      });
      expect(hits.some((h) => h.includes("infection-cleared"))).toBe(true);
      expect(hits.some((h) => h.includes("uti-ruled-out"))).toBe(true);
      expect(hits.some((h) => h.includes("pyelonephritis-ruled-out"))).toBe(true);
    });

    it("result interpretation caution blocks reassuring result language", () => {
      const template = syntheticRenalElectrolyteTemplate({ id: "renal_result_interp_v1" });
      expect(
        scanProviderDischargeRenalElectrolyteResultInterpretationForbiddenPhrases(
          template.id,
          "en",
          {
            ...template.suggestedText.en,
            diagnosisInstructions: "Labs reassuring, imaging reassuring, CT negative, ultrasound normal.",
          }
        ).length
      ).toBeGreaterThan(0);
      expect(
        scanProviderDischargeRenalElectrolyteResultInterpretationForbiddenPhrases(
          template.id,
          "en",
          {
            ...template.suggestedText.en,
            returnPrecautions: "Kidney function stable, creatinine stable, electrolytes stable, no acute findings.",
          }
        ).some((h) => h.includes("kidney-function-stable"))
      ).toBe(true);
    });

    it("requiresHydrationPrecautions enforcement passes with EN markers", () => {
      const template = syntheticRenalElectrolyteTemplate({ id: "renal_hydration_ok_v1" });
      expect(
        scanProviderDischargeRenalElectrolyteHydrationPrecautionsLanguage(
          template.id,
          "en",
          template.suggestedText.en
        )
      ).toEqual([]);
    });

    it("requiresDialysisEscalation enforcement passes with EN markers", () => {
      const template = syntheticRenalElectrolyteTemplate({ id: "renal_dialysis_ok_v1" });
      expect(
        scanProviderDischargeRenalElectrolyteDialysisEscalationLanguage(
          template.id,
          "en",
          template.suggestedText.en
        )
      ).toEqual([]);
    });

    it("requiresUrinaryObstructionEscalation enforcement passes with EN markers", () => {
      const template = syntheticRenalElectrolyteTemplate({ id: "urology_obstruction_ok_v1" });
      expect(
        scanProviderDischargeRenalElectrolyteUrinaryObstructionEscalationLanguage(
          template.id,
          "en",
          template.suggestedText.en
        )
      ).toEqual([]);
    });

    it("requiresElectrolyteEscalation enforcement passes with EN markers", () => {
      const template = syntheticRenalElectrolyteTemplate({ id: "electrolyte_escalation_ok_v1" });
      expect(
        scanProviderDischargeRenalElectrolyteElectrolyteEscalationLanguage(
          template.id,
          "en",
          template.suggestedText.en
        )
      ).toEqual([]);
    });

    it("requiresCatheterPrecautions enforcement passes with EN markers", () => {
      const template = syntheticRenalElectrolyteTemplate({ id: "urology_catheter_ok_v1" });
      expect(
        scanProviderDischargeRenalElectrolyteCatheterPrecautionsLanguage(
          template.id,
          "en",
          template.suggestedText.en
        )
      ).toEqual([]);
    });

    it("requiresNephrologyFollowUp enforcement passes", () => {
      const template = syntheticRenalElectrolyteTemplate({ id: "renal_neph_followup_ok_v1" });
      expect(validateProviderDischargeRenalElectrolyteTemplateGovernance(template)).toEqual([]);
    });

    it("requiresNephrologyFollowUp fails without nephrology or primary care row", () => {
      const template = syntheticRenalElectrolyteTemplate({
        id: "renal_neph_followup_fail_v1",
        defaultFollowUps: [
          {
            ...newDefaultFollowUpRow(),
            id: "renal-uro-only",
            specialty: "UROLOGY",
            timing: "as directed",
          },
        ],
      });
      expect(
        validateProviderDischargeRenalElectrolyteTemplateGovernance(template).some((e) =>
          e.includes("requiresNephrologyFollowUp")
        )
      ).toBe(true);
    });

    it("requiresUrologyFollowUp fails without urology or primary care row", () => {
      const template = syntheticRenalElectrolyteTemplate({
        id: "urology_followup_fail_v1",
        defaultFollowUps: [
          {
            ...newDefaultFollowUpRow(),
            id: "renal-neph-only",
            specialty: "NEPHROLOGY",
            timing: "as directed",
          },
        ],
      });
      expect(
        validateProviderDischargeRenalElectrolyteTemplateGovernance(template).some((e) =>
          e.includes("requiresUrologyFollowUp")
        )
      ).toBe(true);
    });

    it("ID auto-flag detection requires akiSensitive for aki IDs", () => {
      const template = syntheticRenalElectrolyteTemplate({
        id: "renal_aki_watch_v1",
        renalElectrolyteSafety: {
          requiresHydrationPrecautions: true,
        },
      });
      expect(
        validateProviderDischargeRenalElectrolyteTemplateGovernance(template).some((e) =>
          e.includes("akiSensitive")
        )
      ).toBe(true);
    });

    it("ID auto-flag detection requires electrolyteSensitive for electrolyte IDs", () => {
      const template = syntheticRenalElectrolyteTemplate({
        id: "electrolyte_potassium_v1",
        renalElectrolyteSafety: {
          requiresElectrolyteEscalation: true,
        },
      });
      expect(
        validateProviderDischargeRenalElectrolyteTemplateGovernance(template).some((e) =>
          e.includes("electrolyteSensitive")
        )
      ).toBe(true);
    });

    it("normalized hash stability emits only true flags in sorted order", () => {
      const normalized = normalizeRenalElectrolyteSafetyForHash({
        requiresDialysisEscalation: true,
        akiSensitive: true,
        requiresHydrationPrecautions: false,
      });
      expect(normalized).toEqual({
        akiSensitive: true,
        requiresDialysisEscalation: true,
      });
      expect(normalizeRenalElectrolyteSafetyForHash(undefined)).toBeNull();
      expect(normalizeRenalElectrolyteSafetyForHash({})).toBeNull();
    });

    it("snapshot includes renalElectrolyteSafety", () => {
      const template = syntheticRenalElectrolyteTemplate({ id: "renal_hash_v1" });
      const payload = buildProviderDischargeTemplateHashPayload(template, "en");
      expect(payload.renalElectrolyteSafety).toEqual({
        akiSensitive: true,
        catheterSensitive: true,
        dehydrationSensitive: true,
        dialysisSensitive: true,
        electrolyteSensitive: true,
        hematuriaSensitive: true,
        pyelonephritisSensitive: true,
        renalColicSensitive: true,
        requiresCatheterPrecautions: true,
        requiresDialysisEscalation: true,
        requiresElectrolyteEscalation: true,
        requiresHydrationPrecautions: true,
        requiresNephrologyFollowUp: true,
        requiresResultInterpretationCaution: true,
        requiresUrinaryObstructionEscalation: true,
        requiresUrologyFollowUp: true,
        urinaryRetentionSensitive: true,
        utiSensitive: true,
      });

      const snapshot = buildProviderDischargeRegistryGovernanceSnapshot(
        [...PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, template],
        "en"
      );
      const row = snapshot.find((entry) => entry.id === "renal_hash_v1") as Record<string, unknown>;
      expect(row.renalElectrolyteSafety).toEqual(payload.renalElectrolyteSafety);

      const base = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en");
      const withRenal = computeProviderDischargeRegistryGovernanceSnapshotHash(
        [...PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, template],
        "en"
      );
      expect(withRenal).not.toBe(base);
    });

    it("legacy templates are exempt from renal-electrolyte governance", () => {
      const uti = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "uti_v1")!;
      const chest = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "chest_pain_v1")!;
      expect(validateProviderDischargeRenalElectrolyteTemplateGovernance(uti)).toEqual([]);
      expect(validateProviderDischargeRenalElectrolyteTemplateGovernance(chest)).toEqual([]);
    });

    it("EN escalation marker constants match governance expectations", () => {
      expect(PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_EN_HYDRATION_MARKERS).toContain("dehydration");
      expect(PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_EN_DIALYSIS_MARKERS).toContain("missed dialysis");
      expect(PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_EN_OBSTRUCTION_MARKERS).toContain("inability to urinate");
      expect(PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_EN_ELECTROLYTE_MARKERS).toContain("palpitations");
      expect(PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_EN_CATHETER_MARKERS).toContain("catheter not draining");
    });

    it("FR escalation marker constants match governance expectations", () => {
      expect(PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_FR_HYDRATION_MARKERS).toContain("déshydratation");
      expect(PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_FR_DIALYSIS_MARKERS).toContain("dialyse manquée");
      expect(PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_FR_OBSTRUCTION_MARKERS).toContain("incapacité à uriner");
      expect(PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_FR_ELECTROLYTE_MARKERS).toContain("évanouissement");
      expect(PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_FR_CATHETER_MARKERS).toContain("cathéter ne draine pas");
    });

    it("requiresHydrationPrecautions enforcement passes with FR markers", () => {
      const template = syntheticRenalElectrolyteTemplate({ id: "renal_hydration_fr_ok_v1" });
      expect(
        scanProviderDischargeRenalElectrolyteHydrationPrecautionsLanguage(
          template.id,
          "fr",
          template.suggestedText.fr
        )
      ).toEqual([]);
    });

    it("requiresDialysisEscalation enforcement passes with FR markers", () => {
      const template = syntheticRenalElectrolyteTemplate({ id: "renal_dialysis_fr_ok_v1" });
      expect(
        scanProviderDischargeRenalElectrolyteDialysisEscalationLanguage(
          template.id,
          "fr",
          template.suggestedText.fr
        )
      ).toEqual([]);
    });

    it("global forbidden phrases include safe-for-discharge and low risk", () => {
      const template = syntheticRenalElectrolyteTemplate({ id: "renal_global_forbidden_v1" });
      const hits = scanProviderDischargeRenalElectrolyteForbiddenPhrases(template.id, "en", {
        ...template.suggestedText.en,
        description: "Medically cleared, safe for discharge, low risk, kidney failure ruled out.",
      });
      expect(hits.some((h) => h.includes("medically-cleared"))).toBe(true);
      expect(hits.some((h) => h.includes("safe-for-discharge"))).toBe(true);
      expect(hits.some((h) => h.includes("low-risk"))).toBe(true);
      expect(hits.some((h) => h.includes("kidney-failure-ruled-out"))).toBe(true);
    });

    it("existing registry still validates with renal-electrolyte governance wired", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("19Y.21 endocrine/diabetes/metabolic governance", () => {
    it("candidate detection applies only to endocrine_, diabetes_, metabolic_ prefixes", () => {
      expect(isEndocrineMetabolicProviderDischargeTemplateCandidate({ id: "diabetes_dka_v1" })).toBe(true);
      expect(isEndocrineMetabolicProviderDischargeTemplateCandidate({ id: "endocrine_followup_v1" })).toBe(true);
      expect(isEndocrineMetabolicProviderDischargeTemplateCandidate({ id: "metabolic_panel_v1" })).toBe(true);
      expect(isEndocrineMetabolicProviderDischargeTemplateCandidate({ id: "hyperglycemia_v1" })).toBe(false);
      expect(isEndocrineMetabolicProviderDischargeTemplateCandidate({ id: "hypoglycemia_v1" })).toBe(false);
    });

    it("endocrine candidate missing endocrineMetabolicSafety fails", () => {
      const template = syntheticRegistryTemplate({ id: "diabetes_missing_governance_v1" });
      const errors = validateProviderDischargeEndocrineMetabolicTemplateGovernance(template);
      expect(errors.some((e) => e.includes("must define endocrineMetabolicSafety"))).toBe(true);
    });

    it("DKA forbidden phrases are blocked in suggested text", () => {
      const template = syntheticEndocrineMetabolicTemplate({ id: "diabetes_dka_forbidden_v1" });
      const hits = scanProviderDischargeEndocrineMetabolicForbiddenPhrases(template.id, "en", {
        ...template.suggestedText.en,
        diagnosisInstructions: "DKA ruled out and no diabetic emergency.",
      });
      expect(hits.some((h) => h.includes("dka-ruled-out"))).toBe(true);
      expect(hits.some((h) => h.includes("no-diabetic-emergency"))).toBe(true);
    });

    it("HHS forbidden phrases are blocked in suggested text", () => {
      const template = syntheticEndocrineMetabolicTemplate({ id: "diabetes_hhs_forbidden_v1" });
      const hits = scanProviderDischargeEndocrineMetabolicForbiddenPhrases(template.id, "en", {
        ...template.suggestedText.en,
        description: "HHS ruled out with diabetic crisis resolved.",
      });
      expect(hits.some((h) => h.includes("hhs-ruled-out"))).toBe(true);
      expect(hits.some((h) => h.includes("diabetic-crisis-resolved"))).toBe(true);
    });

    it("glucose-control forbidden phrases are blocked in suggested text", () => {
      const template = syntheticEndocrineMetabolicTemplate({ id: "diabetes_glucose_forbidden_v1" });
      const hits = scanProviderDischargeEndocrineMetabolicForbiddenPhrases(template.id, "en", {
        ...template.suggestedText.en,
        returnPrecautions: "Blood sugar normal, glucose controlled, sugars stable, your sugars are controlled.",
      });
      expect(hits.some((h) => h.includes("blood-sugar-normal"))).toBe(true);
      expect(hits.some((h) => h.includes("glucose-controlled"))).toBe(true);
      expect(hits.some((h) => h.includes("sugars-are-controlled"))).toBe(true);
    });

    it("insulin forbidden phrases are blocked in suggested text", () => {
      const template = syntheticEndocrineMetabolicTemplate({ id: "diabetes_insulin_forbidden_v1" });
      const hits = scanProviderDischargeEndocrineMetabolicForbiddenPhrases(template.id, "en", {
        ...template.suggestedText.en,
        medicationTreatment: "Insulin not needed during this visit.",
      });
      expect(hits.some((h) => h.includes("insulin-not-needed"))).toBe(true);
    });

    it("metabolic forbidden phrases are blocked in suggested text", () => {
      const template = syntheticEndocrineMetabolicTemplate({ id: "metabolic_forbidden_v1" });
      const hits = scanProviderDischargeEndocrineMetabolicForbiddenPhrases(template.id, "en", {
        ...template.suggestedText.en,
        diagnosisInstructions: "Labs normal, electrolytes normal, anion gap normal, bicarbonate normal, metabolic issue resolved.",
      });
      expect(hits.some((h) => h.includes("labs-normal"))).toBe(true);
      expect(hits.some((h) => h.includes("metabolic-issue-resolved"))).toBe(true);
    });

    it("result interpretation caution blocks reassuring result language", () => {
      const template = syntheticEndocrineMetabolicTemplate({ id: "diabetes_result_interp_v1" });
      expect(
        scanProviderDischargeEndocrineMetabolicResultInterpretationForbiddenPhrases(
          template.id,
          "en",
          {
            ...template.suggestedText.en,
            diagnosisInstructions: "Glucose reassuring, labs reassuring, ketones negative, metabolic panel normal.",
          }
        ).length
      ).toBeGreaterThan(0);
      expect(
        scanProviderDischargeEndocrineMetabolicResultInterpretationForbiddenPhrases(
          template.id,
          "en",
          {
            ...template.suggestedText.en,
            returnPrecautions: "DKA excluded, HHS excluded, diabetic emergency excluded, sugars controlled.",
          }
        ).some((h) => h.includes("dka-excluded"))
      ).toBe(true);
    });

    it("requiresGlucoseEscalation enforcement passes with EN markers", () => {
      const template = syntheticEndocrineMetabolicTemplate({ id: "diabetes_glucose_ok_v1" });
      expect(
        scanProviderDischargeEndocrineMetabolicGlucoseEscalationLanguage(
          template.id,
          "en",
          template.suggestedText.en
        )
      ).toEqual([]);
    });

    it("requiresHydrationEscalation enforcement passes with EN markers", () => {
      const template = syntheticEndocrineMetabolicTemplate({ id: "diabetes_hydration_ok_v1" });
      expect(
        scanProviderDischargeEndocrineMetabolicHydrationEscalationLanguage(
          template.id,
          "en",
          template.suggestedText.en
        )
      ).toEqual([]);
    });

    it("requiresInsulinPrecautions enforcement passes with EN markers", () => {
      const template = syntheticEndocrineMetabolicTemplate({ id: "diabetes_insulin_ok_v1" });
      expect(
        scanProviderDischargeEndocrineMetabolicInsulinPrecautionsLanguage(
          template.id,
          "en",
          template.suggestedText.en
        )
      ).toEqual([]);
    });

    it("requiresNeurologicEscalation enforcement passes with EN markers", () => {
      const template = syntheticEndocrineMetabolicTemplate({ id: "diabetes_neuro_ok_v1" });
      expect(
        scanProviderDischargeEndocrineMetabolicNeurologicEscalationLanguage(
          template.id,
          "en",
          template.suggestedText.en
        )
      ).toEqual([]);
    });

    it("requiresDiabetesFollowUp enforcement passes", () => {
      const template = syntheticEndocrineMetabolicTemplate({ id: "diabetes_followup_ok_v1" });
      expect(validateProviderDischargeEndocrineMetabolicTemplateGovernance(template)).toEqual([]);
    });

    it("requiresDiabetesFollowUp fails without primary care or endocrinology row", () => {
      const template = syntheticEndocrineMetabolicTemplate({
        id: "diabetes_followup_fail_v1",
        defaultFollowUps: [
          {
            ...newDefaultFollowUpRow(),
            id: "endo-cardio-only",
            specialty: "CARDIOLOGY",
            timing: "as directed",
          },
        ],
      });
      expect(
        validateProviderDischargeEndocrineMetabolicTemplateGovernance(template).some((e) =>
          e.includes("requiresDiabetesFollowUp")
        )
      ).toBe(true);
    });

    it("requiresEndocrinologyFollowUp fails without endocrinology row", () => {
      const template = syntheticEndocrineMetabolicTemplate({
        id: "endocrine_followup_fail_v1",
        defaultFollowUps: [
          {
            ...newDefaultFollowUpRow(),
            id: "endo-pcp-only",
            specialty: "PRIMARY_CARE",
            timing: "as directed",
          },
        ],
      });
      expect(
        validateProviderDischargeEndocrineMetabolicTemplateGovernance(template).some((e) =>
          e.includes("requiresEndocrinologyFollowUp")
        )
      ).toBe(true);
    });

    it("ID auto-flag detection requires dkaSensitive for dka IDs", () => {
      const template = syntheticEndocrineMetabolicTemplate({
        id: "diabetes_dka_watch_v1",
        endocrineMetabolicSafety: {
          requiresGlucoseEscalation: true,
        },
      });
      expect(
        validateProviderDischargeEndocrineMetabolicTemplateGovernance(template).some((e) =>
          e.includes("dkaSensitive")
        )
      ).toBe(true);
    });

    it("ID auto-flag detection requires metabolicSensitive for metabolic IDs", () => {
      const template = syntheticEndocrineMetabolicTemplate({
        id: "metabolic_abnormality_v1",
        endocrineMetabolicSafety: {
          requiresNeurologicEscalation: true,
        },
      });
      expect(
        validateProviderDischargeEndocrineMetabolicTemplateGovernance(template).some((e) =>
          e.includes("metabolicSensitive")
        )
      ).toBe(true);
    });

    it("normalized hash stability emits only true flags in sorted order", () => {
      const normalized = normalizeEndocrineMetabolicSafetyForHash({
        requiresGlucoseEscalation: true,
        dkaSensitive: true,
        requiresInsulinPrecautions: false,
      });
      expect(normalized).toEqual({
        dkaSensitive: true,
        requiresGlucoseEscalation: true,
      });
      expect(normalizeEndocrineMetabolicSafetyForHash(undefined)).toBeNull();
      expect(normalizeEndocrineMetabolicSafetyForHash({})).toBeNull();
    });

    it("snapshot includes endocrineMetabolicSafety", () => {
      const template = syntheticEndocrineMetabolicTemplate({ id: "diabetes_hash_v1" });
      const payload = buildProviderDischargeTemplateHashPayload(template, "en");
      expect(payload.endocrineMetabolicSafety).toEqual({
        dehydrationSensitive: true,
        diabetesSensitive: true,
        dkaSensitive: true,
        endocrineSensitive: true,
        hhsSensitive: true,
        hyperglycemiaSensitive: true,
        hypoglycemiaSensitive: true,
        insulinSensitive: true,
        metabolicSensitive: true,
        requiresDiabetesFollowUp: true,
        requiresEndocrinologyFollowUp: true,
        requiresGlucoseEscalation: true,
        requiresHydrationEscalation: true,
        requiresInsulinPrecautions: true,
        requiresNeurologicEscalation: true,
        requiresResultInterpretationCaution: true,
      });

      const snapshot = buildProviderDischargeRegistryGovernanceSnapshot(
        [...PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, template],
        "en"
      );
      const row = snapshot.find((entry) => entry.id === "diabetes_hash_v1") as Record<string, unknown>;
      expect(row.endocrineMetabolicSafety).toEqual(payload.endocrineMetabolicSafety);

      const base = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en");
      const withEndocrine = computeProviderDischargeRegistryGovernanceSnapshotHash(
        [...PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, template],
        "en"
      );
      expect(withEndocrine).not.toBe(base);
    });

    it("legacy templates are exempt from endocrine-metabolic governance", () => {
      const hyper = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "hyperglycemia_v1")!;
      const hypo = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "hypoglycemia_v1")!;
      expect(validateProviderDischargeEndocrineMetabolicTemplateGovernance(hyper)).toEqual([]);
      expect(validateProviderDischargeEndocrineMetabolicTemplateGovernance(hypo)).toEqual([]);
    });

    it("EN escalation marker constants match governance expectations", () => {
      expect(PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_EN_GLUCOSE_MARKERS).toContain("return immediately");
      expect(PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_EN_HYDRATION_MARKERS).toContain("dehydration");
      expect(PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_EN_INSULIN_MARKERS).toContain("do not skip insulin");
      expect(PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_EN_NEUROLOGIC_MARKERS).toContain("seizures");
    });

    it("FR escalation marker constants match governance expectations", () => {
      expect(PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_FR_GLUCOSE_MARKERS).toContain("retournez immédiatement");
      expect(PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_FR_HYDRATION_MARKERS).toContain("déshydratation");
      expect(PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_FR_INSULIN_MARKERS).toContain("ne sautez pas l'insuline");
      expect(PROVIDER_DISCHARGE_ENDOCRINE_METABOLIC_FR_NEUROLOGIC_MARKERS).toContain("convulsions");
    });

    it("requiresGlucoseEscalation enforcement passes with FR markers", () => {
      const template = syntheticEndocrineMetabolicTemplate({ id: "diabetes_glucose_fr_ok_v1" });
      expect(
        scanProviderDischargeEndocrineMetabolicGlucoseEscalationLanguage(
          template.id,
          "fr",
          template.suggestedText.fr
        )
      ).toEqual([]);
    });

    it("requiresHydrationEscalation enforcement passes with FR markers", () => {
      const template = syntheticEndocrineMetabolicTemplate({ id: "diabetes_hydration_fr_ok_v1" });
      expect(
        scanProviderDischargeEndocrineMetabolicHydrationEscalationLanguage(
          template.id,
          "fr",
          template.suggestedText.fr
        )
      ).toEqual([]);
    });

    it("requiresInsulinPrecautions enforcement passes with FR markers", () => {
      const template = syntheticEndocrineMetabolicTemplate({ id: "diabetes_insulin_fr_ok_v1" });
      expect(
        scanProviderDischargeEndocrineMetabolicInsulinPrecautionsLanguage(
          template.id,
          "fr",
          template.suggestedText.fr
        )
      ).toEqual([]);
    });

    it("requiresNeurologicEscalation enforcement passes with FR markers", () => {
      const template = syntheticEndocrineMetabolicTemplate({ id: "diabetes_neuro_fr_ok_v1" });
      expect(
        scanProviderDischargeEndocrineMetabolicNeurologicEscalationLanguage(
          template.id,
          "fr",
          template.suggestedText.fr
        )
      ).toEqual([]);
    });

    it("global forbidden phrases include safe-for-discharge and medically cleared", () => {
      const template = syntheticEndocrineMetabolicTemplate({ id: "diabetes_global_forbidden_v1" });
      const hits = scanProviderDischargeEndocrineMetabolicForbiddenPhrases(template.id, "en", {
        ...template.suggestedText.en,
        description: "Medically cleared, safe for discharge, low risk, you are stable, your diabetes is stable.",
      });
      expect(hits.some((h) => h.includes("medically-cleared"))).toBe(true);
      expect(hits.some((h) => h.includes("safe-for-discharge"))).toBe(true);
      expect(hits.some((h) => h.includes("you-are-stable"))).toBe(true);
      expect(hits.some((h) => h.includes("diabetes-is-stable"))).toBe(true);
    });

    it("existing registry still validates with endocrine-metabolic governance wired", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("19Y.23 neurology governance", () => {
    it("candidate detection applies only to neuro_, seizure_, stroke_, tia_ prefixes", () => {
      expect(isNeurologyProviderDischargeTemplateCandidate({ id: "neuro_headache_v1" })).toBe(true);
      expect(isNeurologyProviderDischargeTemplateCandidate({ id: "seizure_followup_v1" })).toBe(true);
      expect(isNeurologyProviderDischargeTemplateCandidate({ id: "stroke_tia_watch_v1" })).toBe(true);
      expect(isNeurologyProviderDischargeTemplateCandidate({ id: "tia_return_v1" })).toBe(true);
      expect(isNeurologyProviderDischargeTemplateCandidate({ id: "headache_v1" })).toBe(false);
      expect(isNeurologyProviderDischargeTemplateCandidate({ id: "syncope_v1" })).toBe(false);
    });

    it("neurology candidate missing neurologySafety fails", () => {
      const template = syntheticRegistryTemplate({ id: "neuro_missing_governance_v1" });
      const errors = validateProviderDischargeNeurologyTemplateGovernance(template);
      expect(errors.some((e) => e.includes("must define neurologySafety"))).toBe(true);
    });

    it("stroke forbidden phrases are blocked in suggested text", () => {
      const template = syntheticNeurologyTemplate({ id: "stroke_forbidden_v1" });
      const hits = scanProviderDischargeNeurologyForbiddenPhrases(template.id, "en", {
        ...template.suggestedText.en,
        diagnosisInstructions: "Stroke ruled out, low stroke risk, no neurologic emergency, no brain bleed.",
      });
      expect(hits.some((h) => h.includes("stroke-ruled-out"))).toBe(true);
      expect(hits.some((h) => h.includes("low-stroke-risk"))).toBe(true);
      expect(hits.some((h) => h.includes("no-neurologic-emergency"))).toBe(true);
    });

    it("TIA forbidden phrases are blocked in suggested text", () => {
      const template = syntheticNeurologyTemplate({ id: "tia_forbidden_v1" });
      const hits = scanProviderDischargeNeurologyForbiddenPhrases(template.id, "en", {
        ...template.suggestedText.en,
        description: "TIA ruled out with bleeding ruled out and no intracranial abnormality.",
      });
      expect(hits.some((h) => h.includes("tia-ruled-out"))).toBe(true);
      expect(hits.some((h) => h.includes("bleeding-ruled-out"))).toBe(true);
      expect(hits.some((h) => h.includes("no-intracranial-abnormality"))).toBe(true);
    });

    it("seizure forbidden phrases are blocked in suggested text", () => {
      const template = syntheticNeurologyTemplate({ id: "seizure_forbidden_v1" });
      const hits = scanProviderDischargeNeurologyForbiddenPhrases(template.id, "en", {
        ...template.suggestedText.en,
        returnPrecautions: "Seizure ruled out, no seizure activity, seizure unlikely to recur.",
      });
      expect(hits.some((h) => h.includes("seizure-ruled-out"))).toBe(true);
      expect(hits.some((h) => h.includes("no-seizure-activity"))).toBe(true);
      expect(hits.some((h) => h.includes("seizure-unlikely-recur"))).toBe(true);
    });

    it("driving-clearance forbidden phrases are blocked in suggested text", () => {
      const template = syntheticNeurologyTemplate({ id: "neuro_driving_forbidden_v1" });
      const hits = scanProviderDischargeNeurologyForbiddenPhrases(template.id, "en", {
        ...template.suggestedText.en,
        diagnosisInstructions: "Safe to drive, cleared to drive, return to driving, safe to work, cleared for activity.",
      });
      expect(hits.some((h) => h.includes("safe-to-drive"))).toBe(true);
      expect(hits.some((h) => h.includes("cleared-to-drive"))).toBe(true);
      expect(hits.some((h) => h.includes("return-to-driving"))).toBe(true);
      expect(hits.some((h) => h.includes("safe-to-work"))).toBe(true);
      expect(hits.some((h) => h.includes("cleared-for-activity"))).toBe(true);
    });

    it("concussion and head CT forbidden phrases are blocked in suggested text", () => {
      const template = syntheticNeurologyTemplate({ id: "neuro_concussion_forbidden_v1" });
      const hits = scanProviderDischargeNeurologyForbiddenPhrases(template.id, "en", {
        ...template.suggestedText.en,
        description: "Concussion resolved, no concussion, head CT normal, MRI normal, imaging normal, CT normal.",
      });
      expect(hits.some((h) => h.includes("concussion-resolved"))).toBe(true);
      expect(hits.some((h) => h.includes("head-ct-normal"))).toBe(true);
      expect(hits.some((h) => h.includes("mri-normal"))).toBe(true);
    });

    it("neurologic-stability forbidden phrases are blocked in suggested text", () => {
      const template = syntheticNeurologyTemplate({ id: "neuro_stability_forbidden_v1" });
      const hits = scanProviderDischargeNeurologyForbiddenPhrases(template.id, "en", {
        ...template.suggestedText.en,
        returnPrecautions:
          "Neurologically intact, symptoms fully resolved, stable neurologically, head bleed ruled out, no bleeding, return to sports.",
      });
      expect(hits.some((h) => h.includes("neurologically-intact"))).toBe(true);
      expect(hits.some((h) => h.includes("symptoms-fully-resolved"))).toBe(true);
      expect(hits.some((h) => h.includes("stable-neurologically"))).toBe(true);
      expect(hits.some((h) => h.includes("head-bleed-ruled-out"))).toBe(true);
      expect(hits.some((h) => h.includes("return-to-sports"))).toBe(true);
    });

    it("result interpretation caution blocks reassuring imaging and exclusion language", () => {
      const template = syntheticNeurologyTemplate({ id: "neuro_result_interp_v1" });
      expect(
        scanProviderDischargeNeurologyResultInterpretationForbiddenPhrases(template.id, "en", {
          ...template.suggestedText.en,
          diagnosisInstructions: "CT reassuring, MRI reassuring, EEG normal, imaging negative, no acute findings.",
        }).length
      ).toBeGreaterThan(0);
      expect(
        scanProviderDischargeNeurologyResultInterpretationForbiddenPhrases(template.id, "en", {
          ...template.suggestedText.en,
          returnPrecautions:
            "No acute intracranial process, neurologic workup negative, stroke excluded, seizure excluded.",
        }).some((h) => h.includes("stroke-excluded"))
      ).toBe(true);
    });

    it("requiresNeurologicEscalation enforcement passes with EN markers", () => {
      const template = syntheticNeurologyTemplate({ id: "neuro_escalation_ok_v1" });
      expect(
        scanProviderDischargeNeurologyNeurologicEscalationLanguage(template.id, "en", template.suggestedText.en)
      ).toEqual([]);
    });

    it("requiresDrivingRestrictionPrecautions enforcement passes with EN markers", () => {
      const template = syntheticNeurologyTemplate({ id: "neuro_driving_ok_v1" });
      expect(
        scanProviderDischargeNeurologyDrivingRestrictionPrecautionsLanguage(
          template.id,
          "en",
          template.suggestedText.en
        )
      ).toEqual([]);
    });

    it("requiresDrivingRestrictionPrecautions blocks cleared-to-drive wording", () => {
      const template = syntheticNeurologyTemplate({ id: "neuro_driving_block_v1" });
      const hits = scanProviderDischargeNeurologyDrivingForbiddenPhrases(template.id, "en", {
        ...template.suggestedText.en,
        diagnosisInstructions: "Cleared to drive today.",
      });
      expect(hits.some((h) => h.includes("cleared-to-drive"))).toBe(true);
    });

    it("requiresAnticoagulationPrecautions enforcement passes with EN markers", () => {
      const template = syntheticNeurologyTemplate({ id: "neuro_anticoag_ok_v1" });
      expect(
        scanProviderDischargeNeurologyAnticoagulationPrecautionsLanguage(template.id, "en", template.suggestedText.en)
      ).toEqual([]);
    });

    it("requiresHeadInjuryEscalation enforcement passes with EN markers", () => {
      const template = syntheticNeurologyTemplate({ id: "neuro_head_injury_ok_v1" });
      expect(
        scanProviderDischargeNeurologyHeadInjuryEscalationLanguage(template.id, "en", template.suggestedText.en)
      ).toEqual([]);
    });

    it("requiresSeizurePrecautions enforcement passes with EN markers", () => {
      const template = syntheticNeurologyTemplate({ id: "seizure_precautions_ok_v1" });
      expect(
        scanProviderDischargeNeurologySeizurePrecautionsLanguage(template.id, "en", template.suggestedText.en)
      ).toEqual([]);
    });

    it("requiresStrokeEscalation enforcement passes with EN markers", () => {
      const template = syntheticNeurologyTemplate({ id: "stroke_escalation_ok_v1" });
      expect(
        scanProviderDischargeNeurologyStrokeEscalationLanguage(template.id, "en", template.suggestedText.en)
      ).toEqual([]);
    });

    it("requiresNeurologyFollowUp enforcement passes", () => {
      const template = syntheticNeurologyTemplate({ id: "neuro_followup_ok_v1" });
      expect(validateProviderDischargeNeurologyTemplateGovernance(template)).toEqual([]);
    });

    it("requiresNeurologyFollowUp fails without neurology or primary care row", () => {
      const template = syntheticNeurologyTemplate({
        id: "neuro_followup_fail_v1",
        defaultFollowUps: [
          {
            ...newDefaultFollowUpRow(),
            id: "neuro-cardio-only",
            specialty: "CARDIOLOGY",
            timing: "as directed",
          },
        ],
      });
      expect(
        validateProviderDischargeNeurologyTemplateGovernance(template).some((e) =>
          e.includes("requiresNeurologyFollowUp")
        )
      ).toBe(true);
    });

    it("ID auto-flag detection requires seizureSensitive for seizure IDs", () => {
      const template = syntheticNeurologyTemplate({
        id: "seizure_watch_v1",
        neurologySafety: {
          requiresSeizurePrecautions: true,
        },
      });
      expect(
        validateProviderDischargeNeurologyTemplateGovernance(template).some((e) => e.includes("seizureSensitive"))
      ).toBe(true);
    });

    it("ID auto-flag detection requires strokeSensitive and neurologicDeficitSensitive for stroke IDs", () => {
      const template = syntheticNeurologyTemplate({
        id: "stroke_weakness_v1",
        neurologySafety: {
          requiresStrokeEscalation: true,
        },
      });
      const errors = validateProviderDischargeNeurologyTemplateGovernance(template);
      expect(errors.some((e) => e.includes("strokeSensitive"))).toBe(true);
      expect(errors.some((e) => e.includes("neurologicDeficitSensitive"))).toBe(true);
    });

    it("normalized hash stability emits only true flags in sorted order", () => {
      const normalized = normalizeNeurologySafetyForHash({
        requiresStrokeEscalation: true,
        strokeSensitive: true,
        requiresSeizurePrecautions: false,
      });
      expect(normalized).toEqual({
        requiresStrokeEscalation: true,
        strokeSensitive: true,
      });
      expect(normalizeNeurologySafetyForHash(undefined)).toBeNull();
      expect(normalizeNeurologySafetyForHash({})).toBeNull();
    });

    it("snapshot includes neurologySafety", () => {
      const template = syntheticNeurologyTemplate({ id: "neuro_hash_v1" });
      const payload = buildProviderDischargeTemplateHashPayload(template, "en");
      expect(payload.neurologySafety).toEqual({
        alteredMentalStatusSensitive: true,
        anticoagulationSensitive: true,
        concussionSensitive: true,
        headacheSensitive: true,
        neurologicDeficitSensitive: true,
        requiresAnticoagulationPrecautions: true,
        requiresDrivingRestrictionPrecautions: true,
        requiresHeadInjuryEscalation: true,
        requiresNeurologicEscalation: true,
        requiresNeurologyFollowUp: true,
        requiresResultInterpretationCaution: true,
        requiresSeizurePrecautions: true,
        requiresStrokeEscalation: true,
        seizureSensitive: true,
        strokeSensitive: true,
        syncopeSensitive: true,
        tiaSensitive: true,
      });

      const snapshot = buildProviderDischargeRegistryGovernanceSnapshot(
        [...PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, template],
        "en"
      );
      const row = snapshot.find((entry) => entry.id === "neuro_hash_v1") as Record<string, unknown>;
      expect(row.neurologySafety).toEqual(payload.neurologySafety);

      const base = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en");
      const withNeurology = computeProviderDischargeRegistryGovernanceSnapshotHash(
        [...PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, template],
        "en"
      );
      expect(withNeurology).not.toBe(base);
    });

    it("legacy templates are exempt from neurology governance", () => {
      const headache = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "headache_v1")!;
      const syncope = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "syncope_v1")!;
      const seizure = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "seizure_v1")!;
      const tia = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "tia_stroke_like_v1")!;
      expect(validateProviderDischargeNeurologyTemplateGovernance(headache)).toEqual([]);
      expect(validateProviderDischargeNeurologyTemplateGovernance(syncope)).toEqual([]);
      expect(validateProviderDischargeNeurologyTemplateGovernance(seizure)).toEqual([]);
      expect(validateProviderDischargeNeurologyTemplateGovernance(tia)).toEqual([]);
    });

    it("EN escalation marker constants match governance expectations", () => {
      expect(PROVIDER_DISCHARGE_NEUROLOGY_EN_NEUROLOGIC_MARKERS).toContain("return immediately");
      expect(PROVIDER_DISCHARGE_NEUROLOGY_EN_DRIVING_MARKERS).toContain("avoid driving");
      expect(PROVIDER_DISCHARGE_NEUROLOGY_EN_ANTICOAGULATION_MARKERS).toContain("blood thinner");
      expect(PROVIDER_DISCHARGE_NEUROLOGY_EN_HEAD_INJURY_MARKERS).toContain("seizures");
      expect(PROVIDER_DISCHARGE_NEUROLOGY_EN_SEIZURE_MARKERS).toContain("avoid swimming alone");
      expect(PROVIDER_DISCHARGE_NEUROLOGY_EN_STROKE_MARKERS).toContain("call 911");
    });

    it("FR escalation marker constants match governance expectations", () => {
      expect(PROVIDER_DISCHARGE_NEUROLOGY_FR_NEUROLOGIC_MARKERS).toContain("retournez immédiatement");
      expect(PROVIDER_DISCHARGE_NEUROLOGY_FR_DRIVING_MARKERS).toContain("évitez de conduire");
      expect(PROVIDER_DISCHARGE_NEUROLOGY_FR_ANTICOAGULATION_MARKERS).toContain("anticoagulant");
      expect(PROVIDER_DISCHARGE_NEUROLOGY_FR_HEAD_INJURY_MARKERS).toContain("convulsions");
      expect(PROVIDER_DISCHARGE_NEUROLOGY_FR_SEIZURE_MARKERS).toContain("évitez de nager seul");
      expect(PROVIDER_DISCHARGE_NEUROLOGY_FR_STROKE_MARKERS).toContain("appelez le 911");
    });

    it("requiresNeurologicEscalation enforcement passes with FR markers", () => {
      const template = syntheticNeurologyTemplate({ id: "neuro_escalation_fr_ok_v1" });
      expect(
        scanProviderDischargeNeurologyNeurologicEscalationLanguage(template.id, "fr", template.suggestedText.fr)
      ).toEqual([]);
    });

    it("requiresDrivingRestrictionPrecautions enforcement passes with FR markers", () => {
      const template = syntheticNeurologyTemplate({ id: "neuro_driving_fr_ok_v1" });
      expect(
        scanProviderDischargeNeurologyDrivingRestrictionPrecautionsLanguage(
          template.id,
          "fr",
          template.suggestedText.fr
        )
      ).toEqual([]);
    });

    it("global forbidden phrases include safe-for-discharge and medically cleared", () => {
      const template = syntheticNeurologyTemplate({ id: "neuro_global_forbidden_v1" });
      const hits = scanProviderDischargeNeurologyForbiddenPhrases(template.id, "en", {
        ...template.suggestedText.en,
        description: "Medically cleared and safe for discharge.",
      });
      expect(hits.some((h) => h.includes("medically-cleared"))).toBe(true);
      expect(hits.some((h) => h.includes("safe-for-discharge"))).toBe(true);
    });

    it("existing registry still validates with neurology governance wired", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("no localization regression in registry snapshot rows for neurologySafety field", () => {
      const enRow = buildProviderDischargeRegistryGovernanceSnapshot(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en")[0] as
        | Record<string, unknown>
        | undefined;
      const frRow = buildProviderDischargeRegistryGovernanceSnapshot(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "fr")[0] as
        | Record<string, unknown>
        | undefined;
      expect(enRow).toBeTruthy();
      expect(frRow).toBeTruthy();
      expect(enRow!.neurologySafety).toBeNull();
      expect(frRow!.neurologySafety).toBeNull();
    });
  });

  describe("19Y.22 endocrine/diabetes/metabolic templates", () => {
    const batchTemplates = () =>
      BATCH_13_ENDOCRINE_METABOLIC_TEMPLATE_IDS.map(
        (id) => PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === id)!
      );

    const governanceCandidates = () =>
      batchTemplates().filter((template) => isEndocrineMetabolicProviderDischargeTemplateCandidate(template));

    const forbiddenEndocrinePhrases = [
      "DKA ruled out",
      "HHS ruled out",
      "blood sugar normal",
      "glucose controlled",
      "A1c normal",
      "labs normal",
      "electrolytes normal",
      "ketones negative",
      "insulin not needed",
      "dehydration resolved",
      "no diabetic emergency",
      "hypoglycemia resolved",
      "hyperglycemia resolved",
      "metabolic issue resolved",
      "medically cleared",
      "safe for discharge",
    ];

    const forbiddenInterpretationPhrases = [
      "glucose reassuring",
      "metabolic panel normal",
      "DKA excluded",
      "HHS excluded",
      "sugars controlled",
    ];

    it("batch 13 IDs export exists with 10 templates", () => {
      expect(BATCH_13_ENDOCRINE_METABOLIC_TEMPLATE_IDS).toHaveLength(10);
      for (const id of BATCH_13_ENDOCRINE_METABOLIC_TEMPLATE_IDS) {
        expect(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.some((t) => t.id === id)).toBe(true);
      }
    });

    it("EN/FR bodies exist for all batch 13 templates", () => {
      for (const template of batchTemplates()) {
        expect(template.suggestedText.en.description.trim()).not.toBe("");
        expect(template.suggestedText.fr.description.trim()).not.toBe("");
      }
    });

    it("endocrineMetabolicSafety metadata exists on all batch 13 templates", () => {
      for (const template of batchTemplates()) {
        expect(template.endocrineMetabolicSafety).toBeTruthy();
      }
    });

    it("governance validation passes for all batch 13 templates", () => {
      for (const template of governanceCandidates()) {
        expect(validateProviderDischargeEndocrineMetabolicTemplateGovernance(template), template.id).toEqual([]);
      }
    });

    it("required endocrineMetabolicSafety flags are present per template", () => {
      expect(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "diabetes_hyperglycemia_followup_v1")!
          .endocrineMetabolicSafety
      ).toEqual({
        diabetesSensitive: true,
        hyperglycemiaSensitive: true,
        requiresGlucoseEscalation: true,
        requiresHydrationEscalation: true,
        requiresDiabetesFollowUp: true,
        requiresResultInterpretationCaution: true,
      });
      expect(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "diabetes_dka_return_precautions_v1")!
          .endocrineMetabolicSafety
      ).toEqual({
        diabetesSensitive: true,
        dkaSensitive: true,
        dehydrationSensitive: true,
        requiresGlucoseEscalation: true,
        requiresHydrationEscalation: true,
        requiresNeurologicEscalation: true,
        requiresDiabetesFollowUp: true,
        requiresResultInterpretationCaution: true,
      });
      expect(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "endocrine_thyroid_symptom_followup_v1")!
          .endocrineMetabolicSafety
      ).toEqual({
        endocrineSensitive: true,
        requiresEndocrinologyFollowUp: true,
        requiresResultInterpretationCaution: true,
      });
    });

    it("glucose escalation passes for batch 13 templates requiring it", () => {
      for (const template of batchTemplates()) {
        if (template.endocrineMetabolicSafety?.requiresGlucoseEscalation !== true) continue;
        for (const locale of ["en", "fr"] as const) {
          expect(
            scanProviderDischargeEndocrineMetabolicGlucoseEscalationLanguage(
              template.id,
              locale,
              template.suggestedText[locale]
            )
          ).toEqual([]);
        }
      }
    });

    it("hydration escalation passes for batch 13 templates requiring it", () => {
      for (const template of batchTemplates()) {
        if (template.endocrineMetabolicSafety?.requiresHydrationEscalation !== true) continue;
        for (const locale of ["en", "fr"] as const) {
          expect(
            scanProviderDischargeEndocrineMetabolicHydrationEscalationLanguage(
              template.id,
              locale,
              template.suggestedText[locale]
            )
          ).toEqual([]);
        }
      }
    });

    it("insulin precautions pass for batch 13 templates requiring them", () => {
      for (const template of batchTemplates()) {
        if (template.endocrineMetabolicSafety?.requiresInsulinPrecautions !== true) continue;
        for (const locale of ["en", "fr"] as const) {
          expect(
            scanProviderDischargeEndocrineMetabolicInsulinPrecautionsLanguage(
              template.id,
              locale,
              template.suggestedText[locale]
            )
          ).toEqual([]);
        }
      }
    });

    it("neurologic escalation passes for batch 13 templates requiring it", () => {
      for (const template of batchTemplates()) {
        if (template.endocrineMetabolicSafety?.requiresNeurologicEscalation !== true) continue;
        for (const locale of ["en", "fr"] as const) {
          expect(
            scanProviderDischargeEndocrineMetabolicNeurologicEscalationLanguage(
              template.id,
              locale,
              template.suggestedText[locale]
            )
          ).toEqual([]);
        }
      }
    });

    it("diabetes and endocrinology follow-up governance passes for batch 13 templates", () => {
      for (const template of governanceCandidates()) {
        const safety = template.endocrineMetabolicSafety;
        if (safety?.requiresDiabetesFollowUp !== true && safety?.requiresEndocrinologyFollowUp !== true) continue;
        expect(validateProviderDischargeEndocrineMetabolicTemplateGovernance(template), template.id).toEqual([]);
      }
    });

    it("unsafe certainty phrases are blocked in batch 13 templates", () => {
      for (const template of batchTemplates()) {
        for (const phrase of forbiddenEndocrinePhrases) {
          expect(
            scanProviderDischargeEndocrineMetabolicForbiddenPhrases(template.id, "en", {
              ...template.suggestedText.en,
              diagnosisInstructions: phrase,
            }).length
          ).toBeGreaterThan(0);
        }
      }
    });

    it("lab/glucose/ketone interpretation wording is blocked on flagged templates", () => {
      for (const template of batchTemplates()) {
        if (template.endocrineMetabolicSafety?.requiresResultInterpretationCaution !== true) continue;
        for (const phrase of forbiddenInterpretationPhrases) {
          expect(
            scanProviderDischargeEndocrineMetabolicResultInterpretationForbiddenPhrases(
              template.id,
              "en",
              {
                ...template.suggestedText.en,
                returnPrecautions: phrase,
              }
            ).length
          ).toBeGreaterThan(0);
        }
      }
    });

    it("insulin-not-needed wording is blocked in batch 13 templates", () => {
      for (const template of batchTemplates()) {
        expect(
          scanProviderDischargeEndocrineMetabolicForbiddenPhrases(template.id, "en", {
            ...template.suggestedText.en,
            medicationTreatment: "Insulin not needed during this visit.",
          }).some((h) => h.includes("insulin-not-needed"))
        ).toBe(true);
      }
    });

    it("safe for discharge and medically cleared wording is blocked", () => {
      for (const template of batchTemplates()) {
        const hits = scanProviderDischargeEndocrineMetabolicForbiddenPhrases(template.id, "en", {
          ...template.suggestedText.en,
          description: "Medically cleared and safe for discharge.",
        });
        expect(hits.some((h) => h.includes("medically-cleared"))).toBe(true);
        expect(hits.some((h) => h.includes("safe-for-discharge"))).toBe(true);
      }
    });

    it("mapping resolves batch 13 templates without legacy template collisions", () => {
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "Hyperglycemia" }).template.id
      ).toBe("hyperglycemia_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "Hypoglycemia" }).template.id
      ).toBe("hypoglycemia_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "diabetes hyperglycemia follow-up" }).template.id
      ).toBe("diabetes_hyperglycemia_followup_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "diabetes hypoglycemia follow-up" }).template.id
      ).toBe("diabetes_hypoglycemia_followup_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "low blood sugar follow-up" }).template.id
      ).toBe("diabetes_hypoglycemia_followup_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "DKA return precautions" }).template.id
      ).toBe("diabetes_dka_return_precautions_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "Dehydration" }).template.id
      ).toBe("dehydration_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "metabolic dehydration follow-up" }).template.id
      ).toBe("metabolic_dehydration_followup_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "diabetes sick day precautions" }).template.id
      ).toBe("diabetes_sick_day_precautions_v1");
    });

    it("apply uses active locale for batch 13 template", () => {
      const cardFr = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-dka",
        code: "Z99.99",
        displayName: "DKA return precautions",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "fr",
        actor: { displayName: "Dr Test", appliedAt: "2026-05-18T18:00:00.000Z" },
      });
      expect(cardFr.description.toLowerCase()).toContain("acidocétose");
      expect(cardFr.templateMeta?.appliedLocale).toBe("fr");
      expect(cardFr.templateMeta?.templateAppliedHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("applied hash includes endocrineMetabolicSafety for batch 13 template", () => {
      const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find(
        (t) => t.id === "diabetes_dka_return_precautions_v1"
      )!;
      const payload = buildProviderDischargeTemplateHashPayload(template, "en");
      expect(payload.endocrineMetabolicSafety).toEqual({
        dehydrationSensitive: true,
        diabetesSensitive: true,
        dkaSensitive: true,
        requiresDiabetesFollowUp: true,
        requiresGlucoseEscalation: true,
        requiresHydrationEscalation: true,
        requiresNeurologicEscalation: true,
        requiresResultInterpretationCaution: true,
      });
    });

    it("content integrity passes for batch 13 templates", () => {
      for (const template of batchTemplates()) {
        expect(validateProviderDischargeTemplateContentIntegrity(template)).toEqual([]);
      }
    });

    it("existing adult/pediatric/OB/BH/trauma/cardio/infectious/renal templates still validate", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("intentional batch 13 addition updates registry snapshot hash", () => {
      const base = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en");
      const withoutBatch13 = computeProviderDischargeRegistryGovernanceSnapshotHash(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.filter(
          (t) =>
            !BATCH_13_ENDOCRINE_METABOLIC_TEMPLATE_IDS.includes(
              t.id as (typeof BATCH_13_ENDOCRINE_METABOLIC_TEMPLATE_IDS)[number]
            )
        ),
        "en"
      );
      expect(withoutBatch13).not.toBe(base);
    });

    it("no React UI paragraph hardcoding for batch 13 templates", () => {
      const uiSource = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      expect(uiSource).not.toContain(
        "You were evaluated in the emergency department for diabetic ketoacidosis-related concerns and return precautions"
      );
      expect(uiSource).not.toContain(
        "Vous avez été pris en charge aux urgences pour des préoccupations liées à l'acidocétose diabétique"
      );
    });
  });

  describe("19Y.20 renal/urology/electrolyte templates", () => {
    const batchTemplates = () =>
      BATCH_12_RENAL_UROLOGY_ELECTROLYTE_TEMPLATE_IDS.map(
        (id) => PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === id)!
      );

    const governanceCandidates = () =>
      batchTemplates().filter((template) => isRenalElectrolyteProviderDischargeTemplateCandidate(template));

    const forbiddenRenalPhrases = [
      "AKI resolved",
      "labs normal",
      "stone passed",
      "dialysis not needed",
      "UTI ruled out",
      "safe for discharge",
      "medically cleared",
      "creatinine normal",
      "electrolytes normal",
      "renal function normal",
      "infection cleared",
      "pyelonephritis ruled out",
      "no obstruction",
    ];

    it("batch 12 IDs export exists with 10 templates", () => {
      expect(BATCH_12_RENAL_UROLOGY_ELECTROLYTE_TEMPLATE_IDS).toHaveLength(10);
      for (const id of BATCH_12_RENAL_UROLOGY_ELECTROLYTE_TEMPLATE_IDS) {
        expect(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.some((t) => t.id === id)).toBe(true);
      }
    });

    it("EN/FR bodies exist for all batch 12 templates", () => {
      for (const template of batchTemplates()) {
        expect(template.suggestedText.en.description.trim()).not.toBe("");
        expect(template.suggestedText.fr.description.trim()).not.toBe("");
      }
    });

    it("renalElectrolyteSafety metadata exists on all batch 12 templates", () => {
      for (const template of batchTemplates()) {
        expect(template.renalElectrolyteSafety).toBeTruthy();
      }
    });

    it("governance validation passes for renal/urology prefixed batch 12 templates", () => {
      for (const template of governanceCandidates()) {
        expect(validateProviderDischargeRenalElectrolyteTemplateGovernance(template), template.id).toEqual([]);
      }
    });

    it("required renalElectrolyteSafety flags are present per template", () => {
      expect(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "renal_aki_followup_v1")!.renalElectrolyteSafety
      ).toEqual({
        akiSensitive: true,
        requiresHydrationPrecautions: true,
        requiresElectrolyteEscalation: true,
        requiresNephrologyFollowUp: true,
        requiresResultInterpretationCaution: true,
      });
      expect(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "dialysis_return_precautions_v1")!
          .renalElectrolyteSafety
      ).toEqual({
        dialysisSensitive: true,
        requiresDialysisEscalation: true,
        requiresElectrolyteEscalation: true,
        requiresNephrologyFollowUp: true,
        requiresResultInterpretationCaution: true,
      });
    });

    it("hydration escalation passes for batch 12 templates requiring it", () => {
      for (const template of batchTemplates()) {
        if (template.renalElectrolyteSafety?.requiresHydrationPrecautions !== true) continue;
        for (const locale of ["en", "fr"] as const) {
          expect(
            scanProviderDischargeRenalElectrolyteHydrationPrecautionsLanguage(
              template.id,
              locale,
              template.suggestedText[locale]
            )
          ).toEqual([]);
        }
      }
    });

    it("dialysis escalation passes for batch 12 templates requiring it", () => {
      for (const template of batchTemplates()) {
        if (template.renalElectrolyteSafety?.requiresDialysisEscalation !== true) continue;
        for (const locale of ["en", "fr"] as const) {
          expect(
            scanProviderDischargeRenalElectrolyteDialysisEscalationLanguage(
              template.id,
              locale,
              template.suggestedText[locale]
            )
          ).toEqual([]);
        }
      }
    });

    it("urinary obstruction escalation passes for batch 12 templates requiring it", () => {
      for (const template of batchTemplates()) {
        if (template.renalElectrolyteSafety?.requiresUrinaryObstructionEscalation !== true) continue;
        for (const locale of ["en", "fr"] as const) {
          expect(
            scanProviderDischargeRenalElectrolyteUrinaryObstructionEscalationLanguage(
              template.id,
              locale,
              template.suggestedText[locale]
            )
          ).toEqual([]);
        }
      }
    });

    it("electrolyte escalation passes for batch 12 templates requiring it", () => {
      for (const template of batchTemplates()) {
        if (template.renalElectrolyteSafety?.requiresElectrolyteEscalation !== true) continue;
        for (const locale of ["en", "fr"] as const) {
          expect(
            scanProviderDischargeRenalElectrolyteElectrolyteEscalationLanguage(
              template.id,
              locale,
              template.suggestedText[locale]
            )
          ).toEqual([]);
        }
      }
    });

    it("catheter precautions pass for batch 12 templates requiring them", () => {
      for (const template of batchTemplates()) {
        if (template.renalElectrolyteSafety?.requiresCatheterPrecautions !== true) continue;
        for (const locale of ["en", "fr"] as const) {
          expect(
            scanProviderDischargeRenalElectrolyteCatheterPrecautionsLanguage(
              template.id,
              locale,
              template.suggestedText[locale]
            )
          ).toEqual([]);
        }
      }
    });

    it("follow-up governance passes for batch 12 templates requiring nephrology or urology follow-up", () => {
      for (const template of governanceCandidates()) {
        const safety = template.renalElectrolyteSafety;
        if (safety?.requiresNephrologyFollowUp !== true && safety?.requiresUrologyFollowUp !== true) continue;
        expect(validateProviderDischargeRenalElectrolyteTemplateGovernance(template), template.id).toEqual([]);
      }
    });

    it("unsafe certainty phrases are blocked in batch 12 templates", () => {
      for (const template of batchTemplates()) {
        for (const phrase of forbiddenRenalPhrases) {
          expect(
            scanProviderDischargeRenalElectrolyteForbiddenPhrases(template.id, "en", {
              ...template.suggestedText.en,
              diagnosisInstructions: phrase,
            }).length
          ).toBeGreaterThan(0);
        }
      }
    });

    it("result interpretation caution is enforced on flagged batch 12 templates", () => {
      for (const template of batchTemplates()) {
        if (template.renalElectrolyteSafety?.requiresResultInterpretationCaution !== true) continue;
        expect(
          scanProviderDischargeRenalElectrolyteResultInterpretationForbiddenPhrases(
            template.id,
            "en",
            {
              ...template.suggestedText.en,
              returnPrecautions: "Labs reassuring and creatinine stable with no acute findings.",
            }
          ).length
        ).toBeGreaterThan(0);
        expect(validateProviderDischargeRenalElectrolyteTemplateGovernance(template), template.id).toEqual([]);
      }
    });

    it("mapping resolves batch 12 templates without legacy template collisions", () => {
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "Urinary tract infection" }).template.id
      ).toBe("uti_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "UTI follow-up" }).template.id
      ).toBe("urology_uti_followup_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "kidney stone" }).template.id
      ).toBe("kidney_stone_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "kidney stone follow-up" }).template.id
      ).toBe("urology_renal_colic_followup_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "Dehydration" }).template.id
      ).toBe("dehydration_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "renal dehydration follow-up" }).template.id
      ).toBe("renal_dehydration_followup_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "AKI follow-up" }).template.id
      ).toBe("renal_aki_followup_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "dialysis return precautions" }).template.id
      ).toBe("dialysis_return_precautions_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "Foley catheter precautions" }).template.id
      ).toBe("urology_foley_catheter_precautions_v1");
    });

    it("apply uses active locale for batch 12 template", () => {
      const cardFr = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-aki",
        code: "N17.9",
        displayName: "AKI follow-up",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "fr",
        actor: { displayName: "Dr Test", appliedAt: "2026-05-18T18:00:00.000Z" },
      });
      expect(cardFr.description.toLowerCase()).toContain("insuffisance rénale");
      expect(cardFr.templateMeta?.appliedLocale).toBe("fr");
      expect(cardFr.templateMeta?.templateAppliedHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("applied hash includes renalElectrolyteSafety for batch 12 template", () => {
      const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "renal_aki_followup_v1")!;
      const payload = buildProviderDischargeTemplateHashPayload(template, "en");
      expect(payload.renalElectrolyteSafety).toEqual({
        akiSensitive: true,
        requiresElectrolyteEscalation: true,
        requiresHydrationPrecautions: true,
        requiresNephrologyFollowUp: true,
        requiresResultInterpretationCaution: true,
      });
    });

    it("content integrity passes for batch 12 templates", () => {
      for (const template of batchTemplates()) {
        expect(validateProviderDischargeTemplateContentIntegrity(template)).toEqual([]);
      }
    });

    it("existing registry still validates with batch 12 templates added", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("intentional batch 12 addition updates registry snapshot hash", () => {
      const base = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en");
      const withoutBatch12 = computeProviderDischargeRegistryGovernanceSnapshotHash(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.filter(
          (t) =>
            !BATCH_12_RENAL_UROLOGY_ELECTROLYTE_TEMPLATE_IDS.includes(
              t.id as (typeof BATCH_12_RENAL_UROLOGY_ELECTROLYTE_TEMPLATE_IDS)[number]
            )
        ),
        "en"
      );
      expect(withoutBatch12).not.toBe(base);
    });

    it("no React UI paragraph hardcoding for batch 12 templates", () => {
      const uiSource = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      expect(uiSource).not.toContain(
        "You were evaluated in the emergency department for acute kidney injury concerns requiring outpatient follow-up"
      );
      expect(uiSource).not.toContain(
        "Vous avez été pris en charge aux urgences pour des signes d'insuffisance rénale aiguë nécessitant un suivi ambulatoire"
      );
    });
  });

  describe("19Y.16 Batch 10 cardiology & high-risk medical ED discharge templates", () => {
    const batchTemplates = () =>
      BATCH_10_CARDIO_HIGH_RISK_ED_DISCHARGE_TEMPLATE_IDS.map(
        (id) => PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === id)!
      );

    const forbiddenCardioPhrases = [
      "acs ruled out",
      "mi ruled out",
      "heart attack ruled out",
      "pe ruled out",
      "pulmonary embolism ruled out",
      "stroke ruled out",
      "tia ruled out",
      "ekg normal",
      "ecg normal",
      "troponin negative",
      "troponins negative",
      "cardiac enzymes negative",
      "labs normal",
      "ct normal",
      "d-dimer negative",
      "low cardiac risk",
      "low risk chest pain",
      "medically cleared",
      "cleared by cardiology",
      "no blood clot",
      "no heart problem",
      "no neurologic event",
      "safe for discharge",
      "vasovagal confirmed",
      "benign fainting",
      "safe to drive",
      "fluid overload resolved",
      "heart failure compensated",
      "lungs clear",
      "ultrasound negative",
      "no clot",
      "no aneurysm",
      "vertigo confirmed",
      "rhythm controlled permanently",
      "stroke risk low",
      "anticoagulation not needed",
      "safe to stop blood thinner",
    ];

    it("all 10 cardiology/high-risk templates exist", () => {
      expect(BATCH_10_CARDIO_HIGH_RISK_ED_DISCHARGE_TEMPLATE_IDS).toHaveLength(10);
      for (const id of BATCH_10_CARDIO_HIGH_RISK_ED_DISCHARGE_TEMPLATE_IDS) {
        expect(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.some((t) => t.id === id)).toBe(true);
      }
    });

    it("EN/FR bodies exist for batch 10 templates", () => {
      for (const template of batchTemplates()) {
        expect(template.suggestedText.en.description.trim()).not.toBe("");
        expect(template.suggestedText.fr.description.trim()).not.toBe("");
      }
    });

    it("cardioHighRiskSafety metadata exists on all batch 10 templates", () => {
      for (const template of batchTemplates()) {
        expect(template.cardioHighRiskSafety).toBeTruthy();
        expect(validateProviderDischargeCardioHighRiskTemplateGovernance(template), template.id).toEqual([]);
      }
    });

    it("required cardioHighRiskSafety flags are present per template", () => {
      expect(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "cardio_hypertension_elevated_bp_v1")!
          .cardioHighRiskSafety
      ).toEqual({
        requiresEmergencyEscalation: true,
        requiresResultInterpretationCaution: true,
      });
      expect(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "cardio_chest_pain_low_risk_v1")!
          .cardioHighRiskSafety?.requiresChestPainEscalation
      ).toBe(true);
      expect(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "cardio_syncope_v1")!.cardioHighRiskSafety
          ?.syncopeSensitive
      ).toBe(true);
      expect(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "cardio_heart_failure_symptoms_v1")!
          .cardioHighRiskSafety?.requiresFluidStatusPrecautions
      ).toBe(true);
      expect(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "high_risk_medical_leg_swelling_v1")!
          .cardioHighRiskSafety?.peSensitive
      ).toBe(true);
      expect(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "cardio_afib_rate_controlled_v1")!
          .cardioHighRiskSafety?.requiresAnticoagulationPrecautions
      ).toBe(true);
    });

    it("no unsafe/certainty phrases in batch 10 templates", () => {
      for (const template of batchTemplates()) {
        for (const locale of ["en", "fr"] as const) {
          const blob = JSON.stringify(template.suggestedText[locale]).toLowerCase();
          for (const phrase of forbiddenCardioPhrases) {
            expect(blob, `${template.id} ${locale}`).not.toContain(phrase);
          }
        }
      }
    });

    it("forbidden phrase ACS ruled out fails", () => {
      const body = batchTemplates()[0].suggestedText.en;
      expect(
        scanProviderDischargeCardioHighRiskForbiddenPhrases("cardio_bad", "en", {
          ...body,
          description: "ACS ruled out in the ED.",
        }).length
      ).toBeGreaterThan(0);
    });

    it("forbidden phrase troponins negative fails", () => {
      const body = batchTemplates()[0].suggestedText.en;
      expect(
        scanProviderDischargeCardioHighRiskForbiddenPhrases("cardio_bad", "en", {
          ...body,
          diagnosisInstructions: "Troponins negative today.",
        }).length
      ).toBeGreaterThan(0);
    });

    it("forbidden phrase EKG normal fails", () => {
      const body = batchTemplates()[0].suggestedText.en;
      expect(
        scanProviderDischargeCardioHighRiskForbiddenPhrases("cardio_bad", "en", {
          ...body,
          diagnosisInstructions: "EKG normal during visit.",
        }).length
      ).toBeGreaterThan(0);
    });

    it("forbidden phrase PE ruled out fails", () => {
      const body = batchTemplates()[0].suggestedText.en;
      expect(
        scanProviderDischargeCardioPeForbiddenPhrases("cardio_bad", "en", {
          ...body,
          description: "PE ruled out.",
        }).length
      ).toBeGreaterThan(0);
    });

    it("forbidden phrase DVT ruled out fails", () => {
      const body = batchTemplates()[0].suggestedText.en;
      expect(
        scanProviderDischargeCardioPeForbiddenPhrases("cardio_bad", "en", {
          ...body,
          description: "DVT ruled out.",
        }).length
      ).toBeGreaterThan(0);
    });

    it("result interpretation wording blocked when caution flag set", () => {
      const chest = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "cardio_chest_pain_low_risk_v1")!;
      expect(
        scanProviderDischargeCardioResultInterpretationForbiddenPhrases(chest.id, "en", {
          ...chest.suggestedText.en,
          diagnosisInstructions: "Normal EKG and negative troponin.",
        }).length
      ).toBeGreaterThan(0);
    });

    it("chest pain escalation enforcement passes", () => {
      const chest = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "cardio_chest_pain_low_risk_v1")!;
      for (const locale of ["en", "fr"] as const) {
        expect(
          scanProviderDischargeCardioChestPainEscalationLanguage(chest.id, locale, chest.suggestedText[locale])
        ).toEqual([]);
      }
    });

    it("syncope recurrence/fall-risk/driving caution passes", () => {
      const syncope = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "cardio_syncope_v1")!;
      for (const locale of ["en", "fr"] as const) {
        expect(
          scanProviderDischargeCardioSyncopePrecautions(syncope.id, locale, syncope.suggestedText[locale])
        ).toEqual([]);
        expect(
          scanProviderDischargeCardioDrivingRestrictionCaution(syncope.id, locale, syncope.suggestedText[locale])
        ).toEqual([]);
      }
    });

    it("CHF fluid-status warnings pass", () => {
      const chf = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "cardio_heart_failure_symptoms_v1")!;
      for (const locale of ["en", "fr"] as const) {
        expect(
          scanProviderDischargeCardioFluidStatusPrecautions(chf.id, locale, chf.suggestedText[locale])
        ).toEqual([]);
      }
    });

    it("leg swelling PE/DVT-sensitive warnings pass", () => {
      const leg = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "high_risk_medical_leg_swelling_v1")!;
      for (const locale of ["en", "fr"] as const) {
        expect(
          scanProviderDischargeCardioPeForbiddenPhrases(leg.id, locale, leg.suggestedText[locale])
        ).toEqual([]);
        expect(
          scanProviderDischargeCardioPeEscalationLanguage(leg.id, locale, leg.suggestedText[locale])
        ).toEqual([]);
      }
    });

    it("headache/dizziness neurologic escalation passes", () => {
      const headache = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "high_risk_medical_headache_v1")!;
      const dizziness = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "high_risk_medical_dizziness_v1")!;
      for (const template of [headache, dizziness]) {
        for (const locale of ["en", "fr"] as const) {
          expect(
            scanProviderDischargeCardioNeurologicEscalationLanguage(
              template.id,
              locale,
              template.suggestedText[locale]
            )
          ).toEqual([]);
        }
      }
    });

    it("AFib anticoagulation precautions pass", () => {
      const afib = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "cardio_afib_rate_controlled_v1")!;
      for (const locale of ["en", "fr"] as const) {
        expect(
          scanProviderDischargeCardioAnticoagForbiddenPhrases(afib.id, locale, afib.suggestedText[locale])
        ).toEqual([]);
        expect(
          scanProviderDischargeCardioAnticoagPrecautions(afib.id, locale, afib.suggestedText[locale])
        ).toEqual([]);
      }
    });

    it("required follow-up rows exist per template", () => {
      const chest = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "cardio_chest_pain_low_risk_v1")!;
      expect((chest.defaultFollowUps ?? []).map((r) => r.specialty)).toContain("CARDIOLOGY");
      const afib = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "cardio_afib_rate_controlled_v1")!;
      expect((afib.defaultFollowUps ?? []).map((r) => r.specialty)).toContain("CARDIOLOGY");
      const chf = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "cardio_heart_failure_symptoms_v1")!;
      expect((chf.defaultFollowUps ?? []).map((r) => r.specialty)).toEqual(
        expect.arrayContaining(["CARDIOLOGY", "PRIMARY_CARE"])
      );
      const headache = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "high_risk_medical_headache_v1")!;
      expect((headache.defaultFollowUps ?? []).map((r) => r.specialty)).toEqual(
        expect.arrayContaining(["PRIMARY_CARE", "NEUROLOGY"])
      );
    });

    it("mapping resolves batch 10 templates without adult template collisions", () => {
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "I10", displayName: "Hypertension" }).template.id
      ).toBe("hypertension_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({
          displayName: "cardio elevated blood pressure",
        }).template.id
      ).toBe("cardio_hypertension_elevated_bp_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "high risk medical fatigue" }).template.id
      ).toBe("high_risk_medical_fatigue_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "hrm general weakness" }).template.id
      ).toBe("high_risk_medical_general_weakness_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "R42", displayName: "Dizziness" }).template.id
      ).toBe("vertigo_dizziness_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "hrm dizziness" }).template.id
      ).toBe("high_risk_medical_dizziness_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "R51.9", displayName: "Headache" }).template.id
      ).toBe("headache_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "hrm headache" }).template.id
      ).toBe("high_risk_medical_headache_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "hrm leg swelling" }).template.id
      ).toBe("high_risk_medical_leg_swelling_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "R07.9", displayName: "Chest pain" }).template.id
      ).toBe("chest_pain_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "chest pain follow-up" }).template.id
      ).toBe("cardio_chest_pain_low_risk_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "R55", displayName: "Syncope" }).template.id
      ).toBe("syncope_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "cardio syncope follow-up" }).template.id
      ).toBe("cardio_syncope_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "I48.91", displayName: "Atrial fibrillation" }).template.id
      ).toBe("cardio_afib_rate_controlled_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "I50.9", displayName: "Heart failure" }).template.id
      ).toBe("cardio_heart_failure_symptoms_v1");
    });

    it("apply uses active locale for batch 10 template", () => {
      const cardFr = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-cardio-chf",
        code: "I50.9",
        displayName: "Heart failure",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "fr",
        actor: { displayName: "Dr Test", appliedAt: "2026-05-18T18:00:00.000Z" },
      });
      expect(cardFr.description).toContain("insuffisance cardiaque");
      expect(cardFr.templateMeta?.appliedLocale).toBe("fr");
      expect(cardFr.templateMeta?.templateAppliedHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("shared planning merge remains bottom-only for batch 10 template", () => {
      const form = emptyProviderDischargeDocumentationForm();
      const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "cardio_afib_rate_controlled_v1")!;
      const merged = mergeTemplateSharedFieldsIntoForm(form, extractSharedFieldsFromTemplate(template, "en"));
      expect(merged.returnPrecautions.trim()).not.toBe("");
      expect(form.diagnosisDocs).toEqual([]);
    });

    it("provider-entered text is not overwritten on batch 10 apply", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-cardio-afib",
        code: "I48.91",
        displayName: "Atrial fibrillation",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: false,
        locale: "en",
      });
      card.description = "Clinician note retained";
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "I48.91", displayName: "Atrial fibrillation" });
      const next = applyProviderDischargeTemplateToCard(card, resolved, { locale: "en", overwriteExisting: false });
      expect(next.description).toBe("Clinician note retained");
    });

    it("no React UI paragraph hardcoding for batch 10 templates", () => {
      const uiSource = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      expect(uiSource).not.toContain("You were evaluated in the emergency department for atrial fibrillation");
      expect(uiSource).not.toContain("Vous avez été pris en charge aux urgences pour une fibrillation auriculaire");
    });

    it("escalation wording passes EN/FR for batch 10 templates", () => {
      for (const template of batchTemplates()) {
        for (const locale of ["en", "fr"] as const) {
          expect(
            scanProviderDischargeCardioHighRiskEscalationLanguage(
              template.id,
              locale,
              template.suggestedText[locale]
            )
          ).toEqual([]);
        }
      }
    });

    it("content integrity passes for batch 10 templates", () => {
      for (const template of batchTemplates()) {
        expect(validateProviderDischargeTemplateContentIntegrity(template)).toEqual([]);
      }
    });

    it("intentional batch 10 addition updates registry snapshot hash", () => {
      const base = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en");
      const withoutCardio = computeProviderDischargeRegistryGovernanceSnapshotHash(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.filter(
          (t) => !BATCH_10_CARDIO_HIGH_RISK_ED_DISCHARGE_TEMPLATE_IDS.includes(t.id as (typeof BATCH_10_CARDIO_HIGH_RISK_ED_DISCHARGE_TEMPLATE_IDS)[number])
        ),
        "en"
      );
      expect(base).not.toBe(withoutCardio);
    });

    it("existing adult/pediatric/OB/BH/trauma templates still validate", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("19Y.18 infectious disease & sepsis-risk templates", () => {
    const batchTemplates = () =>
      BATCH_11_INFECTIOUS_SEPSIS_ED_DISCHARGE_TEMPLATE_IDS.map(
        (id) => PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === id)!
      );

    const forbiddenInfectiousPhrases = [
      "sepsis ruled out",
      "no sepsis",
      "bacteremia ruled out",
      "meningitis ruled out",
      "pneumonia ruled out",
      "cultures negative",
      "blood cultures negative",
      "viral illness confirmed",
      "bacterial infection confirmed",
      "antibiotics not needed",
      "antibiotics sufficient",
      "infection resolved",
      "safe from infection",
      "medically cleared",
      "dehydration resolved",
      "no serious infection",
      "lungs clear",
      "chest x-ray normal",
      "urine culture negative",
      "no meningitis",
      "no bloodstream infection",
      "you do not have",
      "definitely viral",
      "definitely bacterial",
      "labs normal",
      "imaging normal",
      "reassuring labs",
      "infection excluded",
      "pneumonia excluded",
      "safe for discharge",
    ];

    it("batch 11 IDs export exists with 10 templates", () => {
      expect(BATCH_11_INFECTIOUS_SEPSIS_ED_DISCHARGE_TEMPLATE_IDS).toHaveLength(10);
      for (const id of BATCH_11_INFECTIOUS_SEPSIS_ED_DISCHARGE_TEMPLATE_IDS) {
        expect(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.some((t) => t.id === id)).toBe(true);
      }
    });

    it("EN/FR bodies exist for all batch 11 templates", () => {
      for (const template of batchTemplates()) {
        expect(template.suggestedText.en.description.trim()).not.toBe("");
        expect(template.suggestedText.fr.description.trim()).not.toBe("");
      }
    });

    it("infectiousRiskSafety metadata exists on all batch 11 templates", () => {
      for (const template of batchTemplates()) {
        expect(template.infectiousRiskSafety).toBeTruthy();
        expect(validateProviderDischargeInfectiousRiskTemplateGovernance(template), template.id).toEqual([]);
      }
    });

    it("required infectiousRiskSafety flags are present per template", () => {
      expect(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "infectious_fever_unknown_source_v1")!
          .infectiousRiskSafety
      ).toEqual({
        sepsisSensitive: true,
        requiresFeverEscalation: true,
        requiresReturnIfWorsening: true,
        requiresPrimaryCareFollowUp: true,
        requiresResultInterpretationCaution: true,
      });
      expect(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "infectious_upper_respiratory_infection_v1")!
          .infectiousRiskSafety
      ).toEqual({
        respiratoryInfectiousSensitive: true,
        requiresRespiratoryEscalation: true,
        requiresReturnIfWorsening: true,
        requiresPrimaryCareFollowUp: true,
      });
      expect(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "sepsis_risk_return_precautions_v1")!
          .infectiousRiskSafety?.sepsisSensitive
      ).toBe(true);
      expect(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "gi_infectious_gastroenteritis_v1")!
          .infectiousRiskSafety?.dehydrationSensitive
      ).toBe(true);
      expect(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "infectious_pneumonia_followup_v1")!
          .infectiousRiskSafety?.pneumoniaSensitive
      ).toBe(true);
    });

    it("fever escalation passes for batch 11 templates requiring it", () => {
      for (const template of batchTemplates()) {
        if (template.infectiousRiskSafety?.requiresFeverEscalation !== true) continue;
        for (const locale of ["en", "fr"] as const) {
          expect(
            scanProviderDischargeInfectiousFeverEscalationLanguage(template.id, locale, template.suggestedText[locale])
          ).toEqual([]);
        }
      }
    });

    it("respiratory escalation passes for batch 11 templates requiring it", () => {
      for (const template of batchTemplates()) {
        if (template.infectiousRiskSafety?.requiresRespiratoryEscalation !== true) continue;
        for (const locale of ["en", "fr"] as const) {
          expect(
            scanProviderDischargeInfectiousRespiratoryEscalationLanguage(
              template.id,
              locale,
              template.suggestedText[locale]
            )
          ).toEqual([]);
        }
      }
    });

    it("hydration escalation passes for batch 11 templates requiring it", () => {
      for (const template of batchTemplates()) {
        if (template.infectiousRiskSafety?.requiresHydrationEscalation !== true) continue;
        for (const locale of ["en", "fr"] as const) {
          expect(
            scanProviderDischargeInfectiousHydrationEscalationLanguage(
              template.id,
              locale,
              template.suggestedText[locale]
            )
          ).toEqual([]);
        }
      }
    });

    it("neurologic escalation passes for batch 11 templates requiring it", () => {
      for (const template of batchTemplates()) {
        if (template.infectiousRiskSafety?.requiresNeurologicEscalation !== true) continue;
        for (const locale of ["en", "fr"] as const) {
          expect(
            scanProviderDischargeInfectiousNeurologicEscalationLanguage(
              template.id,
              locale,
              template.suggestedText[locale]
            )
          ).toEqual([]);
        }
      }
    });

    it("rash escalation passes for batch 11 templates requiring it", () => {
      for (const template of batchTemplates()) {
        if (template.infectiousRiskSafety?.requiresRashEscalation !== true) continue;
        for (const locale of ["en", "fr"] as const) {
          expect(
            scanProviderDischargeInfectiousRashEscalationLanguage(template.id, locale, template.suggestedText[locale])
          ).toEqual([]);
        }
      }
    });

    it("return-if-worsening passes for batch 11 templates requiring it", () => {
      for (const template of batchTemplates()) {
        if (template.infectiousRiskSafety?.requiresReturnIfWorsening !== true) continue;
        for (const locale of ["en", "fr"] as const) {
          expect(
            scanProviderDischargeInfectiousReturnIfWorseningLanguage(
              template.id,
              locale,
              template.suggestedText[locale]
            )
          ).toEqual([]);
        }
      }
    });

    it("primary care follow-up governance passes for batch 11 templates requiring it", () => {
      for (const template of batchTemplates()) {
        if (template.infectiousRiskSafety?.requiresPrimaryCareFollowUp !== true) continue;
        expect((template.defaultFollowUps ?? []).some((r) => r.specialty === "PRIMARY_CARE")).toBe(true);
      }
    });

    it("unsafe certainty phrases are blocked in batch 11 templates", () => {
      for (const template of batchTemplates()) {
        for (const locale of ["en", "fr"] as const) {
          const blob = JSON.stringify(template.suggestedText[locale]).toLowerCase();
          for (const phrase of forbiddenInfectiousPhrases) {
            expect(blob, `${template.id} ${locale}`).not.toContain(phrase);
          }
        }
      }
    });

    it("ruled-out wording is blocked by infectious forbidden phrase scanner", () => {
      expect(PROVIDER_DISCHARGE_INFECTIOUS_RISK_FORBIDDEN_PHRASES.some((r) => r.pattern.test("sepsis ruled out"))).toBe(
        true
      );
      const template = batchTemplates()[0]!;
      expect(
        scanProviderDischargeInfectiousRiskForbiddenPhrases(template.id, "en", {
          ...template.suggestedText.en,
          description: "Sepsis ruled out during this visit.",
        }).length
      ).toBeGreaterThan(0);
    });

    it("normal labs/imaging wording is blocked by result interpretation scanner", () => {
      for (const rule of PROVIDER_DISCHARGE_INFECTIOUS_RESULT_INTERPRETATION_FORBIDDEN_PHRASES) {
        expect(rule.pattern.test("labs normal")).toBe(rule.id === "labs-normal");
      }
      const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find(
        (t) => t.id === "infectious_fever_unknown_source_v1"
      )!;
      expect(
        scanProviderDischargeInfectiousResultInterpretationForbiddenPhrases(template.id, "en", {
          ...template.suggestedText.en,
          diagnosisInstructions: "Labs normal and imaging normal.",
        }).length
      ).toBeGreaterThan(0);
    });

    it("result interpretation caution is enforced on flagged batch 11 templates", () => {
      for (const template of batchTemplates()) {
        if (template.infectiousRiskSafety?.requiresResultInterpretationCaution !== true) continue;
        for (const locale of ["en", "fr"] as const) {
          expect(
            scanProviderDischargeInfectiousResultInterpretationForbiddenPhrases(
              template.id,
              locale,
              template.suggestedText[locale]
            )
          ).toEqual([]);
        }
      }
    });

    it("mapping resolves batch 11 templates without legacy template collisions", () => {
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "J18.9", displayName: "Pneumonia" }).template.id
      ).toBe("pneumonia_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "pneumonia follow-up" }).template.id
      ).toBe("infectious_pneumonia_followup_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "R19.7", displayName: "Diarrhea" }).template.id
      ).toBe("gastroenteritis_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "GI infectious gastroenteritis follow-up" })
          .template.id
      ).toBe("gi_infectious_gastroenteritis_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "Cellulitis" }).template.id
      ).toBe("cellulitis_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "cellulitis follow-up" }).template.id
      ).toBe("infectious_cellulitis_followup_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "upper respiratory infection" }).template.id
      ).toBe("uri_cough_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "infectious URI follow-up" }).template.id
      ).toBe("infectious_upper_respiratory_infection_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ displayName: "sepsis-risk return precautions" }).template.id
      ).toBe("sepsis_risk_return_precautions_v1");
    });

    it("apply uses active locale for batch 11 template", () => {
      const cardFr = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-sepsis",
        code: "Z99.99",
        displayName: "sepsis-risk return precautions",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "fr",
        actor: { displayName: "Dr Test", appliedAt: "2026-05-18T18:00:00.000Z" },
      });
      expect(cardFr.description.toLowerCase()).toContain("sepsis");
      expect(cardFr.templateMeta?.appliedLocale).toBe("fr");
      expect(cardFr.templateMeta?.templateAppliedHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("applied hash includes infectiousRiskSafety for batch 11 template", () => {
      const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find(
        (t) => t.id === "sepsis_risk_return_precautions_v1"
      )!;
      const payload = buildProviderDischargeTemplateHashPayload(template, "en");
      expect(payload.infectiousRiskSafety).toEqual({
        requiresFeverEscalation: true,
        requiresHydrationEscalation: true,
        requiresNeurologicEscalation: true,
        requiresPrimaryCareFollowUp: true,
        requiresRespiratoryEscalation: true,
        requiresResultInterpretationCaution: true,
        requiresReturnIfWorsening: true,
        sepsisSensitive: true,
      });
    });

    it("content integrity passes for batch 11 templates", () => {
      for (const template of batchTemplates()) {
        expect(validateProviderDischargeTemplateContentIntegrity(template)).toEqual([]);
      }
    });

    it("intentional batch 11 addition updates registry snapshot hash", () => {
      const base = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en");
      const withoutInfectious = computeProviderDischargeRegistryGovernanceSnapshotHash(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.filter(
          (t) =>
            !BATCH_11_INFECTIOUS_SEPSIS_ED_DISCHARGE_TEMPLATE_IDS.includes(
              t.id as (typeof BATCH_11_INFECTIOUS_SEPSIS_ED_DISCHARGE_TEMPLATE_IDS)[number]
            )
        ),
        "en"
      );
      expect(base).not.toBe(withoutInfectious);
    });

    it("existing adult/pediatric/OB/BH/trauma/cardio templates still validate", () => {
      const result = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("no React UI paragraph hardcoding for batch 11 templates", () => {
      const uiSource = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      expect(uiSource).not.toContain("You were evaluated in the emergency department for fever without a clear source");
      expect(uiSource).not.toContain("Vous avez été pris en charge aux urgences pour de la fièvre sans source claire");
    });
  });

  describe("19Y.14 Batch 9 trauma & MSK ED discharge templates", () => {
    const batchTemplates = () =>
      BATCH_9_TRAUMA_MSK_ED_DISCHARGE_TEMPLATE_IDS.map(
        (id) => PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === id)!
      );

    it("all 10 trauma/MSK templates exist", () => {
      expect(BATCH_9_TRAUMA_MSK_ED_DISCHARGE_TEMPLATE_IDS).toHaveLength(10);
      for (const id of BATCH_9_TRAUMA_MSK_ED_DISCHARGE_TEMPLATE_IDS) {
        expect(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.some((t) => t.id === id)).toBe(true);
      }
    });

    it("EN/FR bodies exist for batch 9 templates", () => {
      for (const template of batchTemplates()) {
        expect(template.suggestedText.en.description.trim()).not.toBe("");
        expect(template.suggestedText.fr.description.trim()).not.toBe("");
      }
    });

    it("traumaMskSafety metadata exists on all batch 9 templates", () => {
      for (const template of batchTemplates()) {
        expect(template.traumaMskSafety).toBeTruthy();
        expect(validateProviderDischargeTraumaMskTemplateGovernance(template), template.id).toEqual([]);
      }
    });

    it("required trauma flags are present per template", () => {
      const ankle = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "trauma_msk_ankle_sprain_v1")!;
      expect(ankle.traumaMskSafety?.requiresNeurovascularPrecautions).toBe(true);
      expect(ankle.traumaMskSafety?.requiresOrthopedicFollowUp).toBe(true);

      const fracture = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find(
        (t) => t.id === "trauma_msk_minor_fracture_precautions_v1"
      )!;
      expect(fracture.traumaMskSafety?.imagingSensitive).toBe(true);
      expect(fracture.traumaMskSafety?.requiresSplintCastPrecautions).toBe(true);
      expect(fracture.traumaMskSafety?.requiresCompartmentSyndromePrecautions).toBe(true);

      const mvc = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "trauma_msk_mvc_soreness_v1")!;
      expect(mvc.traumaMskSafety?.requiresHeadNeckSpineEscalation).toBe(true);
      expect(mvc.traumaMskSafety?.imagingSensitive).toBe(true);
    });

    it("escalation wording passes EN for batch 9 templates", () => {
      for (const template of batchTemplates()) {
        expect(
          scanProviderDischargeTraumaMskEscalationLanguage(template.id, "en", template.suggestedText.en)
        ).toEqual([]);
      }
    });

    it("escalation wording passes FR for batch 9 templates", () => {
      for (const template of batchTemplates()) {
        expect(
          scanProviderDischargeTraumaMskEscalationLanguage(template.id, "fr", template.suggestedText.fr)
        ).toEqual([]);
      }
    });

    it("forbidden phrase fracture ruled out fails", () => {
      const body = batchTemplates()[0].suggestedText.en;
      expect(
        scanProviderDischargeTraumaMskForbiddenPhrases("msk_bad", "en", {
          ...body,
          description: "Fracture ruled out on imaging.",
        }).length
      ).toBeGreaterThan(0);
    });

    it("forbidden phrase x-ray normal fails", () => {
      const body = batchTemplates()[0].suggestedText.en;
      expect(
        scanProviderDischargeTraumaMskForbiddenPhrases("msk_bad", "en", {
          ...body,
          diagnosisInstructions: "X-ray normal during evaluation.",
        }).some((h) => h.includes("x-ray-normal"))
      ).toBe(true);
    });

    it("forbidden phrase neurovascularly intact fails", () => {
      const body = batchTemplates()[0].suggestedText.en;
      expect(
        scanProviderDischargeTraumaMskForbiddenPhrases("msk_bad", "en", {
          ...body,
          diagnosisInstructions: "Neurovascularly intact on exam.",
        }).some((h) => h.includes("neurovascularly-intact"))
      ).toBe(true);
    });

    it("forbidden phrase cleared for sports fails", () => {
      const body = batchTemplates()[0].suggestedText.en;
      expect(
        scanProviderDischargeTraumaMskForbiddenPhrases("msk_bad", "en", {
          ...body,
          returnWorkSchool: "Cleared for sports.",
        }).some((h) => h.includes("cleared-for-sports"))
      ).toBe(true);
    });

    it("forbidden phrase no spinal injury fails", () => {
      const body = batchTemplates()[0].suggestedText.en;
      expect(
        scanProviderDischargeTraumaMskForbiddenPhrases("msk_bad", "en", {
          ...body,
          description: "No spinal injury identified.",
        }).some((h) => h.includes("no-spinal-injury"))
      ).toBe(true);
    });

    it("return-activity validator passes safe wording on batch 9 templates", () => {
      for (const template of batchTemplates()) {
        if (!template.traumaMskSafety?.requiresReturnActivityRestrictions) continue;
        for (const locale of ["en", "fr"] as const) {
          expect(
            scanProviderDischargeTraumaMskReturnActivityForbiddenPhrases(
              template.id,
              locale,
              template.suggestedText[locale]
            )
          ).toEqual([]);
        }
      }
    });

    it("orthopedic follow-up exists where required", () => {
      for (const template of batchTemplates()) {
        if (!template.traumaMskSafety?.requiresOrthopedicFollowUp) continue;
        const specialties = (template.defaultFollowUps ?? []).map((row) => row.specialty.toUpperCase());
        expect(specialties).toContain("ORTHOPEDICS");
      }
    });

    it("splint/cast precautions exist for minor fracture template", () => {
      const fracture = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find(
        (t) => t.id === "trauma_msk_minor_fracture_precautions_v1"
      )!;
      for (const locale of ["en", "fr"] as const) {
        expect(
          scanProviderDischargeTraumaMskSplintCastPrecautions(fracture.id, locale, fracture.suggestedText[locale])
        ).toEqual([]);
      }
    });

    it("head/neck/spine escalation exists for back, neck, and MVC templates", () => {
      for (const id of [
        "trauma_msk_back_strain_v1",
        "trauma_msk_neck_strain_v1",
        "trauma_msk_mvc_soreness_v1",
      ] as const) {
        const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === id)!;
        for (const locale of ["en", "fr"] as const) {
          expect(
            scanProviderDischargeTraumaMskHeadNeckSpineEscalation(template.id, locale, template.suggestedText[locale])
          ).toEqual([]);
        }
      }
    });

    it("no mapping collisions with adult back pain or wound templates", () => {
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "M54.5", displayName: "Low back pain" }).template.id
      ).toBe("back_pain_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "S39.012", displayName: "Back strain" }).template.id
      ).toBe("trauma_msk_back_strain_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "S93.401A", displayName: "Ankle sprain" }).template.id
      ).toBe("trauma_msk_ankle_sprain_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "T14.1", displayName: "Laceration" }).template.id
      ).toBe("wound_laceration_v1");
      expect(
        resolveProviderDischargeTemplateForDiagnosis({
          displayName: "msk motor vehicle collision soreness",
        }).template.id
      ).toBe("trauma_msk_mvc_soreness_v1");
    });

    it("apply uses active locale for batch 9 template", () => {
      const cardFr = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-ankle",
        code: "S93.401A",
        displayName: "Ankle sprain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "fr",
        actor: { displayName: "Dr Test", appliedAt: "2026-05-18T18:00:00.000Z" },
      });
      expect(cardFr.description).toContain("cheville");
      expect(cardFr.templateMeta?.appliedLocale).toBe("fr");
      expect(cardFr.templateMeta?.templateAppliedHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("intentional batch 9 addition updates registry snapshot hash", () => {
      const base = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en");
      const withoutMsk = computeProviderDischargeRegistryGovernanceSnapshotHash(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.filter((t) => !t.id.startsWith("trauma_msk_")),
        "en"
      );
      expect(base).not.toBe(withoutMsk);
    });

    it("existing adult/pediatric/OB/BH templates still validate", () => {
      const nonMsk = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.filter((t) => !t.id.startsWith("trauma_msk_"));
      const result = validateProviderDischargeTemplateRegistry(nonMsk);
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("19Y.4A template localization separation hardening", () => {
    const chestTemplate = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "chest_pain_v1")!;

    it("every template has EN suggestedText body", () => {
      for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
        expect(template.suggestedText.en).toBeTruthy();
        expect(typeof template.suggestedText.en.description).toBe("string");
      }
    });

    it("every template has FR suggestedText body", () => {
      for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
        expect(template.suggestedText.fr).toBeTruthy();
        expect(typeof template.suggestedText.fr.description).toBe("string");
      }
    });

    it("EN template text has no French contamination", () => {
      for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
        expect(scanProviderDischargeSuggestedTextFrenchContaminationInEn(template.id, template.suggestedText.en)).toEqual([]);
      }
    });

    it("FR template text has no English contamination", () => {
      for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
        expect(scanProviderDischargeSuggestedTextEnglishContaminationInFr(template.id, template.suggestedText.fr)).toEqual([]);
      }
    });

    it("missing EN body fails validator", () => {
      const result = validateProviderDischargeTemplateRegistry([
        {
          ...chestTemplate,
          suggestedText: { fr: chestTemplate.suggestedText.fr } as typeof chestTemplate.suggestedText,
        },
      ]);
      expect(result.ok).toBe(false);
    });

    it("missing FR body fails validator", () => {
      const result = validateProviderDischargeTemplateRegistry([
        {
          ...chestTemplate,
          suggestedText: { en: chestTemplate.suggestedText.en } as typeof chestTemplate.suggestedText,
        },
      ]);
      expect(result.ok).toBe(false);
    });

    it("EN apply uses EN text only", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-1",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R07.9", displayName: "Chest pain" });
      const next = applyProviderDischargeTemplateToCard(card, resolved, { locale: "en", overwriteExisting: true });
      expect(next.description).toBe(chestTemplate.suggestedText.en.description);
    });

    it("FR apply uses FR text only", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-1",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R07.9", displayName: "Chest pain" });
      const next = applyProviderDischargeTemplateToCard(card, resolved, { locale: "fr", overwriteExisting: true });
      expect(next.description).toBe(chestTemplate.suggestedText.fr.description);
    });

    it("no fallback from FR to EN when FR body missing", () => {
      const broken = {
        ...chestTemplate,
        suggestedText: { en: chestTemplate.suggestedText.en } as typeof chestTemplate.suggestedText,
      };
      expect(() => getProviderDischargeSuggestedTextBody(broken, "fr")).toThrow(ProviderDischargeTemplateLocaleError);
    });

    it("no fallback from EN to FR when EN body missing", () => {
      const broken = {
        ...chestTemplate,
        suggestedText: { fr: chestTemplate.suggestedText.fr } as typeof chestTemplate.suggestedText,
      };
      expect(() => getProviderDischargeSuggestedTextBody(broken, "en")).toThrow(ProviderDischargeTemplateLocaleError);
    });

    it("templateMeta.appliedLocale is stored on apply", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-1",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R07.9", displayName: "Chest pain" });
      const next = applyProviderDischargeTemplateToCard(card, resolved, { locale: "fr", overwriteExisting: true });
      expect(next.templateMeta?.appliedLocale).toBe("fr");
    });

    it("EN and FR templateAppliedHash differ when localized text differs", () => {
      const enHash = computeProviderDischargeTemplateAppliedHash(chestTemplate, "en");
      const frHash = computeProviderDischargeTemplateAppliedHash(chestTemplate, "fr");
      expect(enHash).not.toBe(frHash);
    });

    it("changing EN text changes EN hash only", () => {
      const enBase = computeProviderDischargeTemplateAppliedHash(chestTemplate, "en");
      const frBase = computeProviderDischargeTemplateAppliedHash(chestTemplate, "fr");
      const mutated = {
        ...chestTemplate,
        suggestedText: {
          ...chestTemplate.suggestedText,
          en: { ...chestTemplate.suggestedText.en, description: "EN-only drift for hash isolation test." },
        },
      };
      expect(computeProviderDischargeTemplateAppliedHash(mutated, "en")).not.toBe(enBase);
      expect(computeProviderDischargeTemplateAppliedHash(mutated, "fr")).toBe(frBase);
    });

    it("changing sourceReferences changes both locale hashes", () => {
      const enBase = computeProviderDischargeTemplateAppliedHash(chestTemplate, "en");
      const frBase = computeProviderDischargeTemplateAppliedHash(chestTemplate, "fr");
      const mutated = {
        ...chestTemplate,
        sourceReferences: [{ label: "Mutated source label for hash test" }],
      };
      expect(computeProviderDischargeTemplateAppliedHash(mutated, "en")).not.toBe(enBase);
      expect(computeProviderDischargeTemplateAppliedHash(mutated, "fr")).not.toBe(frBase);
    });

    it("hash payload includes appliedLocale", () => {
      const payload = buildProviderDischargeTemplateHashPayload(chestTemplate, "fr");
      expect(payload.appliedLocale).toBe("fr");
    });

    it("unsafe phrase scanner passes for both locales on reviewed registry", () => {
      for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
        for (const locale of PROVIDER_DISCHARGE_TEMPLATE_LOCALES) {
          expect(scanProviderDischargeTemplateUnsafePhrases(template, locale)).toEqual([]);
        }
      }
    });

    it("registry supports exactly en and fr locales without fallback helper", () => {
      expect(PROVIDER_DISCHARGE_TEMPLATE_LOCALES).toEqual(["en", "fr"]);
      expect(typeof getProviderDischargeSuggestedTextBody).toBe("function");
    });
  });

  describe("19Y.3A template governance & clinical safety", () => {
    const registryValidation = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);

    it("every template has clinicalReviewStatus", () => {
      for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
        expect(template.clinicalReviewStatus).toBeTruthy();
      }
    });

    it("every template has valid clinicalReviewStatus", () => {
      for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
        expect(["draft", "reviewed", "approved"]).toContain(template.clinicalReviewStatus);
      }
    });

    it("every template has effectiveFrom", () => {
      for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
        expect(template.effectiveFrom.trim()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it("effectiveTo validation works", () => {
      const bad = validateProviderDischargeTemplateRegistry([
        syntheticRegistryTemplate({
          id: "bad-effective-to",
          effectiveFrom: "2026-05-18",
          effectiveTo: "2026-05-01",
        }),
      ]);
      expect(bad.ok).toBe(false);
      expect(bad.errors.some((e) => e.includes("effectiveTo is before effectiveFrom"))).toBe(true);
    });

    it("duplicate template ID fails", () => {
      const t = syntheticRegistryTemplate({ id: "dup-id" });
      const result = validateProviderDischargeTemplateRegistry([t, { ...t }]);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("duplicate template id"))).toBe(true);
    });

    it("invalid semver fails", () => {
      const result = validateProviderDischargeTemplateRegistry([
        syntheticRegistryTemplate({ id: "bad-semver", version: "v1" }),
      ]);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("invalid semver"))).toBe(true);
    });

    it("missing sourceReferences fails", () => {
      const result = validateProviderDischargeTemplateRegistry([
        syntheticRegistryTemplate({ id: "no-sources", sourceReferences: [] }),
      ]);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("missing sourceReferences"))).toBe(true);
    });

    it("missing specialtyCategory fails", () => {
      const result = validateProviderDischargeTemplateRegistry([
        syntheticRegistryTemplate({ id: "no-specialty", specialtyCategory: undefined }),
      ]);
      expect(result.ok).toBe(false);
    });

    it("missing riskCategory fails", () => {
      const result = validateProviderDischargeTemplateRegistry([
        syntheticRegistryTemplate({ id: "no-risk", riskCategory: undefined }),
      ]);
      expect(result.ok).toBe(false);
    });

    it("missing effectiveFrom fails", () => {
      const result = validateProviderDischargeTemplateRegistry([
        syntheticRegistryTemplate({ id: "no-effective-from", effectiveFrom: "" }),
      ]);
      expect(result.ok).toBe(false);
    });

    it("duplicate ICD exact mapping fails", () => {
      const result = validateProviderDischargeTemplateRegistry([
        syntheticRegistryTemplate({ id: "dx-a", diagnosisMappings: { icdExact: ["R07.9"] } }),
        syntheticRegistryTemplate({ id: "dx-b", diagnosisMappings: { icdExact: ["R07.9"] } }),
      ]);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("duplicate icdExact"))).toBe(true);
    });

    it("duplicate ICD family mapping fails", () => {
      const result = validateProviderDischargeTemplateRegistry([
        syntheticRegistryTemplate({ id: "fam-a", diagnosisMappings: { icdFamily: ["R10"] } }),
        syntheticRegistryTemplate({ id: "fam-b", diagnosisMappings: { icdFamily: ["R10"] } }),
      ]);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("duplicate icdFamily"))).toBe(true);
    });

    it("duplicate keyword mapping fails", () => {
      const result = validateProviderDischargeTemplateRegistry([
        syntheticRegistryTemplate({ id: "kw-a", diagnosisMappings: { keyword: ["chest pain"] } }),
        syntheticRegistryTemplate({ id: "kw-b", diagnosisMappings: { keyword: ["chest pain"] } }),
      ]);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("duplicate keyword"))).toBe(true);
    });

    it("exact and family on same template does not fail collision validation", () => {
      const result = validateProviderDischargeTemplateRegistry([
        syntheticRegistryTemplate({
          id: "same-template-exact-family",
          diagnosisMappings: { icdExact: ["R07.9"], icdFamily: ["R07"] },
        }),
      ]);
      expect(result.ok).toBe(true);
    });

    it("current registry has no mapping collisions", () => {
      expect(registryValidation.ok).toBe(true);
      expect(registryValidation.errors).toEqual([]);
    });

    it("unsafe phrase troponins negative fails", () => {
      const hits = scanProviderDischargeTemplateUnsafePhrases(
        syntheticRegistryTemplate({
          id: "unsafe-troponin",
          suggestedText: {
            en: {
              description: "Troponins negative today.",
              diagnosisInstructions: "Rest.",
              medicationTreatment: "None.",
              returnPrecautions: "Return if worse.",
            },
            fr: {
              description: "Texte de test.",
              diagnosisInstructions: "Repos.",
              medicationTreatment: "Aucun.",
              returnPrecautions: "Reconsultez si aggravation.",
            },
          },
        })
      );
      expect(hits.length).toBeGreaterThan(0);
    });

    it("unsafe phrase CT normal fails", () => {
      const hits = scanProviderDischargeTemplateUnsafePhrases(
        syntheticRegistryTemplate({
          id: "unsafe-ct",
          suggestedText: {
            en: {
              description: "CT normal.",
              diagnosisInstructions: "Rest.",
              medicationTreatment: "None.",
              returnPrecautions: "Return if worse.",
            },
            fr: {
              description: "Texte de test.",
              diagnosisInstructions: "Repos.",
              medicationTreatment: "Aucun.",
              returnPrecautions: "Reconsultez si aggravation.",
            },
          },
        })
      );
      expect(hits.length).toBeGreaterThan(0);
    });

    it("unsafe phrase ACS ruled out fails", () => {
      const hits = scanProviderDischargeTemplateUnsafePhrases(
        syntheticRegistryTemplate({
          id: "unsafe-acs",
          suggestedText: {
            en: {
              description: "ACS ruled out.",
              diagnosisInstructions: "Rest.",
              medicationTreatment: "None.",
              returnPrecautions: "Return if worse.",
            },
            fr: {
              description: "Texte de test.",
              diagnosisInstructions: "Repos.",
              medicationTreatment: "Aucun.",
              returnPrecautions: "Reconsultez si aggravation.",
            },
          },
        })
      );
      expect(hits.length).toBeGreaterThan(0);
    });

    it("current registry has no unsafe phrases", () => {
      for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
        expect(scanProviderDischargeTemplateUnsafePhrases(template)).toEqual([]);
      }
    });

    it("registry governance snapshot is deterministic", () => {
      const a = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en");
      const b = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en");
      expect(a).toBe(b);
    });

    it("intentional template text change changes registry governance snapshot hash", () => {
      const base = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en");
      const mutated = computeProviderDischargeRegistryGovernanceSnapshotHash(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.map((t) =>
          t.id === "chest_pain_v1" ?
            {
              ...t,
              suggestedText: {
                ...t.suggestedText,
                en: { ...t.suggestedText.en, description: "Intentional drift for snapshot test." },
              },
            }
          : t
        )
      , "en");
      expect(mutated).not.toBe(base);
    });

    it("registry governance snapshot hash remains stable for reviewed registry (EN)", () => {
      const hash = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en");
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(buildProviderDischargeRegistryGovernanceSnapshot(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "en")).toHaveLength(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.length
      );
      // Update this constant intentionally when registry governance content changes.
      expect(hash).toBe("072268fd83b2dc9b8442c23a1b747d5fd09386ea4d28cd2f9cf3ef11126e29f3");
    });

    it("registry governance snapshot hash remains stable for reviewed registry (FR)", () => {
      const hash = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "fr");
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(buildProviderDischargeRegistryGovernanceSnapshot(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY, "fr")).toHaveLength(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.length
      );
      // Update this constant intentionally when registry governance content changes.
      expect(hash).toBe("e2b75b4c1d9b39f19400227ae96bc32911fe0700b3aafa673b473e706a738746");
    });

    it("timesApplied exists in type but is not incremented anywhere", () => {
      const registrySource = readFileSync(
        join(webRoot, "src/features/emergency/providerDischargeTemplateRegistry.ts"),
        "utf8"
      );
      const uiSource = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      expect(registrySource).toContain("timesApplied?:");
      expect(registrySource).not.toMatch(/timesApplied\s*\+\+|timesApplied\s*=\s*\(.*\+\s*1\)/);
      expect(uiSource).not.toContain("timesApplied");
    });

    it("no governance metadata appears in provider/patient UI", () => {
      const uiFiles = [
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        join(webRoot, "src/features/emergency/EmergencyDispositionPanel.tsx"),
      ];
      for (const file of uiFiles) {
        const source = readFileSync(file, "utf8");
        expect(source).not.toContain("clinicalReviewStatus");
        expect(source).not.toContain("effectiveFrom");
        expect(source).not.toContain("timesApplied");
      }
    });

    it("no billing/eRx/MAR/order logic changed by governance validator", () => {
      const billing = readFileSync(join(webRoot, "../../packages/shared/src/billingCaptureV1.ts"), "utf8");
      expect(billing).not.toContain("clinicalReviewStatus");
      expect(billing).not.toContain("validateProviderDischargeTemplateRegistry");
    });
  });

  describe("19Y.2B shared discharge planning layout", () => {
    const uiSource = readFileSync(
      join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
      "utf8"
    );
    const chestTemplate = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "chest_pain_v1")!;
    const abdominalTemplate = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "abdominal_pain_v1")!;

    it("each selected diagnosis renders one card", () => {
      expect(getSelectedDiagnosisDocs(formWithThreeSelected())).toHaveLength(3);
    });

    it("diagnosis card UI contains Description / Instructions / Medication-treatment", () => {
      expect(uiSource).toContain("descriptionRequired");
      expect(uiSource).toContain("diagnosisInstructionsRequired");
      expect(uiSource).toContain("medicationTreatmentRequired");
    });

    it("diagnosis card UI does NOT contain Return precautions field", () => {
      const cardBlock = uiSource.slice(uiSource.indexOf("DiagnosisDocumentationCard"), uiSource.indexOf("SharedDischargePlanningSection"));
      expect(cardBlock).not.toContain("returnPrecautionsRequired");
    });

    it("diagnosis card UI does NOT contain Follow-up field", () => {
      const cardBlock = uiSource.slice(uiSource.indexOf("DiagnosisDocumentationCard"), uiSource.indexOf("SharedDischargePlanningSection"));
      expect(cardBlock).not.toContain("followUpRequired");
    });

    it("diagnosis card UI does NOT contain Return to work/school field", () => {
      const cardBlock = uiSource.slice(uiSource.indexOf("DiagnosisDocumentationCard"), uiSource.indexOf("SharedDischargePlanningSection"));
      expect(cardBlock).not.toContain("workSchoolQuick");
    });

    it("shared Discharge planning section renders once", () => {
      expect(uiSource).toContain("<SharedDischargePlanningSection");
      expect(uiSource.match(/<SharedDischargePlanningSection/g)?.length).toBe(1);
      expect(uiSource).toContain("dischargePlanningSection");
    });

    it("shared section contains Return precautions", () => {
      const sharedBlock = uiSource.slice(uiSource.indexOf("SharedDischargePlanningSection"));
      expect(sharedBlock).toContain("returnPrecautionsRequired");
    });

    it("shared section contains Return to work/school", () => {
      const sharedBlock = uiSource.slice(uiSource.indexOf("SharedDischargePlanningSection"));
      expect(sharedBlock).toContain("workSchoolQuick");
    });

    it("shared section contains Follow-up", () => {
      const sharedBlock = uiSource.slice(uiSource.indexOf("SharedDischargePlanningSection"));
      expect(sharedBlock).toContain("followUpRequired");
    });

    it("return precautions merge from multiple selected diagnosis templates", () => {
      const form = emptyProviderDischargeDocumentationForm();
      const merged = mergeSharedFieldsFromSelectedTemplates(form, [
        extractSharedFieldsFromTemplate(chestTemplate, "en"),
        extractSharedFieldsFromTemplate(abdominalTemplate, "en"),
      ]);
      expect(merged.returnPrecautions).toContain(chestTemplate.suggestedText.en.returnPrecautions.slice(0, 24));
      expect(merged.returnPrecautions).toContain(abdominalTemplate.suggestedText.en.returnPrecautions.slice(0, 24));
    });

    it("return precautions dedupe duplicate sentences", () => {
      const sentence = "Return to the emergency department for worsening symptoms.";
      const merged = mergeUniquePrecautionText(sentence, [sentence, sentence]);
      expect(merged.split("\n").filter(Boolean)).toHaveLength(1);
    });

    it("follow-up suggestions merge/dedupe from multiple diagnoses", () => {
      const row = { ...newDefaultFollowUpRow(), specialty: "CARDIOLOGY", providerOrFacility: "Dr A", timing: "1 week" };
      const merged = mergeDedupedFollowUpRows([row], [{ ...row, id: "other-id" }]);
      expect(merged).toHaveLength(1);
    });

    it("provider-entered shared return precautions are not overwritten", () => {
      const form = { ...formWithThreeSelected(), returnPrecautions: "Provider custom precautions" };
      const merged = mergeTemplateSharedFieldsIntoForm(form, extractSharedFieldsFromTemplate(chestTemplate, "en"));
      expect(merged.returnPrecautions).toBe("Provider custom precautions");
    });

    it("save blocks if any diagnosis card missing description", () => {
      const form = formWithThreeSelected();
      form.diagnosisDocs[1]!.description = "";
      expect(validateProviderDischargeDocumentation(form, validationMessages)).not.toBeNull();
    });

    it("save blocks if any diagnosis card missing instructions", () => {
      const form = formWithThreeSelected();
      form.diagnosisDocs[1]!.diagnosisInstructions = "";
      expect(validateProviderDischargeDocumentation(form, validationMessages)).not.toBeNull();
    });

    it("save blocks if any diagnosis card missing medication/treatment", () => {
      const form = formWithThreeSelected();
      form.diagnosisDocs[1]!.medicationTreatment = "";
      expect(validateProviderDischargeDocumentation(form, validationMessages)).not.toBeNull();
    });

    it("save blocks if shared return precautions missing", () => {
      const form = formWithThreeSelected();
      form.returnPrecautions = "";
      const errors = validateProviderDischargeDocumentation(form, validationMessages);
      expect(errors?.shared?.returnPrecautions).toBeTruthy();
    });

    it("save blocks if shared follow-up missing", () => {
      const form = formWithThreeSelected();
      form.followUps = [{ ...newDefaultFollowUpRow() }];
      const errors = validateProviderDischargeDocumentation(form, validationMessages);
      expect(errors?.shared?.followUps).toBeTruthy();
    });

    it("save does NOT require return precautions inside each card", () => {
      const form = formWithThreeSelected();
      for (const doc of form.diagnosisDocs) doc.returnPrecautions = "";
      expect(validateProviderDischargeDocumentation(form, validationMessages)).toBeNull();
    });

    it("legacy per-card returnPrecautions/followUps hydrate into shared fields", () => {
      const form = hydrateProviderDischargeDocumentationForm({
        providerDischargeDiagnosisDocs: [
          {
            id: "d1",
            sourceEncounterDiagnosisId: "dx-1",
            code: "R07.9",
            displayName: "Chest pain",
            isPrimaryDiagnosis: true,
            displayOrder: 0,
            description: "Saved",
            diagnosisInstructions: "Saved",
            medicationTreatment: "Saved",
            returnPrecautions: "Legacy card precautions",
            followUps: [{ id: "f1", specialty: "PRIMARY_CARE", name: "PCP", timing: "1w", phone: "", address: "", comments: "" }],
          },
        ],
        providerDischargeDiagnosisRefs: [{ encounterDiagnosisId: "dx-1", code: "R07.9", label: "Chest pain", isPrimary: true }],
      });
      expect(form.returnPrecautions).toContain("Legacy card precautions");
      expect(form.followUps.some((r) => r.timing === "1w")).toBe(true);
    });

    it("new save writes shared returnPrecautions/followUps once", () => {
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, formWithThreeSelected(), {
        documentedAt: "2026-05-18T18:00:00.000Z",
        documentedByDisplayName: "Dr A",
      });
      expect(merged.returnPrecautions).toBe("Shared return precautions");
      expect(merged.providerDischargeFollowUps).toHaveLength(1);
      const doc = (merged.providerDischargeDiagnosisDocs as Record<string, unknown>[])[0]!;
      expect(doc.returnPrecautions).toBeUndefined();
      expect(doc.followUps).toBeUndefined();
    });

    it("summary renders return precautions/follow-up once", () => {
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, formWithThreeSelected(), {
        documentedAt: "2026-05-18T18:00:00.000Z",
        documentedByDisplayName: "Dr A",
      });
      const block = buildProviderDischargeDocumentationSummaryBlock(merged, "en");
      const text = block!.lines.join("\n");
      expect(text).toContain("Discharge planning");
      expect(text.match(/Return precautions/g)?.length).toBe(1);
      expect(text.match(/Follow-up/g)?.length).toBe(1);
    });

    it("ER packet uses same summary builder (return precautions once)", () => {
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, formWithThreeSelected(), {
        documentedAt: "2026-05-18T18:00:00.000Z",
        documentedByDisplayName: "Dr A",
      });
      const block = buildProviderDischargeDocumentationSummaryBlock(merged, "fr");
      const text = block!.lines.join("\n");
      expect(text).toContain("Planification de sortie");
      expect(text.match(/Consignes de retour/g)?.length).toBe(1);
    });

    it("chart export remains backward compatible with legacy per-card fields", () => {
      const legacy = hydrateProviderDischargeDocumentationForm({
        providerDischargeDiagnosisDocs: [
          {
            id: "d1",
            sourceEncounterDiagnosisId: "dx-1",
            code: "R07.9",
            displayName: "Chest pain",
            description: "x",
            diagnosisInstructions: "x",
            medicationTreatment: "x",
            returnPrecautions: "Legacy card",
            followUps: [{ id: "f1", specialty: "PRIMARY_CARE", name: "PCP", timing: "1w", phone: "", address: "", comments: "" }],
          },
        ],
      });
      expect(legacy.returnPrecautions).toContain("Legacy card");
    });

    it("card keys remain stable by doc id", () => {
      expect(uiSource).toContain("key={doc.id}");
      expect(uiSource).toContain("React.memo");
    });

    it("no orders/eRx/MAR created from shared planning merge", () => {
      const json = JSON.stringify(mergeProviderDischargeDocumentationIntoDischargeJson({}, formWithThreeSelected(), {
        documentedAt: new Date().toISOString(),
        documentedByDisplayName: "Dr Test",
      }));
      expect(json).not.toContain('"orderId"');
      expect(json).not.toContain('"marAction"');
    });
  });

  describe("19Y.2 regression gates", () => {
    it("React UI files do not contain registry paragraph fragments", () => {
      const uiSource = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      for (const fragment of PROVIDER_DISCHARGE_REGISTRY_PARAGRAPH_FRAGMENTS) {
        expect(uiSource).not.toContain(fragment);
      }
    });

    it("registry owns clinical paragraph fragments", () => {
      const registrySource = readFileSync(
        join(webRoot, "src/features/emergency/providerDischargeTemplateRegistry.ts"),
        "utf8"
      );
      for (const fragment of PROVIDER_DISCHARGE_REGISTRY_PARAGRAPH_FRAGMENTS) {
        expect(registrySource).toContain(fragment);
      }
    });

    it("disposition panel keeps Primary Decision and validation", () => {
      const source = readFileSync(join(webRoot, "src/features/emergency/EmergencyDispositionPanel.tsx"), "utf8");
      expect(source).toContain("sectionPrimaryDecision");
      expect(source).toContain("validateProviderDischargeDocumentation");
    });

    it("provider section uses registry not inline education templates", () => {
      const source = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      expect(source).toContain("providerDischargeTemplateRegistry");
      expect(source).not.toContain("providerDischargeEducationTemplates");
    });

    it("billing capture module unchanged", () => {
      const billing = readFileSync(join(webRoot, "../../packages/shared/src/billingCaptureV1.ts"), "utf8");
      expect(billing).not.toContain("providerDischargeDiagnosisDocs");
    });

    it("instructional chrome regression gate still exists", () => {
      const gate = readFileSync(join(webRoot, "src/i18n/messages/instructionalChrome.test.ts"), "utf8");
      expect(gate).toContain("instructionalChrome");
    });

    it("English and French provider discharge i18n include required labels", () => {
      const en = readFileSync(join(webRoot, "src/i18n/messages/providerDischargeDocumentation19Y.en.ts"), "utf8");
      const fr = readFileSync(join(webRoot, "src/i18n/messages/providerDischargeDocumentation19Y.fr.ts"), "utf8");
      expect(en).toContain("descriptionRequired");
      expect(fr).toContain("descriptionRequired");
    });
  });

  describe("19Y.16A French diagnosis search + discharge autofill locale", () => {
    const chestTemplate = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "chest_pain_v1")!;
    const chestRef = {
      encounterDiagnosisId: "dx-chest",
      code: "R07.9",
      label: "Chest pain",
      isPrimary: true,
    };

    it("active locale fr applies French description, instructions, and medication/treatment", () => {
      const cardFr = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-chest",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "fr",
      });
      const frBody = chestTemplate.suggestedText.fr;
      expect(cardFr.description).toBe(frBody.description);
      expect(cardFr.diagnosisInstructions).toContain("Reposez-vous");
      expect(cardFr.medicationTreatment).toContain(frBody.medicationTreatment);
      expect(cardFr.description).not.toContain("You were evaluated in the emergency department");
    });

    it("shared return precautions autofill in French when locale is fr", () => {
      const form = emptyProviderDischargeDocumentationForm();
      const merged = mergeTemplateSharedFieldsIntoForm(
        form,
        extractSharedFieldsFromTemplate(chestTemplate, "fr")
      );
      expect(merged.returnPrecautions).toBe(chestTemplate.suggestedText.fr.returnPrecautions);
      expect(merged.returnPrecautions).toContain("Retournez immédiatement");
      expect(merged.returnPrecautions).not.toContain("Return immediately");
    });

    it("English body is not used when locale is fr", () => {
      const frBody = getProviderDischargeSuggestedTextBody(chestTemplate, "fr");
      const enBody = getProviderDischargeSuggestedTextBody(chestTemplate, "en");
      expect(frBody.description).not.toBe(enBody.description);
      const cardFr = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-chest",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "fr",
      });
      expect(cardFr.description).toBe(frBody.description);
      expect(cardFr.description).not.toBe(enBody.description);
    });

    it("active locale en still applies English", () => {
      const cardEn = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-chest",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "en",
      });
      expect(cardEn.description).toBe(chestTemplate.suggestedText.en.description);
      expect(cardEn.templateMeta?.appliedLocale).toBe("en");
    });

    it("provider-entered French text is not overwritten on non-forced apply", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-chest",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: false,
        locale: "fr",
      });
      card.description = "Note personnalisée du clinicien";
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R07.9", displayName: "Chest pain" });
      const next = applyProviderDischargeTemplateToCard(card, resolved, { locale: "fr", overwriteExisting: false });
      expect(next.description).toBe("Note personnalisée du clinicien");
    });

    it("templateAppliedHash remains locale-specific", () => {
      const enHash = computeProviderDischargeTemplateAppliedHash(chestTemplate, "en");
      const frHash = computeProviderDischargeTemplateAppliedHash(chestTemplate, "fr");
      expect(enHash).not.toBe(frHash);
      const cardFr = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-chest",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "fr",
      });
      expect(cardFr.templateMeta?.templateAppliedHash).toBe(frHash);
    });

    it("locale mismatch reapply replaces English template text with French", () => {
      const cardEn = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-chest",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "en",
      });
      expect(providerDischargeCardNeedsLocaleReapply(cardEn, "fr")).toBe(true);
      const synced = syncProviderDischargeCardWithRef(cardEn, chestRef, {
        applyTemplate: true,
        locale: "fr",
        isPrimary: true,
        displayOrder: 0,
      });
      expect(synced.description).toBe(chestTemplate.suggestedText.fr.description);
      expect(synced.templateMeta?.appliedLocale).toBe("fr");
      expect(synced.description).not.toContain("You were evaluated");
    });

    it("ensureProviderDischargeCardForRef passes active locale through autofill chain", () => {
      const form = emptyProviderDischargeDocumentationForm();
      const synced = ensureProviderDischargeCardForRef(form, chestRef, {
        applyTemplate: true,
        locale: "fr",
        isPrimary: true,
        displayOrder: 0,
      });
      expect(synced.templateMeta?.appliedLocale).toBe("fr");
      expect(synced.description).toContain("douleur thoracique");
    });

    it("ProviderDischargeDocumentationSection passes language to locale autofill", () => {
      const source = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      expect(source).toContain("locale: language");
      expect(source).toContain("extractSharedFieldsFromTemplate(resolved.template, language)");
      expect(source).toContain("providerDischargeCardNeedsLocaleReapply");
    });

    it("Icd10DiagnosisEntryPanel uses French diagnosis search aliases", () => {
      const source = readFileSync(
        join(webRoot, "src/components/diagnosis/Icd10DiagnosisEntryPanel.tsx"),
        "utf8"
      );
      expect(source).toContain("resolveLocalizedDiagnosisSearchQueries");
      expect(source).toContain("diagnosisMatchesLocalizedSearch");
      expect(source).toContain("getLocalizedDiagnosisDisplayLabel");
      expect(source).not.toContain("console.log(\"[DxSearch]");
    });

    it("French diagnosis display labels render at UI surfaces only", () => {
      const panel = readFileSync(join(webRoot, "src/components/diagnosis/Icd10DiagnosisEntryPanel.tsx"), "utf8");
      const dxPanel = readFileSync(join(webRoot, "src/components/encounters/EncounterDiagnosticsPanel.tsx"), "utf8");
      const discharge = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      const summary = readFileSync(
        join(webRoot, "src/features/emergency/providerDischargeDocumentationSummary.ts"),
        "utf8"
      );
      expect(panel).toContain("getLocalizedDiagnosisDisplayLabel");
      expect(dxPanel).toContain("getLocalizedDiagnosisDisplayLabel");
      expect(discharge).toContain("getLocalizedDiagnosisDisplayLabel");
      expect(summary).toContain("getLocalizedDiagnosisDisplayLabel");
      expect(discharge).toContain("label: row.description?.trim() || row.code");
    });
  });
});
