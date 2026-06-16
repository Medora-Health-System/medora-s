/** ME.2O-R Track C — chart-ready extremity / MSK complaint intelligence builder. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

function extremityMskHpi(d: (key: string) => string): string[] {
  return [
    d("hpiPainBeganToday"),
    d("hpiPainBeganThisMorning"),
    d("hpiPainBeganOvernight"),
    d("hpiSymptomsForSeveralDays"),
    d("hpiSuddenOnsetPain"),
    d("hpiGradualOnsetPain"),
    d("hpiWorseningPain"),
    d("hpiRecurrentPain"),
    d("hpiShoulderPain"),
    d("hpiElbowPain"),
    d("hpiWristPain"),
    d("hpiHandPain"),
    d("hpiHipPain"),
    d("hpiKneePain"),
    d("hpiAnklePain"),
    d("hpiFootPain"),
    d("hpiJointPain"),
    d("hpiMusclePain"),
    d("hpiAchingPain"),
    d("hpiSharpPain"),
    d("hpiThrobbingPain"),
    d("hpiStiffness"),
    d("hpiSwelling"),
    d("hpiDecreasedRangeOfMotion"),
    d("hpiPainWithMovement"),
    d("hpiDifficultyBearingWeight"),
    d("hpiDifficultyUsingExtremity"),
    d("hpiNoKnownInjury"),
    d("hpiOveruseInjury"),
    d("hpiPainAfterActivity"),
    d("hpiRepetitiveMotion"),
    d("hpiHistoryOfArthritis"),
    d("hpiHistoryOfGout"),
    d("hpiAssociatedSwelling"),
    d("hpiAssociatedRedness"),
    d("hpiAssociatedWarmth"),
    d("hpiAssociatedNumbness"),
    d("hpiAssociatedTingling"),
    d("hpiAssociatedWeakness"),
    d("hpiAssociatedFever"),
    d("hpiDeniesTrauma"),
    d("hpiDeniesFever"),
    d("hpiDeniesRedness"),
    d("hpiDeniesNumbness"),
    d("hpiDeniesWeakness"),
    d("hpiDeniesOpenWound"),
  ];
}

function sharedRos(d: (key: string) => string) {
  return {
    rosImportantPositives: [
      d("rosExtremityPain"),
      d("rosJointPain"),
      d("rosMusclePain"),
      d("rosSwelling"),
      d("rosStiffness"),
      d("rosDecreasedRangeOfMotion"),
      d("rosNumbness"),
      d("rosTingling"),
      d("rosWeakness"),
    ],
    rosImportantNegatives: [
      d("rosDeniesFever"),
      d("rosDeniesRedness"),
      d("rosDeniesNumbness"),
      d("rosDeniesWeakness"),
      d("rosDeniesOpenWound"),
    ],
    rosRedFlags: [
      d("rfSeverePain"),
      d("rfInabilityToBearWeight"),
      d("rfNeurovascularDeficit"),
      d("rfFeverWithJointPain"),
      d("rfRapidlyWorseningSwelling"),
      d("rfCompartmentSyndromeConcern"),
      d("rfSepticArthritisConcern"),
    ],
  };
}

function sharedExam(d: (key: string) => string) {
  return {
    general: [d("examWellAppearing"), d("examUncomfortableAppearing"), d("examNonToxicAppearing")],
    musculoskeletal: [
      d("examLocalizedTendernessPresent"),
      d("examSwellingPresent"),
      d("examDecreasedRangeOfMotion"),
      d("examNormalRangeOfMotion"),
      d("examPainWithRangeOfMotion"),
      d("examDeformityPresent"),
      d("examNoDeformity"),
      d("examJointEffusionPresent"),
      d("examWarmthPresent"),
      d("examErythemaPresent"),
    ],
    neuroPsych: [
      d("examDistalPulsesIntact"),
      d("examCapillaryRefillNormal"),
      d("examSensationIntact"),
      d("examMotorFunctionIntact"),
      d("examNeurovascularlyIntact"),
      d("examDecreasedSensation"),
      d("examWeaknessPresent"),
    ],
    skin: [d("examNoOpenWound"), d("examOpenWoundPresent"), d("examNoOverlyingErythema")],
  };
}

function sharedMdmGoldStandard(d: (key: string) => string) {
  return {
    mdmWorkingAssessment: [
      d("waSuspectedMusculoskeletalPain"),
      d("waSuspectedSprain"),
      d("waSuspectedStrain"),
      d("waSuspectedArthritisFlare"),
      d("waSuspectedGoutFlare"),
      d("waExtremityPainUnclearEtiology"),
      d("waLowSuspicionFracture"),
      d("waConcernSepticArthritis"),
    ],
    mdmDifferentialSynthesis: [
      d("diffSprain"),
      d("diffStrain"),
      d("diffTendinitis"),
      d("diffBursitis"),
      d("diffArthritisFlare"),
      d("diffGoutFlare"),
      d("diffContusion"),
      d("diffFracture"),
      d("diffDislocation"),
      d("diffSepticArthritis"),
      d("diffCellulitis"),
      d("diffDeepVeinThrombosis"),
      d("diffCompartmentSyndrome"),
      d("diffAcuteLimbIschemia"),
      d("diffOpenFracture"),
      d("diffNecrotizingSoftTissueInfection"),
      d("diffOsteomyelitis"),
    ],
    mdmDataReviewed: [
      d("mdmXrayReviewed"),
      d("mdmUltrasoundReviewed"),
      d("mdmCbcReviewed"),
      d("mdmCmpReviewed"),
      d("mdmInflammatoryMarkersReviewed"),
      d("mdmUricAcidReviewed"),
    ],
    mdmRiskStratification: [
      d("riskReassuringExamination"),
      d("riskNeurovascularlyIntact"),
      d("riskLowSuspicionFracture"),
      d("riskStableOutpatientManagement"),
      d("riskImagingObtained"),
      d("riskSplintApplied"),
      d("riskAnalgesiaAdministered"),
      d("riskObservationRequired"),
      d("riskNeurovascularDeficitConcern"),
      d("riskCompartmentSyndromeConcern"),
      d("riskSepticArthritisConcern"),
      d("riskAdmissionRecommended"),
      d("riskOrthopedicConsultationObtained"),
    ],
    mdmClinicalRationale: [
      d("reasoningConsistentWithMusculoskeletalPain"),
      d("reasoningLowSuspicionFracture"),
      d("reasoningLowSuspicionSepticArthritis"),
      d("reasoningNeurovascularExamReassuring"),
      d("reasoningNoEvidenceCompartmentSyndrome"),
      d("reasoningImagingReassuring"),
    ],
    clinicalImpression: [
      d("impExtremityPain"),
      d("impMusculoskeletalPain"),
      d("impSprain"),
      d("impStrain"),
      d("impArthritisFlare"),
      d("impGoutFlare"),
    ],
    mdmPlanSummary: [
      d("planAnalgesiaAdministered"),
      d("planNsAidsRecommended"),
      d("planRiceDiscussed"),
      d("planSplintApplied"),
      d("planWeightBearingPrecautionsDiscussed"),
      d("planOrthopedicFollowUpRecommended"),
      d("planReturnPrecautionsDiscussed"),
      d("planEdReturnAdvisedWorseningSymptoms"),
    ],
  };
}

function sharedReassessment(d: (key: string) => string) {
  return {
    reassessment: [
      d("reassessPainImproved"),
      d("reassessSwellingImproved"),
      d("reassessRangeOfMotionImproved"),
      d("reassessAmbulationImproved"),
      d("reassessRemainsNeurovascularlyIntact"),
      d("reassessRemainsHemodynamicallyStable"),
      d("reassessNoClinicalDeterioration"),
    ],
  };
}

export function buildExtremityMskComplaintIntel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: extremityMskHpi(d),
    ...sharedRos(d),
    physicalExam: sharedExam(d),
    ...sharedMdmGoldStandard(d),
    ...sharedReassessment(d),
  });
}
