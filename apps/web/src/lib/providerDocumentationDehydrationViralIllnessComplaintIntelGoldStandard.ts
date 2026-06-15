/** ME.2U Track C — chart-ready dehydration / viral illness complaint intelligence builder. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

export function buildDehydrationViralIllnessComplaintIntel(
  dv: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      dv("hpiDecreasedOralIntake"),
      dv("hpiVomiting"),
      dv("hpiDiarrhea"),
      dv("hpiPoorUrineOutput"),
      dv("hpiDizziness"),
      dv("hpiFever"),
      dv("hpiWeakness"),
      dv("hpiSickContacts"),
      dv("hpiSymptomsSeveralDays"),
    ],
    rosImportantPositives: [
      dv("rosVomiting"),
      dv("rosDiarrhea"),
      dv("rosDizziness"),
      dv("rosFever"),
      dv("rosWeakness"),
      dv("rosDecreasedUrineOutput"),
      dv("rosAbdominalCramping"),
    ],
    rosImportantNegatives: [dv("rosDeniesBloodInStool"), dv("rosDeniesChestPain")],
    rosRedFlags: [
      dv("rfSevereDehydration"),
      dv("rfAlteredMentalStatus"),
      dv("rfHypotension"),
      dv("rfInabilityToTolerateOralIntake"),
    ],
    physicalExam: {
      skin: [
        dv("examDryMucousMembranes"),
        dv("examTachycardia"),
        dv("examDelayedCapillaryRefill"),
        dv("examPoorSkinTurgor"),
      ],
      general: [dv("examWellAppearing"), dv("examIllAppearing")],
      neuroPsych: [dv("examAlertOriented"), dv("examAlteredMentalStatus")],
    },
    mdmWorkingAssessment: [
      dv("waMildDehydration"),
      dv("waModerateDehydration"),
      dv("waViralIllnessWithDehydration"),
    ],
    mdmDifferentialSynthesis: [
      dv("diffViralGastroenteritis"),
      dv("diffDehydration"),
      dv("diffElectrolyteAbnormality"),
      dv("diffUrinaryTractInfection"),
      dv("diffAppendicitis"),
      dv("diffDiabeticKetoacidosis"),
      dv("diffSepsis"),
      dv("diffMeningitis"),
      dv("diffHeatExhaustion"),
      dv("diffPregnancyRelatedNausea"),
      dv("diffBowelObstruction"),
      dv("diffInflammatoryBowelDisease"),
      dv("diffClostridioidesDifficileColitis"),
      dv("diffFoodborneIllness"),
      dv("diffInfectiousMononucleosis"),
    ],
    mdmDataReviewed: [
      dv("mdmCbcReviewed"),
      dv("mdmCmpReviewed"),
      dv("mdmUrinalysisReviewed"),
      dv("mdmPregnancyTestReviewed"),
      dv("mdmStoolStudiesReviewed"),
    ],
    mdmRiskStratification: [
      dv("riskLowSuspicionSevereDehydration"),
      dv("riskModerateSuspicionElectrolyteAbnormality"),
      dv("riskHighSuspicionSepsisOrShock"),
    ],
    mdmClinicalRationale: [
      dv("reasoningMostConsistentWithViralGastroenteritis"),
      dv("reasoningLowSuspicionSurgicalAbdomen"),
      dv("reasoningLowSuspicionSepsis"),
    ],
    clinicalImpression: [
      dv("impViralGastroenteritis"),
      dv("impDehydration"),
      dv("impAcuteGastroenteritis"),
    ],
    mdmPlanSummary: [
      dv("planIvFluidsAdministered"),
      dv("planAntiemeticsPrescribed"),
      dv("planOralRehydrationDiscussed"),
      dv("planReturnPrecautionsDiscussed"),
      dv("planPrimaryCareFollowUpRecommended"),
    ],
    mdmAdmitObserveDischarge: [dv("dispObservation"), dv("dispAdmission"), dv("dispDischarge")],
    reassessment: [
      dv("reassessToleratingOralIntake"),
      dv("reassessHydrationImproved"),
      dv("reassessSymptomsImprovedAfterTreatment"),
    ],
    followUpDisposition: [
      dv("dispReturnInabilityToTolerateOralIntake"),
      dv("dispReturnWorseningWeaknessDizziness"),
      dv("dispReturnBloodInStool"),
      dv("dispReturnAlteredMentalStatus"),
    ],
  });
}
