/** POSTCERT.2 — MDM.1 gold-standard builders for seizure and tremor neuro expansion templates. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

export function buildSeizureComplaintV1Intel(sz: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      sz("hpiWitnessedEventDurationPostictal"),
      sz("hpiPriorSeizureHistoryMeds"),
      sz("hpiTraumaFeverSubstanceUse"),
      sz("hpiPregnancyConcern"),
      sz("hpiReportsSeizureActivity"),
      sz("hpiWitnessedGeneralizedTonicClonic"),
      sz("hpiPostictalConfusionImproved"),
    ],
    rosImportantPositives: [
      sz("rosSeizureEvent"),
      sz("rosPostictalConfusion"),
      sz("rosHeadache"),
      sz("rosWeakness"),
      sz("rosFever"),
    ],
    rosImportantNegatives: [sz("rosDeniesFever"), sz("rosDeniesNeckStiffness")],
    rosRedFlags: [
      sz("rfRecurrentSeizures"),
      sz("rfProlongedPostictalState"),
      sz("rfStatusEpilepticus"),
      sz("rfMeningitisConcern"),
      sz("rfIntracranialHemorrhageConcern"),
      sz("rfSevereHypoglycemia"),
    ],
    physicalExam: {
      neuroPsych: [
        sz("examAlertAndOriented"),
        sz("examNoFocalNeurologicDeficit"),
        sz("examNoTraumaticInjury"),
        sz("examPostictalConfusion"),
      ],
      general: [sz("examGeneralAppearance")],
    },
    mdmWorkingAssessment: [
      sz("mdmSeizurePresentation"),
      sz("waReportsSeizureActivity"),
      sz("waWitnessedGeneralizedTonicClonic"),
      sz("waPostictalConfusionImproved"),
      sz("waBreakthroughSeizureConcern"),
    ],
    mdmDifferentialSynthesis: [
      sz("diffSeizure"),
      sz("diffEpilepsy"),
      sz("diffBreakthroughSeizure"),
      sz("diffMedicationNonadherence"),
      sz("diffAlcoholWithdrawal"),
      sz("diffMetabolicToxic"),
      sz("diffInfection"),
      sz("diffIntracranialProcess"),
      sz("diffIntracranialHemorrhage"),
      sz("diffStroke"),
      sz("diffSyncope"),
      sz("diffPsychogenicNonepileptic"),
      sz("diffStatusEpilepticus"),
      sz("diffMeningitis"),
      sz("diffHypoglycemia"),
      sz("diffSepsis"),
    ],
    mdmDataReviewed: [
      sz("mdmCtHeadReviewed"),
      sz("mdmGlucoseReviewed"),
      sz("mdmEegReviewed"),
      sz("mdmLabsReviewed"),
    ],
    mdmRiskStratification: [
      sz("riskLowSuspicionAcuteIntracranialPathology"),
      sz("riskPostictalStateModerate"),
      sz("riskBreakthroughSeizureModerate"),
      sz("riskStatusEpilepticusHigh"),
      sz("riskIntracranialHemorrhageHigh"),
      sz("riskAdmissionRecommendedHigh"),
    ],
    mdmClinicalRationale: [
      sz("reasoningLowSuspicionStatusEpilepticus"),
      sz("reasoningLowSuspicionAcuteStroke"),
      sz("reasoningCtForIntracranialPathology"),
      sz("reasoningAntiepilepticTherapyIndicated"),
      sz("reasoningNeurologyConsultIndicated"),
    ],
    clinicalImpression: [
      sz("impBreakthroughSeizure"),
      sz("impNewOnsetSeizure"),
      sz("impPostictalConfusion"),
      sz("impSeizurePresentation"),
    ],
    mdmPlanSummary: [
      sz("planAntiepilepticTherapy"),
      sz("planNeurologyFollowUp"),
      sz("planGlucoseChecked"),
      sz("planSeizurePrecautionsProvided"),
      sz("planNeurologyConsulted"),
    ],
    mdmAdmitObserveDischarge: [sz("dispObservationInEd")],
    reassessment: [
      sz("reassessMentalStatusRecurrence"),
      sz("reassessPostictalConfusionImproved"),
      sz("reassessNoRecurrentSeizure"),
    ],
    followUpDisposition: [
      sz("dispReturnRecurrenceDrivingRestrictionsAsDirected"),
      sz("dispDischargedWithSeizurePrecautions"),
    ],
  });
}

export function buildTremorMovementComplaintV1Intel(
  tr: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      tr("hpiOnsetRestVsActionTremor"),
      tr("hpiMedicationSubstanceTriggers"),
      tr("hpiWeaknessGaitChangeFever"),
      tr("hpiThyroidSymptoms"),
      tr("hpiTremorPresentAtRest"),
      tr("hpiIntentionTremorPresent"),
    ],
    rosImportantPositives: [
      tr("rosTremor"),
      tr("rosWeakness"),
      tr("rosGaitChange"),
      tr("rosAnxiety"),
    ],
    rosImportantNegatives: [tr("rosDeniesFever"), tr("rosDeniesWeakness")],
    rosRedFlags: [
      tr("rfFunctionalImpairment"),
      tr("rfRapidProgression"),
      tr("rfStrokeConcern"),
      tr("rfToxicIngestionConcern"),
      tr("rfSevereElectrolyteAbnormality"),
    ],
    physicalExam: {
      neuroPsych: [
        tr("examNoRestingTremor"),
        tr("examTremorPresentAtRest"),
        tr("examIntentionTremorPresent"),
        tr("examNonfocalNeurologicExam"),
        tr("examNormalGait"),
      ],
      general: [tr("examGeneralAppearance")],
    },
    mdmWorkingAssessment: [
      tr("mdmTremorMovementPresentation"),
      tr("waTremorPresentAtRest"),
      tr("waIntentionTremorPresent"),
      tr("waFunctionalImpairment"),
      tr("waLowSuspicionAcuteStroke"),
    ],
    mdmDifferentialSynthesis: [
      tr("diffEssentialTremor"),
      tr("diffParkinsonianTremor"),
      tr("diffMedicationEffect"),
      tr("diffAnxietyRelatedTremor"),
      tr("diffMetabolicThyroid"),
      tr("diffElectrolyteAbnormality"),
      tr("diffWithdrawal"),
      tr("diffNeurologicDisorder"),
      tr("diffIntracranialPathology"),
      tr("diffStroke"),
      tr("diffToxicIngestion"),
    ],
    mdmDataReviewed: [
      tr("mdmLabsReviewed"),
      tr("mdmCtHeadReviewed"),
      tr("mdmThyroidFunctionReviewed"),
    ],
    mdmRiskStratification: [
      tr("riskBenignTremorLow"),
      tr("riskMedicationEffectModerate"),
      tr("riskFunctionalImpairmentModerate"),
      tr("riskStrokeConcernHigh"),
      tr("riskIntracranialPathologyHigh"),
      tr("riskAdmissionRecommendedHigh"),
    ],
    mdmClinicalRationale: [
      tr("reasoningMedicationEffectAddressed"),
      tr("reasoningLowSuspicionAcuteStroke"),
      tr("reasoningMetabolicCauseAddressed"),
      tr("reasoningNeurologyFollowUpIndicated"),
    ],
    clinicalImpression: [
      tr("impEssentialTremor"),
      tr("impMedicationInducedTremor"),
      tr("impParkinsonianTremor"),
      tr("impTremorMovementPresentation"),
    ],
    mdmPlanSummary: [
      tr("planMedicationAdjustment"),
      tr("planNeurologyFollowUp"),
      tr("planLabsObtained"),
      tr("planNeurologyConsulted"),
    ],
    mdmAdmitObserveDischarge: [tr("dispObservationInEd")],
    reassessment: [
      tr("reassessFunctionalImpairment"),
      tr("reassessTremorImproved"),
      tr("reassessGaitStable"),
    ],
    followUpDisposition: [
      tr("dispReturnWorseningTremorWeakness"),
      tr("dispNeurologyFollowUpArranged"),
    ],
  });
}

export const SEIZURE_TREMOR_MDM1_TEMPLATE_IDS = ["seizure_complaint_v1", "tremor_movement_complaint_v1"] as const;

export const SEIZURE_TREMOR_REQUIRED_MDM1_SECTIONS = [
  "mdmWorkingAssessment",
  "mdmDifferentialSynthesis",
  "mdmDataReviewed",
  "mdmRiskStratification",
  "mdmClinicalRationale",
  "clinicalImpression",
  "mdmPlanSummary",
] as const;
