/** ME.2J-R Track C — chart-ready rash / skin complaint intelligence builder. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

function rashDermatologyHpi(rs: (key: string) => string): string[] {
  return [
    rs("hpiRashBeganToday"),
    rs("hpiRashDevelopedYesterday"),
    rs("hpiItching"),
    rs("hpiBurningSensation"),
    rs("hpiPainfulRash"),
    rs("hpiRashSpreading"),
    rs("hpiLocalizedRash"),
    rs("hpiDiffuseRash"),
    rs("hpiRedness"),
    rs("hpiSwelling"),
    rs("hpiDrainageFromLesion"),
    rs("hpiSkinBlistering"),
    rs("hpiNewMedicationExposure"),
    rs("hpiNewSoapExposure"),
    rs("hpiNewDetergentExposure"),
    rs("hpiInsectBite"),
    rs("hpiPossiblePoisonIvyExposure"),
    rs("hpiRecentOutdoorExposure"),
    rs("hpiRecentSickContact"),
    rs("hpiFever"),
    rs("hpiDeniesFacialSwelling"),
    rs("hpiDeniesLipSwelling"),
    rs("hpiDeniesTongueSwelling"),
    rs("hpiDeniesDifficultySwallowing"),
    rs("hpiDeniesShortnessOfBreath"),
  ];
}

function rashDermatologyRos(rs: (key: string) => string) {
  return {
    rosImportantPositives: [
      rs("rosRash"),
      rs("rosItching"),
      rs("rosBurning"),
      rs("rosPain"),
      rs("rosSwelling"),
      rs("rosFever"),
      rs("rosDrainage"),
      rs("rosBlistering"),
    ],
    rosImportantNegatives: [
      rs("rosDeniesFacialSwelling"),
      rs("rosDeniesLipSwelling"),
      rs("rosDeniesTongueSwelling"),
      rs("rosDeniesDifficultySwallowing"),
      rs("rosDeniesShortnessOfBreath"),
      rs("rosDeniesFever"),
      rs("rosDeniesDrainage"),
    ],
    rosRedFlags: [
      rs("rfFacialSwelling"),
      rs("rfAirwayInvolvement"),
      rs("rfMucosalInvolvement"),
      rs("rfRapidProgression"),
      rs("rfHighFever"),
      rs("rfAlteredMentalStatus"),
      rs("rfSeverePain"),
      rs("rfPurpuraConcern"),
    ],
  };
}

function rashDermatologyExam(rs: (key: string) => string) {
  return {
    general: [rs("examWellAppearing"), rs("examNonToxicAppearing")],
    skin: [
      rs("examErythematousRash"),
      rs("examMaculopapularRash"),
      rs("examVesicularRash"),
      rs("examUrticarialRash"),
      rs("examPurpura"),
      rs("examPetechiae"),
      rs("examBlisteringPresent"),
      rs("examNoMucosalInvolvement"),
    ],
    heent: [rs("examNoFacialSwelling"), rs("examNoMucosalInvolvementHeent")],
    respiratory: [rs("examNoRespiratoryDistress")],
  };
}

function rashDermatologyMdm(rs: (key: string) => string) {
  return {
    mdmWorkingAssessment: [
      rs("waAllergicDermatitis"),
      rs("waContactDermatitis"),
      rs("waCellulitis"),
      rs("waLocalizedSkinInfection"),
      rs("waUrticaria"),
      rs("waViralExanthem"),
      rs("waRashUnclearEtiology"),
    ],
    mdmDifferentialSynthesis: [
      rs("diffContactDermatitis"),
      rs("diffAllergicDermatitis"),
      rs("diffUrticaria"),
      rs("diffCellulitis"),
      rs("diffAbscess"),
      rs("diffImpetigo"),
      rs("diffViralExanthem"),
      rs("diffDrugEruption"),
      rs("diffEczemaFlare"),
      rs("diffAnaphylaxis"),
      rs("diffAngioedema"),
      rs("diffStevensJohnsonSyndrome"),
      rs("diffToxicEpidermalNecrolysis"),
      rs("diffNecrotizingSoftTissueInfection"),
      rs("diffMeningococcemia"),
      rs("diffRockyMountainSpottedFever"),
      rs("diffSepsis"),
    ],
    mdmDataReviewed: [
      rs("mdmCbcReviewed"),
      rs("mdmCmpReviewed"),
      rs("mdmBloodCultureReviewed"),
      rs("mdmWoundCultureReviewed"),
      rs("mdmUltrasoundReviewed"),
      rs("mdmCtReviewed"),
    ],
    mdmRiskStratification: [
      rs("riskWellAppearingLocalizedRashLow"),
      rs("riskNoSystemicSymptomsLow"),
      rs("riskAntihistamineOrTopicalTherapyModerate"),
      rs("riskObservationRequiredModerate"),
      rs("riskSystemicSymptomsHigh"),
      rs("riskMucosalInvolvementHigh"),
      rs("riskAdmissionRecommendedHigh"),
    ],
    mdmClinicalRationale: [
      rs("reasoningMostConsistentContactDermatitis"),
      rs("reasoningMostConsistentAllergicDermatitis"),
      rs("reasoningLowSuspicionNecrotizingInfection"),
      rs("reasoningNoEvidenceAnaphylaxis"),
      rs("reasoningNoAirwayInvolvementIdentified"),
      rs("reasoningNoMucosalInvolvementIdentified"),
      rs("reasoningFindingsNotConsistentWithAbscess"),
    ],
    clinicalImpression: [
      rs("impContactDermatitis"),
      rs("impAllergicDermatitis"),
      rs("impCellulitis"),
      rs("impUrticaria"),
      rs("impViralExanthem"),
      rs("impRashUnclearEtiology"),
    ],
    mdmPlanSummary: [
      rs("planAntihistaminePrescribed"),
      rs("planTopicalSteroidPrescribed"),
      rs("planOralSteroidPrescribed"),
      rs("planAntibioticsPrescribed"),
      rs("planWoundCareDiscussed"),
      rs("planReturnPrecautionsDiscussed"),
      rs("planPcpFollowUpRecommended"),
      rs("planDermatologyFollowUpRecommended"),
    ],
  };
}

function rashDermatologyReassessment(rs: (key: string) => string) {
  return {
    reassessment: [
      rs("reassessRashImproved"),
      rs("reassessItchingImproved"),
      rs("reassessPainImproved"),
      rs("reassessSwellingImproved"),
      rs("reassessRemainsHemodynamicallyStable"),
      rs("reassessNoProgressionObserved"),
      rs("reassessSymptomsImprovedAfterTreatment"),
    ],
    followUpDisposition: [
      rs("dispReturnWorseningRashFacialSwelling"),
      rs("dispReturnPrecautionsDiscussed"),
      rs("dispPcpFollowUpRecommended"),
      rs("dispDermatologyFollowUpRecommended"),
    ],
  };
}

export function buildAllergicReactionRashIntel(
  ar: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      ar("hpiRashBeganToday"),
      ar("hpiRashDevelopedYesterday"),
      ar("hpiItching"),
      ar("hpiSwelling"),
      ar("hpiThroatTightness"),
      ar("hpiWheezing"),
      ar("hpiMedicationExposure"),
      ar("hpiFoodExposure"),
      ar("hpiInsectSting"),
      ar("hpiPriorAnaphylaxis"),
      ar("hpiEpinephrineUsedAtHome"),
      ar("hpiDeniesShortnessOfBreath"),
      ar("hpiDeniesThroatSwelling"),
      ar("hpiDeniesSyncope"),
    ],
    rosImportantPositives: [
      ar("rosRash"),
      ar("rosItching"),
      ar("rosSwelling"),
      ar("rosWheezing"),
      ar("rosThroatTightness"),
      ar("rosNauseaVomiting"),
    ],
    rosImportantNegatives: [
      ar("rosDeniesShortnessOfBreath"),
      ar("rosDeniesThroatSwelling"),
      ar("rosDeniesWheezing"),
      ar("rosDeniesVomiting"),
      ar("rosDeniesSyncope"),
      ar("rosDeniesMucosalLesions"),
    ],
    rosRedFlags: [
      ar("rfAnaphylaxisConcern"),
      ar("rfAirwaySwellingConcern"),
      ar("rfHypotension"),
      ar("rfWheezingBronchospasm"),
      ar("rfMucosalInvolvement"),
      ar("rfStevensJohnsonTenConcern"),
      ar("rfPurpuraPetechiaeConcern"),
    ],
    physicalExam: {
      general: [ar("examWellAppearing"), ar("examNoHypotension")],
      respiratory: [ar("examNoRespiratoryDistress"), ar("examAirwayPatent"), ar("examWheezingPresent")],
      heent: [ar("examNoTongueLipSwelling"), ar("examMucosalLesionsPresent")],
      skin: [ar("examUrticariaPresent"), ar("examMaculopapularRash"), ar("examPurpura"), ar("examPetechiae")],
    },
    mdmWorkingAssessment: [
      ar("waAllergicReaction"),
      ar("waUrticaria"),
      ar("waAnaphylaxisConcern"),
      ar("waContactDermatitis"),
      ar("waRashUnclearEtiology"),
    ],
    mdmDifferentialSynthesis: [
      ar("diffAllergicReaction"),
      ar("diffAnaphylaxis"),
      ar("diffAngioedema"),
      ar("diffUrticaria"),
      ar("diffContactDermatitis"),
      ar("diffViralExanthem"),
      ar("diffCellulitis"),
      ar("diffMedicationReaction"),
      ar("diffStevensJohnsonSyndrome"),
      ar("diffToxicEpidermalNecrolysis"),
      ar("diffNecrotizingSoftTissueInfection"),
      ar("diffMeningococcemia"),
      ar("diffSepsis"),
    ],
    mdmDataReviewed: [ar("mdmCbcReviewed"), ar("mdmCmpReviewed"), ar("mdmTryptaseReviewed")],
    mdmRiskStratification: [
      ar("riskLocalizedUrticariaLow"),
      ar("riskNoSystemicSymptomsLow"),
      ar("riskAntihistamineTherapyModerate"),
      ar("riskObservationRequiredModerate"),
      ar("riskAnaphylaxisConcernHigh"),
      ar("riskAirwayInvolvementHigh"),
      ar("riskAdmissionRecommendedHigh"),
    ],
    mdmClinicalRationale: [
      ar("reasoningMostConsistentAllergicReaction"),
      ar("reasoningNoEvidenceAnaphylaxis"),
      ar("reasoningNoAirwayInvolvementIdentified"),
      ar("reasoningNoMucosalInvolvementIdentified"),
      ar("reasoningLowSuspicionNecrotizingInfection"),
    ],
    clinicalImpression: [
      ar("impAllergicReaction"),
      ar("impUrticaria"),
      ar("impContactDermatitis"),
      ar("impAnaphylaxis"),
    ],
    mdmPlanSummary: [
      ar("planEpinephrineAdministered"),
      ar("planAntihistaminePrescribed"),
      ar("planSteroidPrescribed"),
      ar("planTriggerAvoidanceDiscussed"),
      ar("planEpinephrineAutoinjectorPrescribed"),
      ar("planReturnPrecautionsDiscussed"),
      ar("planFollowUpRecommended"),
    ],
    mdmAdmitObserveDischarge: [ar("dispObservation"), ar("dispAdmission"), ar("dispDischarge")],
    reassessment: [
      ar("reassessRashImproved"),
      ar("reassessAirwayRemainsPatent"),
      ar("reassessNoRespiratoryDistress"),
      ar("reassessRemainsHemodynamicallyStable"),
      ar("reassessSymptomsImprovedAfterTreatment"),
    ],
    followUpDisposition: [
      ar("dispReturnBreathingDifficultyThroatSwelling"),
      ar("dispAllergenAvoidanceDiscussed"),
      ar("dispEpinephrineAutoinjectorInstructions"),
      ar("dispFollowUpRecommended"),
    ],
  });
}

export function buildRashSkinComplaintV1Intel(rs: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: rashDermatologyHpi(rs),
    ...rashDermatologyRos(rs),
    physicalExam: rashDermatologyExam(rs),
    ...rashDermatologyMdm(rs),
    mdmAdmitObserveDischarge: [rs("dispObservation"), rs("dispAdmission"), rs("dispDischarge")],
    ...rashDermatologyReassessment(rs),
  });
}

function cellulitisHpi(cs: (key: string) => string): string[] {
  return [
    cs("hpiRednessBeganToday"),
    cs("hpiRednessSeveralDays"),
    cs("hpiRednessSwellingWarmth"),
    cs("hpiPainAtSite"),
    cs("hpiSpreadingRedness"),
    cs("hpiDrainageFromSite"),
    cs("hpiInsectBite"),
    cs("hpiRecentTrauma"),
    cs("hpiFever"),
    cs("hpiStreaking"),
    cs("hpiImmunocompromised"),
    cs("hpiDeniesSystemicSymptoms"),
  ];
}

export function buildCellulitisSkinInfectionComplaintV1Intel(
  cs: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: cellulitisHpi(cs),
    rosImportantPositives: [cs("rosSkinRedness"), cs("rosSwelling"), cs("rosPain"), cs("rosFever"), cs("rosWarmth")],
    rosImportantNegatives: [cs("rosDeniesDrainage"), cs("rosDeniesSystemicSymptoms")],
    rosRedFlags: [cs("rfRapidSpread"), cs("rfHighFever"), cs("rfSeverePain"), cs("rfHypotension"), cs("rfAlteredMentalStatus")],
    physicalExam: {
      general: [cs("examWellAppearing"), cs("examNonToxicAppearing"), cs("examFebrile"), cs("examHemodynamicallyStable")],
      skin: [
        cs("examLocalizedCellulitis"),
        cs("examErythemaPresent"),
        cs("examWarmthPresent"),
        cs("examIndurationPresent"),
        cs("examPurulentDrainagePresent"),
        cs("examNoFluctuance"),
        cs("examNoAbscessIdentified"),
      ],
    },
    mdmWorkingAssessment: [
      cs("waSuspectedCellulitis"),
      cs("waLocalizedSkinInfection"),
      cs("waAbscessConcern"),
      cs("waLowSuspicionNecrotizingInfection"),
    ],
    mdmDifferentialSynthesis: [
      cs("diffCellulitis"),
      cs("diffAbscess"),
      cs("diffImpetigo"),
      cs("diffContactDermatitis"),
      cs("diffDvt"),
      cs("diffNecrotizingSoftTissueInfection"),
      cs("diffSepsis"),
    ],
    mdmDataReviewed: [cs("mdmCbcReviewed"), cs("mdmCmpReviewed"), cs("mdmBloodCultureReviewed"), cs("mdmUltrasoundReviewed")],
    mdmRiskStratification: [
      cs("riskLocalizedCellulitisLow"),
      cs("riskOralAntibioticsAppropriateLow"),
      cs("riskIvAntibioticsModerate"),
      cs("riskObservationRequiredModerate"),
      cs("riskSpreadingInfectionHigh"),
      cs("riskSepsisConcernHigh"),
      cs("riskAdmissionRecommendedHigh"),
    ],
    mdmClinicalRationale: [
      cs("reasoningMostConsistentCellulitis"),
      cs("reasoningLowSuspicionNecrotizingInfection"),
      cs("reasoningFindingsNotConsistentWithAbscess"),
      cs("reasoningNoEvidenceSepsis"),
    ],
    clinicalImpression: [cs("impCellulitis"), cs("impLocalizedSkinInfection"), cs("impAbscess")],
    mdmPlanSummary: [
      cs("planAntibioticsPrescribed"),
      cs("planIvAntibioticsAdministered"),
      cs("planWoundCareDiscussed"),
      cs("planReturnPrecautionsDiscussed"),
      cs("planPcpFollowUpRecommended"),
    ],
    mdmAdmitObserveDischarge: [cs("dispObservation"), cs("dispAdmission"), cs("dispDischarge")],
    reassessment: [
      cs("reassessRednessImproved"),
      cs("reassessSwellingImproved"),
      cs("reassessFeverImproved"),
      cs("reassessRemainsHemodynamicallyStable"),
      cs("reassessSymptomsImprovedAfterTreatment"),
    ],
    followUpDisposition: [cs("dispReturnWorseningRednessFeverDrainage"), cs("dispReturnPrecautionsDiscussed")],
  });
}

export function buildAbscessSoftTissueComplaintV1Intel(
  ab: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      ab("hpiSwellingBeganToday"),
      ab("hpiSwellingSeveralDays"),
      ab("hpiPainfulSwelling"),
      ab("hpiPurulentDrainage"),
      ab("hpiPriorAbscess"),
      ab("hpiFever"),
      ab("hpiDiabetes"),
      ab("hpiImmunocompromised"),
      ab("hpiIvDrugUse"),
    ],
    rosImportantPositives: [ab("rosSwelling"), ab("rosPain"), ab("rosDrainage"), ab("rosFever"), ab("rosRedness")],
    rosImportantNegatives: [ab("rosDeniesSpreadingRedness"), ab("rosDeniesSystemicSymptoms")],
    rosRedFlags: [ab("rfNecrotizingConcern"), ab("rfSeverePain"), ab("rfHighFever"), ab("rfHypotension")],
    physicalExam: {
      general: [ab("examWellAppearing"), ab("examNonToxicAppearing")],
      skin: [
        ab("examFluctuancePresent"),
        ab("examSurroundingErythema"),
        ab("examPurulentDrainagePresent"),
        ab("examIndurationPresent"),
        ab("examWarmthPresent"),
      ],
    },
    mdmWorkingAssessment: [ab("waSuspectedAbscess"), ab("waCellulitis"), ab("waNecrotizingInfectionConcern")],
    mdmDifferentialSynthesis: [
      ab("diffAbscess"),
      ab("diffCellulitis"),
      ab("diffInfectedCyst"),
      ab("diffImpetigo"),
      ab("diffNecrotizingSoftTissueInfection"),
      ab("diffSepsis"),
    ],
    mdmDataReviewed: [ab("mdmCbcReviewed"), ab("mdmWoundCultureReviewed"), ab("mdmUltrasoundReviewed")],
    mdmRiskStratification: [
      ab("riskSimpleAbscessLow"),
      ab("riskIncisionDrainageModerate"),
      ab("riskIvAntibioticsModerate"),
      ab("riskNecrotizingConcernHigh"),
      ab("riskAdmissionRecommendedHigh"),
    ],
    mdmClinicalRationale: [
      ab("reasoningMostConsistentAbscess"),
      ab("reasoningLowSuspicionNecrotizingInfection"),
      ab("reasoningNoEvidenceSepsis"),
    ],
    clinicalImpression: [ab("impAbscess"), ab("impCellulitis"), ab("impSkinInfection")],
    mdmPlanSummary: [
      ab("planIncisionDrainagePerformed"),
      ab("planAntibioticsPrescribed"),
      ab("planWoundCareDiscussed"),
      ab("planReturnPrecautionsDiscussed"),
      ab("planSurgicalFollowUpRecommended"),
    ],
    mdmAdmitObserveDischarge: [ab("dispObservation"), ab("dispAdmission"), ab("dispDischarge")],
    reassessment: [
      ab("reassessPainImproved"),
      ab("reassessSwellingImproved"),
      ab("reassessDrainageImproved"),
      ab("reassessSymptomsImprovedAfterTreatment"),
    ],
    followUpDisposition: [ab("dispReturnWorseningPainFeverWoundCare"), ab("dispReturnPrecautionsDiscussed")],
  });
}

export function buildWoundInfectionComplaintV1Intel(
  wi: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      wi("hpiWoundSeveralDays"),
      wi("hpiRecentInjury"),
      wi("hpiRecentSurgery"),
      wi("hpiWoundRedness"),
      wi("hpiWoundPain"),
      wi("hpiPurulentDrainage"),
      wi("hpiFever"),
      wi("hpiForeignBodyConcern"),
      wi("hpiTetanusStatusUnclear"),
    ],
    rosImportantPositives: [wi("rosWoundPain"), wi("rosDrainage"), wi("rosRedness"), wi("rosFever"), wi("rosSwelling")],
    rosImportantNegatives: [wi("rosDeniesForeignBodySensation"), wi("rosDeniesSystemicSymptoms")],
    rosRedFlags: [wi("rfDeepInfectionConcern"), wi("rfJointInvolvementConcern"), wi("rfNecrotizingConcern"), wi("rfHighFever")],
    physicalExam: {
      general: [wi("examWellAppearing"), wi("examNonToxicAppearing")],
      skin: [
        wi("examWoundErythema"),
        wi("examPurulentDrainagePresent"),
        wi("examWoundInduration"),
        wi("examWarmthPresent"),
        wi("examNoFluctuance"),
      ],
    },
    mdmWorkingAssessment: [
      wi("waSuspectedWoundInfection"),
      wi("waSuperficialInfection"),
      wi("waDeepSoftTissueInfectionConcern"),
    ],
    mdmDifferentialSynthesis: [
      wi("diffSuperficialInfection"),
      wi("diffAbscess"),
      wi("diffCellulitis"),
      wi("diffRetainedForeignBody"),
      wi("diffDeepSoftTissueInfection"),
      wi("diffNecrotizingSoftTissueInfection"),
      wi("diffSepsis"),
    ],
    mdmDataReviewed: [wi("mdmCbcReviewed"), wi("mdmWoundCultureReviewed"), wi("mdmImagingReviewed")],
    mdmRiskStratification: [
      wi("riskSuperficialWoundInfectionLow"),
      wi("riskOralAntibioticsModerate"),
      wi("riskIvAntibioticsModerate"),
      wi("riskDeepInfectionHigh"),
      wi("riskAdmissionRecommendedHigh"),
    ],
    mdmClinicalRationale: [
      wi("reasoningMostConsistentSuperficialInfection"),
      wi("reasoningLowSuspicionNecrotizingInfection"),
      wi("reasoningNoEvidenceSepsis"),
    ],
    clinicalImpression: [wi("impWoundInfection"), wi("impCellulitis"), wi("impAbscess")],
    mdmPlanSummary: [
      wi("planAntibioticsPrescribed"),
      wi("planWoundCareDiscussed"),
      wi("planTetanusUpdated"),
      wi("planReturnPrecautionsDiscussed"),
      wi("planSurgicalFollowUpRecommended"),
    ],
    mdmAdmitObserveDischarge: [wi("dispObservation"), wi("dispAdmission"), wi("dispDischarge")],
    reassessment: [
      wi("reassessDrainageImproved"),
      wi("reassessRednessImproved"),
      wi("reassessPainImproved"),
      wi("reassessSymptomsImprovedAfterTreatment"),
    ],
    followUpDisposition: [wi("dispReturnWorseningDrainageFever"), wi("dispReturnPrecautionsDiscussed")],
  });
}
