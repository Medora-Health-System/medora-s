/** ME.2L-R Track C — chart-ready chest pain complaint intelligence builder. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

function chestPainHpi(cp: (key: string) => string): string[] {
  return [
    cp("hpiChestPainBeganToday"),
    cp("hpiChestPainBeganOvernight"),
    cp("hpiSubsternalChestPain"),
    cp("hpiLeftSidedChestPain"),
    cp("hpiRightSidedChestPain"),
    cp("hpiPressureLikeDiscomfort"),
    cp("hpiSharpChestPain"),
    cp("hpiPainRadiatesToLeftArm"),
    cp("hpiPainRadiatesToJaw"),
    cp("hpiPainRadiatesToBack"),
    cp("hpiWorseningWithExertion"),
    cp("hpiImprovedWithRest"),
    cp("hpiAssociatedShortnessOfBreath"),
    cp("hpiAssociatedNausea"),
    cp("hpiAssociatedDiaphoresis"),
    cp("hpiAssociatedDizziness"),
    cp("hpiAssociatedPalpitations"),
    cp("hpiSuddenOnset"),
    cp("hpiGradualOnset"),
    cp("hpiPleuriticChestPain"),
    cp("hpiPositionalChestPain"),
    cp("hpiWorseWithInspiration"),
    cp("hpiReproducibleWithPalpation"),
    cp("hpiHistoryOfCoronaryArteryDisease"),
    cp("hpiPriorMyocardialInfarction"),
    cp("hpiSmokingHistory"),
    cp("hpiCocaineUse"),
    cp("hpiRecentTravel"),
    cp("hpiUnilateralLegSwelling"),
    cp("hpiDeniesSyncope"),
    cp("hpiDeniesHemoptysis"),
    cp("hpiDeniesFever"),
    cp("hpiDeniesRecentTrauma"),
  ];
}

function sharedRos(cp: (key: string) => string) {
  return {
    rosImportantPositives: [
      cp("rosChestPain"),
      cp("rosShortnessOfBreath"),
      cp("rosDiaphoresis"),
      cp("rosNausea"),
      cp("rosPalpitations"),
      cp("rosDizziness"),
      cp("rosVomiting"),
    ],
    rosImportantNegatives: [
      cp("rosDeniesSyncope"),
      cp("rosDeniesHemoptysis"),
      cp("rosDeniesFever"),
      cp("rosDeniesRecentTrauma"),
      cp("rosDeniesCalfPain"),
    ],
    rosRedFlags: [
      cp("rfSyncope"),
      cp("rfHypotension"),
      cp("rfSevereChestPain"),
      cp("rfAlteredMentalStatus"),
      cp("rfRecurrentUnrelentingPain"),
    ],
  };
}

function sharedExam(cp: (key: string) => string) {
  return {
    general: [
      cp("examWellAppearing"),
      cp("examUncomfortableAppearing"),
      cp("examDiaphoretic"),
      cp("examAnxiousAppearing"),
      cp("examChestWallTendernessPresent"),
    ],
    cardiovascular: [
      cp("examRegularRateAndRhythm"),
      cp("examTachycardic"),
      cp("examMurmurPresent"),
      cp("examPeripheralPulsesPresent"),
    ],
    respiratory: [
      cp("examNoRespiratoryDistress"),
      cp("examLungsClearBilaterally"),
      cp("examWheezing"),
      cp("examCrackles"),
    ],
  };
}

function sharedMdmGoldStandard(cp: (key: string) => string) {
  return {
    mdmWorkingAssessment: [
      cp("waAtypicalChestPain"),
      cp("waSuspectedMusculoskeletalChestPain"),
      cp("waSuspectedGerd"),
      cp("waConcernForAcs"),
      cp("waLowSuspicionAcs"),
      cp("waLowSuspicionPulmonaryEmbolism"),
    ],
    mdmDifferentialSynthesis: [
      cp("diffMusculoskeletalChestPain"),
      cp("diffGerd"),
      cp("diffAnxiety"),
      cp("diffAcuteCoronarySyndrome"),
      cp("diffPulmonaryEmbolism"),
      cp("diffPericarditis"),
      cp("diffMyocarditis"),
      cp("diffStemi"),
      cp("diffNstemi"),
      cp("diffAorticDissection"),
      cp("diffTensionPneumothorax"),
      cp("diffMassivePulmonaryEmbolism"),
      cp("diffEsophagealRupture"),
      cp("diffCardiacTamponade"),
    ],
    mdmDataReviewed: [
      cp("mdmCbcReviewed"),
      cp("mdmCmpReviewed"),
      cp("mdmTroponinReviewed"),
      cp("mdmBnpReviewed"),
      cp("mdmEkgReviewed"),
      cp("mdmChestXrayReviewed"),
      cp("mdmCtaChestReviewed"),
    ],
    mdmRiskStratification: [
      cp("riskReassuringExaminationLow"),
      cp("riskLowRiskChestPainFeaturesLow"),
      cp("riskSerialTroponinsNegativeLow"),
      cp("riskAtypicalFeaturesModerate"),
      cp("riskObservationRequiredModerate"),
      cp("riskRepeatEkgRequiredModerate"),
      cp("riskAcsConcernHigh"),
      cp("riskAdmissionRecommendedHigh"),
      cp("riskCardiologyConsultationHigh"),
    ],
    mdmClinicalRationale: [
      cp("reasoningSymptomsNotConsistentWithAcs"),
      cp("reasoningLowSuspicionPulmonaryEmbolism"),
      cp("reasoningChestPainReproducibleOnExamination"),
      cp("reasoningNoEvidenceAcuteIschemia"),
    ],
    clinicalImpression: [
      cp("impAtypicalChestPain"),
      cp("impMusculoskeletalChestPain"),
      cp("impGerd"),
      cp("impAcuteCoronarySyndrome"),
      cp("impChestPainUnclearEtiology"),
    ],
    mdmPlanSummary: [
      cp("planSerialTroponinsOrdered"),
      cp("planRepeatEkgOrdered"),
      cp("planCardiologyFollowUpRecommended"),
      cp("planAdmissionRecommended"),
      cp("planReturnPrecautionsDiscussed"),
    ],
  };
}

function sharedReassessment(cp: (key: string) => string) {
  return {
    reassessment: [
      cp("reassessChestPainImproved"),
      cp("reassessSymptomsImprovedAfterTreatment"),
      cp("reassessRepeatEkgUnchanged"),
      cp("reassessRemainsHemodynamicallyStable"),
    ],
    followUpDisposition: [
      cp("dispReturnWorseningChestPain"),
      cp("dispReturnWorseningShortnessOfBreath"),
      cp("dispCardiologyFollowUpRecommended"),
      cp("dispPcpFollowUpRecommended"),
      cp("dispReturnPrecautionsDiscussed"),
    ],
  };
}

export function buildChestPainComplaintIntel(cp: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: chestPainHpi(cp),
    ...sharedRos(cp),
    physicalExam: sharedExam(cp),
    ...sharedMdmGoldStandard(cp),
    mdmAdmitObserveDischarge: [cp("dispObservation"), cp("dispAdmission"), cp("dispDischarge")],
    ...sharedReassessment(cp),
  });
}
