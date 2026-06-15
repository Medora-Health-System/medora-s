/** ME.2D-R Track C — chart-ready abdominal pain complaint intelligence builders. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

function adultHpi(abd: (key: string) => string): string[] {
  return [
    abd("hpiBeganToday"),
    abd("hpiBeganThisMorning"),
    abd("hpiBeganOvernight"),
    abd("hpiSuddenOnset"),
    abd("hpiGradualOnset"),
    abd("hpiSymptomsSeveralDays"),
    abd("hpiIntermittentPain"),
    abd("hpiWorseningPain"),
    abd("hpiRightUpperQuadrantPain"),
    abd("hpiRightLowerQuadrantPain"),
    abd("hpiLeftUpperQuadrantPain"),
    abd("hpiLeftLowerQuadrantPain"),
    abd("hpiEpigastricPain"),
    abd("hpiPeriumbilicalPain"),
    abd("hpiSuprapubicPain"),
    abd("hpiDiffuseAbdominalPain"),
    abd("hpiFlankPain"),
    abd("hpiCrampingPain"),
    abd("hpiSharpPain"),
    abd("hpiBurningPain"),
    abd("hpiPressureLikePain"),
    abd("hpiColickyPain"),
    abd("hpiConstantPain"),
    abd("hpiNausea"),
    abd("hpiVomiting"),
    abd("hpiDiarrhea"),
    abd("hpiConstipation"),
    abd("hpiDecreasedAppetite"),
    abd("hpiFever"),
    abd("hpiChills"),
    abd("hpiUrinarySymptoms"),
    abd("hpiVaginalBleeding"),
    abd("hpiVaginalDischarge"),
    abd("hpiPregnancyConcern"),
    abd("hpiDeniesFever"),
    abd("hpiDeniesVomiting"),
    abd("hpiDeniesDiarrhea"),
    abd("hpiDeniesConstipation"),
    abd("hpiDeniesUrinarySymptoms"),
    abd("hpiDeniesFlankPain"),
    abd("hpiDeniesVaginalBleeding"),
    abd("hpiDeniesVaginalDischarge"),
    abd("hpiDeniesBloodInStool"),
    abd("hpiDeniesBlackStool"),
  ];
}

function sharedRos(abd: (key: string) => string) {
  return {
    rosImportantPositives: [
      abd("rosAbdominalPain"),
      abd("rosNausea"),
      abd("rosVomiting"),
      abd("rosDiarrhea"),
      abd("rosConstipation"),
      abd("rosFever"),
      abd("rosChills"),
      abd("rosUrinarySymptoms"),
      abd("rosFlankPain"),
      abd("rosDizziness"),
      abd("rosWeakness"),
    ],
    rosImportantNegatives: [
      abd("rosDeniesChestPain"),
      abd("rosDeniesShortnessOfBreath"),
      abd("rosDeniesHematemesis"),
      abd("rosDeniesBloodyStool"),
      abd("rosDeniesMelena"),
      abd("rosDeniesSyncope"),
    ],
    rosRedFlags: [
      abd("rfSevereAbdominalPain"),
      abd("rfPersistentVomiting"),
      abd("rfBloodyStool"),
      abd("rfMelena"),
      abd("rfSyncope"),
      abd("rfAlteredMentalStatus"),
      abd("rfPeritonealSignsConcern"),
      abd("rfPregnancyConcern"),
      abd("rfGiBleedingConcern"),
    ],
  };
}

function sharedExam(abd: (key: string) => string) {
  return {
    general: [
      abd("examWellAppearing"),
      abd("examUncomfortableAppearing"),
      abd("examMildlyIllAppearing"),
      abd("examNonToxicAppearing"),
      abd("examAppearsDehydrated"),
      abd("examAlertOriented"),
      abd("examNoFocalNeurologicDeficit"),
      abd("examAgeAppropriateBehavior"),
    ],
    abdomen: [
      abd("examAbdomenSoft"),
      abd("examNonTenderAbdomen"),
      abd("examMildDiffuseTenderness"),
      abd("examEpigastricTenderness"),
      abd("examRightUpperQuadrantTenderness"),
      abd("examRightLowerQuadrantTenderness"),
      abd("examLeftLowerQuadrantTenderness"),
      abd("examSuprapubicTenderness"),
      abd("examGuardingPresent"),
      abd("examNoGuarding"),
      abd("examReboundTendernessPresent"),
      abd("examNoReboundTenderness"),
      abd("examNoRigidity"),
      abd("examNoFocalPeritonealSigns"),
      abd("examBowelSoundsPresent"),
      abd("examMildAbdominalDistention"),
      abd("examNoCvaTenderness"),
      abd("examCvaTendernessPresent"),
      abd("examPelvicExamDeferred"),
      abd("examPelvicTenderness"),
    ],
  };
}

function sharedMdmGoldStandard(abd: (key: string) => string) {
  return {
    mdmWorkingAssessment: [
      abd("waSuspectedGastroenteritis"),
      abd("waSuspectedViralIllness"),
      abd("waMildDehydration"),
      abd("waAbdominalPainUnclearEtiology"),
      abd("waLowSuspicionSurgicalAbdomen"),
      abd("waLowSuspicionAppendicitis"),
      abd("waLowSuspicionBowelObstruction"),
    ],
    mdmDifferentialSynthesis: [
      abd("diffGastroenteritis"),
      abd("diffGastritis"),
      abd("diffConstipation"),
      abd("diffGerd"),
      abd("diffViralIllness"),
      abd("diffAppendicitis"),
      abd("diffCholecystitis"),
      abd("diffPancreatitis"),
      abd("diffDiverticulitis"),
      abd("diffBowelObstruction"),
      abd("diffPyelonephritis"),
      abd("diffKidneyStone"),
      abd("diffOvarianTorsion"),
      abd("diffEctopicPregnancy"),
      abd("diffPerforatedViscus"),
      abd("diffMesentericIschemia"),
      abd("diffAbdominalAorticAneurysm"),
      abd("diffSepsis"),
      abd("diffGiBleed"),
    ],
    mdmDataReviewed: [
      abd("mdmCbcReviewed"),
      abd("mdmCmpReviewed"),
      abd("mdmLipaseReviewed"),
      abd("mdmUrinalysisReviewed"),
      abd("mdmPregnancyTestReviewed"),
      abd("mdmCtAbdomenPelvisReviewed"),
      abd("mdmAbdominalUltrasoundReviewed"),
      abd("mdmPelvicUltrasoundReviewed"),
    ],
    mdmRiskStratification: [
      abd("riskReassuringAbdominalExamLow"),
      abd("riskToleratingOralIntakeLow"),
      abd("riskNoPeritonealSignsLow"),
      abd("riskLowSuspicionSurgicalAbdomenLow"),
      abd("riskSerialAbdominalExamsModerate"),
      abd("riskImagingObtainedModerate"),
      abd("riskIvFluidsAdministeredModerate"),
      abd("riskObservationRequiredModerate"),
      abd("riskSurgicalAbdomenConcernHigh"),
      abd("riskBowelObstructionConcernHigh"),
      abd("riskPeritonealSignsHigh"),
      abd("riskAdmissionRecommendedHigh"),
      abd("riskSurgicalConsultationHigh"),
    ],
    mdmClinicalRationale: [
      abd("reasoningMostConsistentWithGastroenteritis"),
      abd("reasoningLowSuspicionAppendicitis"),
      abd("reasoningLowSuspicionBowelObstruction"),
      abd("reasoningLowSuspicionEctopicPregnancy"),
    ],
    clinicalImpression: [
      abd("impAbdominalPain"),
      abd("impViralGastroenteritis"),
      abd("impGastroenteritis"),
      abd("impMildDehydration"),
      abd("impConstipation"),
      abd("impGastritis"),
    ],
    mdmPlanSummary: [
      abd("planIvFluidsAdministered"),
      abd("planAnalgesiaAdministered"),
      abd("planAntiemeticAdministered"),
      abd("planOralHydrationEncouraged"),
      abd("planReturnPrecautionsDiscussed"),
      abd("planPcpFollowUpRecommended"),
      abd("planEdReturnAdvisedForWorseningSymptoms"),
    ],
  };
}

function sharedReassessment(abd: (key: string) => string) {
  return {
    reassessment: [
      abd("reassessAbdominalPainImproved"),
      abd("reassessNauseaImproved"),
      abd("reassessToleratingOralIntake"),
      abd("reassessRepeatAbdominalExamBenign"),
      abd("reassessRepeatAbdominalExamUnchanged"),
      abd("reassessRemainsHemodynamicallyStable"),
      abd("reassessNoPeritonealSignsOnReassessment"),
      abd("reassessSymptomsImprovedAfterTreatment"),
    ],
    followUpDisposition: [
      abd("dispReturnWorseningAbdominalPain"),
      abd("dispReturnPersistentVomiting"),
      abd("dispReturnBloodInStoolOrMelena"),
      abd("dispPcpFollowUpRecommended"),
      abd("dispSurgicalFollowUpRecommended"),
    ],
  };
}

export function buildAdultAbdominalPainComplaintIntel(
  abd: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: adultHpi(abd),
    ...sharedRos(abd),
    physicalExam: sharedExam(abd),
    ...sharedMdmGoldStandard(abd),
    mdmAdmitObserveDischarge: [abd("dispObservation"), abd("dispAdmission"), abd("dispDischarge")],
    ...sharedReassessment(abd),
  });
}

export function buildPediatricAbdominalPainComplaintIntel(
  ped: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      ped("hpiCaregiverPresent"),
      ped("hpiParentReportsAbdominalPain"),
      ped("hpiBeganToday"),
      ped("hpiRightLowerQuadrantPain"),
      ped("hpiNausea"),
      ped("hpiVomiting"),
      ped("hpiFever"),
      ped("hpiDecreasedAppetite"),
      ped("hpiDecreasedActivity"),
      ped("hpiStillDrinkingFluids"),
      ped("hpiDecreasedUrineOutput"),
      ped("hpiPainWorsensWithMovement"),
      ped("hpiUrinarySymptoms"),
      ped("hpiDeniesBloodyStool"),
    ],
    ...sharedRos(ped),
    physicalExam: sharedExam(ped),
    mdmWorkingAssessment: [
      ped("waSuspectedGastroenteritis"),
      ped("waLowSuspicionAppendicitis"),
      ped("waLowSuspicionSurgicalAbdomen"),
    ],
    mdmDifferentialSynthesis: [
      ped("diffGastroenteritis"),
      ped("diffConstipation"),
      ped("diffAppendicitis"),
      ped("diffMesentericAdenitis"),
      ped("diffUti"),
      ped("diffTesticularTorsion"),
      ped("diffOvarianTorsion"),
      ped("diffIntussusception"),
      ped("diffBowelObstruction"),
      ped("diffSepsis"),
    ],
    mdmDataReviewed: [
      ped("mdmUrinalysisReviewed"),
      ped("mdmAbdominalUltrasoundReviewed"),
      ped("mdmCbcReviewed"),
    ],
    mdmRiskStratification: [
      ped("riskReassuringAbdominalExamLow"),
      ped("riskNoPeritonealSignsLow"),
      ped("riskImagingObtainedModerate"),
      ped("riskSurgicalAbdomenConcernHigh"),
    ],
    mdmClinicalRationale: [
      ped("reasoningLowSuspicionAppendicitis"),
      ped("reasoningLowSuspicionBowelObstruction"),
    ],
    clinicalImpression: [ped("impAbdominalPain"), ped("impGastroenteritis")],
    mdmPlanSummary: [
      ped("planIvFluidsAdministered"),
      ped("planOralHydrationEncouraged"),
      ped("planReturnPrecautionsDiscussed"),
    ],
    mdmAdmitObserveDischarge: [ped("dispObservation"), ped("dispAdmission"), ped("dispDischarge")],
    ...sharedReassessment(ped),
  });
}

export function buildAbdominalPainComplaintV1Intel(
  abd: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return buildAdultAbdominalPainComplaintIntel(abd);
}
