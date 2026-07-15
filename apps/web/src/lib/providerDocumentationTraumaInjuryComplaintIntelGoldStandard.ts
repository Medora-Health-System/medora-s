/** ME.2N-R Track C — chart-ready trauma / injury complaint intelligence builders. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

function traumaCannotMiss(d: (key: string) => string): string[] {
  return [
    d("diffSubduralHematoma"),
    d("diffEpiduralHematoma"),
    d("diffSubarachnoidHemorrhage"),
    d("diffCervicalSpineFracture"),
    d("diffSpinalCordInjury"),
    d("diffCompartmentSyndrome"),
    d("diffOccultFracture"),
    d("diffSolidOrganInjury"),
  ];
}

function sharedTraumaRos(d: (key: string) => string) {
  return {
    rosImportantPositives: [
      d("rosPain"),
      d("rosSwelling"),
      d("rosBruising"),
      d("rosHeadache"),
      d("rosDizziness"),
      d("rosLossOfConsciousness"),
      d("rosDifficultyAmbulating"),
    ],
    rosImportantNegatives: [
      d("rosDeniesChestPain"),
      d("rosDeniesShortnessOfBreath"),
      d("rosDeniesWeakness"),
      d("rosDeniesNumbness"),
      d("rosDeniesVomiting"),
    ],
    rosRedFlags: [
      d("rfPersistentVomiting"),
      d("rfAlteredMentalStatus"),
      d("rfNeurologicDeficit"),
      d("rfSevereHeadache"),
      d("rfSeizureActivity"),
      d("rfAnticoagulantUse"),
      d("rfInabilityToBearWeight"),
      d("rfSpinalTenderness"),
    ],
  };
}

function sharedTraumaMdm(d: (key: string) => string, extraDiff: string[] = []) {
  return {
    mdmWorkingAssessment: [
      d("waMinorHeadInjury"),
      d("waConcussion"),
      d("waClosedHeadInjury"),
      d("waSoftTissueInjury"),
      d("waContusion"),
      d("waLaceration"),
      d("waMusculoskeletalInjury"),
      d("waBluntTrauma"),
    ],
    mdmDifferentialSynthesis: [
      d("diffContusion"),
      d("diffSprain"),
      d("diffStrain"),
      d("diffFracture"),
      d("diffConcussion"),
      d("diffIntracranialHemorrhage"),
      d("diffCervicalSpineInjury"),
      d("diffInternalInjury"),
      ...extraDiff,
      ...traumaCannotMiss(d),
    ],
    mdmDataReviewed: [
      d("mdmCtHeadReviewed"),
      d("mdmCtCervicalSpineReviewed"),
      d("mdmTraumaImagingReviewed"),
      d("mdmXrayReviewed"),
      d("mdmCbcReviewed"),
      d("mdmCmpReviewed"),
    ],
    mdmRiskStratification: [
      d("riskLowRiskInjury"),
      d("riskModerateRiskInjury"),
      d("riskHighRiskInjury"),
      d("riskAdmissionRecommended"),
    ],
    mdmClinicalRationale: [
      d("reasoningMechanismConsistentMinorInjury"),
      d("reasoningLowSuspicionIntracranialHemorrhage"),
      d("reasoningNeurologicExamReassuring"),
      d("reasoningNoEvidenceSpinalCordInjury"),
      d("reasoningConcernOccultFracture"),
      d("reasoningTraumaImagingReassuring"),
    ],
    clinicalImpression: [
      d("impMinorHeadInjury"),
      d("impConcussion"),
      d("impContusion"),
      d("impBluntTrauma"),
      d("impLaceration"),
    ],
    mdmPlanSummary: [
      d("planWoundCareInstructions"),
      d("planConcussionPrecautions"),
      d("planReturnPrecautions"),
      d("planOrthopedicFollowUp"),
      d("planPrimaryCareFollowUp"),
      d("planEdReturnWorseningSymptoms"),
    ],
  };
}

function sharedTraumaReassessment(d: (key: string) => string) {
  return {
    reassessment: [
      d("reassessPainImproved"),
      d("reassessSymptomsImprovedAfterTreatment"),
      d("reassessRepeatNeurologicExamUnchanged"),
      d("reassessRemainsHemodynamicallyStable"),
      d("reassessAmbulationImproved"),
      d("reassessNoClinicalDeterioration"),
    ],
    followUpDisposition: [
      d("dispReturnPrecautions"),
      d("dispOrthopedicFollowUp"),
      d("dispPrimaryCareFollowUp"),
      d("dispEdReturnWorseningSymptoms"),
    ],
  };
}

function coreTraumaHpi(d: (key: string) => string): string[] {
  return [
    d("hpiFallFromStanding"),
    d("hpiMechanicalFall"),
    d("hpiGroundLevelFall"),
    d("hpiHeadStrikeOccurred"),
    d("hpiLossOfConsciousness"),
    d("hpiBriefLossOfConsciousness"),
    d("hpiNoLossOfConsciousness"),
    d("hpiAmnesiaAfterInjury"),
    d("hpiNeckPainAfterInjury"),
    d("hpiBackPainAfterInjury"),
    d("hpiExtremityPainAfterInjury"),
    d("hpiLacerationPresent"),
    d("hpiAbrasionPresent"),
    d("hpiMotorVehicleCollision"),
    d("hpiRestrainedDriver"),
    d("hpiAirbagDeployment"),
    d("hpiSportsRelatedInjury"),
    d("hpiWorkRelatedInjury"),
    d("hpiAssaultReported"),
    d("hpiDirectBlowToAffectedArea"),
    d("hpiPainWorsenedWithMovement"),
    d("hpiUnableToBearWeight"),
    d("hpiDifficultyAmbulating"),
    d("hpiDeniesAnticoagulantUse"),
    d("hpiDeniesVomiting"),
    d("hpiDeniesSeizureActivity"),
    d("hpiDeniesWeakness"),
    d("hpiDeniesNumbness"),
  ];
}

function coreTraumaExam(d: (key: string) => string) {
  return {
    general: [
      d("examAlertAndOriented"),
      d("examNormalMentalStatus"),
      d("examHemodynamicallyStable"),
    ],
    heent: [
      d("examScalpHematomaPresent"),
      d("examFacialAbrasionPresent"),
      d("examLacerationPresent"),
      d("examEcchymosisPresent"),
      d("examMidlineCervicalTenderness"),
      d("examNoCervicalTenderness"),
    ],
    musculoskeletal: [
      d("examLocalizedTendernessPresent"),
      d("examSwellingPresent"),
      d("examDecreasedRangeOfMotion"),
    ],
    neuroPsych: [
      d("examNormalStrength"),
      d("examNormalSensation"),
      d("examGaitIntact"),
      d("examGaitInstabilityObserved"),
      d("examNoFocalNeurologicDeficit"),
    ],
    skin: [d("examLacerationPresent"), d("examEcchymosisPresent")],
  };
}

function dedupeKeys(keys: string[]): string[] {
  return [...new Set(keys)];
}

function dedupePhysicalExam(physicalExam: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const seen = new Set<string>();
  for (const [section, keys] of Object.entries(physicalExam)) {
    const unique = keys.filter((key) => {
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (unique.length > 0) out[section] = unique;
  }
  return out;
}

function buildTraumaBundle(
  d: (key: string) => string,
  options: {
    hpi: string[];
    physicalExam: Record<string, string[]>;
    extraDifferential?: string[];
    mdmOverrides?: Partial<ReturnType<typeof sharedTraumaMdm>>;
  }
): ProviderDocumentationComplaintIntelligence {
  const mdmBase = sharedTraumaMdm(d, options.extraDifferential ?? []);
  const mdm = {
    ...mdmBase,
    ...options.mdmOverrides,
    mdmDifferentialSynthesis: dedupeKeys([
      ...(options.mdmOverrides?.mdmDifferentialSynthesis ?? mdmBase.mdmDifferentialSynthesis ?? []),
    ]),
  };
  return intel({
    hpi: dedupeKeys(options.hpi),
    ...sharedTraumaRos(d),
    physicalExam: dedupePhysicalExam(options.physicalExam),
    ...mdm,
    mdmAdmitObserveDischarge: [d("dispObservation"), d("dispAdmission"), d("dispDischarge")],
    ...sharedTraumaReassessment(d),
  });
}

export function buildFallComplaintIntel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildTraumaBundle(d, {
    hpi: [
      d("hpiMechanicalFall"),
      d("hpiFallFromStanding"),
      d("hpiGroundLevelFall"),
      d("hpiHeadStrikeOccurred"),
      d("hpiLossOfConsciousness"),
      d("hpiBriefLossOfConsciousness"),
      d("hpiNoLossOfConsciousness"),
      d("hpiNeckPainAfterInjury"),
      d("hpiBackPainAfterInjury"),
      d("hpiExtremityPainAfterInjury"),
      d("hpiPainWorsenedWithMovement"),
      d("hpiUnableToBearWeight"),
      d("hpiDifficultyAmbulating"),
      d("hpiDeniesAnticoagulantUse"),
      d("hpiDeniesVomiting"),
      d("hpiDeniesSeizureActivity"),
      d("hpiDeniesWeakness"),
      d("hpiDeniesNumbness"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      heent: coreTraumaExam(d).heent,
      musculoskeletal: coreTraumaExam(d).musculoskeletal,
      neuroPsych: coreTraumaExam(d).neuroPsych,
    },
    extraDifferential: [d("diffMechanicalFall"), d("diffSyncope")],
  });
}

export function buildHeadInjuryComplaintIntel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildTraumaBundle(d, {
    hpi: [
      d("hpiHeadStrikeOccurred"),
      d("hpiLossOfConsciousness"),
      d("hpiBriefLossOfConsciousness"),
      d("hpiNoLossOfConsciousness"),
      d("hpiAmnesiaAfterInjury"),
      d("hpiDirectBlowToAffectedArea"),
      d("hpiSportsRelatedInjury"),
      d("hpiMotorVehicleCollision"),
      d("hpiDeniesAnticoagulantUse"),
      d("hpiDeniesVomiting"),
      d("hpiDeniesSeizureActivity"),
      d("hpiDeniesWeakness"),
      d("hpiDeniesNumbness"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      heent: coreTraumaExam(d).heent,
      neuroPsych: coreTraumaExam(d).neuroPsych,
    },
    extraDifferential: [d("diffClosedHeadInjury"), d("diffSkullFracture")],
    mdmOverrides: {
      mdmWorkingAssessment: [
        d("waMinorHeadInjury"),
        d("waConcussion"),
        d("waClosedHeadInjury"),
        d("waBluntTrauma"),
      ],
      clinicalImpression: [d("impMinorHeadInjury"), d("impConcussion"), d("impContusion"), d("impBluntTrauma")],
    },
  });
}

export function buildLacerationComplaintIntel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildTraumaBundle(d, {
    hpi: [
      d("hpiLacerationPresent"),
      d("hpiAbrasionPresent"),
      d("hpiDirectBlowToAffectedArea"),
      d("hpiAssaultReported"),
      d("hpiWorkRelatedInjury"),
      d("hpiSportsRelatedInjury"),
      d("hpiDeniesWeakness"),
      d("hpiDeniesNumbness"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      skin: coreTraumaExam(d).skin,
      musculoskeletal: [d("examDecreasedRangeOfMotion"), d("examLocalizedTendernessPresent")],
      neuroPsych: [d("examNormalStrength"), d("examNormalSensation")],
    },
    extraDifferential: [d("diffTendonInjury"), d("diffNerveInjury"), d("diffRetainedForeignBody")],
    mdmOverrides: {
      mdmWorkingAssessment: [d("waLaceration"), d("waSoftTissueInjury"), d("waContusion")],
      clinicalImpression: [d("impLaceration"), d("impContusion"), d("impBluntTrauma")],
    },
  });
}

export function buildFractureConcernComplaintIntel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildTraumaBundle(d, {
    hpi: [
      d("hpiDirectBlowToAffectedArea"),
      d("hpiSportsRelatedInjury"),
      d("hpiWorkRelatedInjury"),
      d("hpiFallFromStanding"),
      d("hpiPainWorsenedWithMovement"),
      d("hpiUnableToBearWeight"),
      d("hpiDifficultyAmbulating"),
      d("hpiDeniesNumbness"),
      d("hpiDeniesWeakness"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      musculoskeletal: [
        d("examLocalizedTendernessPresent"),
        d("examSwellingPresent"),
        d("examDecreasedRangeOfMotion"),
        d("examEcchymosisPresent"),
      ],
      neuroPsych: [d("examNormalStrength"), d("examNormalSensation"), d("examGaitInstabilityObserved")],
    },
    extraDifferential: [d("diffDislocation"), d("diffTendonInjury")],
    mdmOverrides: {
      mdmWorkingAssessment: [d("waMusculoskeletalInjury"), d("waContusion"), d("waBluntTrauma")],
      mdmDataReviewed: [
        d("mdmXrayReviewed"),
        d("mdmTraumaImagingReviewed"),
        d("mdmCbcReviewed"),
        d("mdmCmpReviewed"),
      ],
      clinicalImpression: [d("impContusion"), d("impBluntTrauma")],
    },
  });
}

export function buildMvcCollisionComplaintIntel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildTraumaBundle(d, {
    hpi: [
      d("hpiMotorVehicleCollision"),
      d("hpiRestrainedDriver"),
      d("hpiAirbagDeployment"),
      d("hpiHeadStrikeOccurred"),
      d("hpiLossOfConsciousness"),
      d("hpiNoLossOfConsciousness"),
      d("hpiNeckPainAfterInjury"),
      d("hpiBackPainAfterInjury"),
      d("hpiExtremityPainAfterInjury"),
      d("hpiDeniesAnticoagulantUse"),
      d("hpiDeniesVomiting"),
      d("hpiDeniesWeakness"),
      d("hpiDeniesNumbness"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      heent: coreTraumaExam(d).heent,
      musculoskeletal: coreTraumaExam(d).musculoskeletal,
      neuroPsych: coreTraumaExam(d).neuroPsych,
      cardiovascular: [d("examLocalizedTendernessPresent")],
      abdomen: [d("examLocalizedTendernessPresent")],
    },
    extraDifferential: [d("diffRibInjury"), d("diffIntraAbdominalInjury")],
  });
}

export function buildAssaultTraumaComplaintIntel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildTraumaBundle(d, {
    hpi: [
      d("hpiAssaultReported"),
      d("hpiDirectBlowToAffectedArea"),
      d("hpiHeadStrikeOccurred"),
      d("hpiLossOfConsciousness"),
      d("hpiNoLossOfConsciousness"),
      d("hpiLacerationPresent"),
      d("hpiAbrasionPresent"),
      d("hpiDeniesWeakness"),
      d("hpiDeniesNumbness"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      heent: coreTraumaExam(d).heent,
      skin: coreTraumaExam(d).skin,
      neuroPsych: coreTraumaExam(d).neuroPsych,
    },
    extraDifferential: [d("diffFacialFracture"), d("diffStrangulationInjury")],
  });
}

export function buildNeckPainTraumaComplaintIntel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildTraumaBundle(d, {
    hpi: [
      d("hpiNeckPainAfterInjury"),
      d("hpiMotorVehicleCollision"),
      d("hpiFallFromStanding"),
      d("hpiHeadStrikeOccurred"),
      d("hpiDirectBlowToAffectedArea"),
      d("hpiDeniesWeakness"),
      d("hpiDeniesNumbness"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      heent: [d("examMidlineCervicalTenderness"), d("examNoCervicalTenderness")],
      neuroPsych: coreTraumaExam(d).neuroPsych,
    },
    extraDifferential: [d("diffCervicalStrain"), d("diffRadiculopathy")],
  });
}

export function buildBackPainTraumaComplaintIntel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildTraumaBundle(d, {
    hpi: [
      d("hpiBackPainAfterInjury"),
      d("hpiFallFromStanding"),
      d("hpiMotorVehicleCollision"),
      d("hpiDirectBlowToAffectedArea"),
      d("hpiPainWorsenedWithMovement"),
      d("hpiDifficultyAmbulating"),
      d("hpiDeniesWeakness"),
      d("hpiDeniesNumbness"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      musculoskeletal: [
        d("examLocalizedTendernessPresent"),
        d("examThoracicTendernessPresent"),
        d("examLumbarTendernessPresent"),
      ],
      neuroPsych: coreTraumaExam(d).neuroPsych,
    },
    extraDifferential: [d("diffCaudaEquina"), d("diffVertebralFracture"), d("diffRadiculopathy")],
  });
}

export function buildCrushInjuryComplaintIntel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildTraumaBundle(d, {
    hpi: [
      d("hpiWorkRelatedInjury"),
      d("hpiDirectBlowToAffectedArea"),
      d("hpiExtremityPainAfterInjury"),
      d("hpiUnableToBearWeight"),
      d("hpiDeniesNumbness"),
      d("hpiDeniesWeakness"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      musculoskeletal: [d("examSwellingPresent"), d("examLocalizedTendernessPresent"), d("examEcchymosisPresent")],
      neuroPsych: [d("examNormalStrength"), d("examNormalSensation")],
      skin: [d("examLacerationPresent"), d("examEcchymosisPresent")],
    },
    extraDifferential: [d("diffRhabdomyolysis"), d("diffCrushSyndrome")],
  });
}

export function buildPenetratingInjuryComplaintIntel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildTraumaBundle(d, {
    hpi: [
      d("hpiAssaultReported"),
      d("hpiLacerationPresent"),
      d("hpiDirectBlowToAffectedArea"),
      d("hpiDeniesWeakness"),
      d("hpiDeniesNumbness"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      skin: [d("examLacerationPresent"), d("examEcchymosisPresent")],
      neuroPsych: [d("examNormalStrength"), d("examNormalSensation")],
      abdomen: [d("examLocalizedTendernessPresent")],
      respiratory: [d("examHemodynamicallyStable")],
    },
    extraDifferential: [d("diffVascularInjury"), d("diffPneumothorax")],
  });
}

export function buildBurnInjuryComplaintIntel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildTraumaBundle(d, {
    hpi: [
      d("hpiWorkRelatedInjury"),
      d("hpiDirectBlowToAffectedArea"),
      d("hpiAbrasionPresent"),
      d("hpiDeniesWeakness"),
      d("hpiDeniesNumbness"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      skin: [d("examFacialAbrasionPresent"), d("examEcchymosisPresent"), d("examLacerationPresent")],
    },
    extraDifferential: [d("diffInhalationInjury"), d("diffFullThicknessBurn")],
  });
}

export function buildPediatricTraumaComplaintIntel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildTraumaBundle(d, {
    hpi: [
      d("hpiFallFromStanding"),
      d("hpiGroundLevelFall"),
      d("hpiSportsRelatedInjury"),
      d("hpiHeadStrikeOccurred"),
      d("hpiLossOfConsciousness"),
      d("hpiNoLossOfConsciousness"),
      d("hpiDeniesVomiting"),
      d("hpiDeniesSeizureActivity"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      heent: coreTraumaExam(d).heent,
      musculoskeletal: coreTraumaExam(d).musculoskeletal,
      neuroPsych: coreTraumaExam(d).neuroPsych,
    },
    extraDifferential: [d("diffNonAccidentalTrauma"), d("diffPediatricFracture")],
  });
}

function buildMskTraumaV1Intel(
  d: (key: string) => string,
  options: {
    hpi: string[];
    physicalExam: Record<string, string[]>;
    extraDifferential?: string[];
    mdmOverrides?: Partial<ReturnType<typeof sharedTraumaMdm>>;
  }
): ProviderDocumentationComplaintIntelligence {
  return buildTraumaBundle(d, options);
}

export function buildBackPainComplaintV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildMskTraumaV1Intel(d, {
    hpi: [
      d("hpiBackPainAfterInjury"),
      d("hpiDirectBlowToAffectedArea"),
      d("hpiPainWorsenedWithMovement"),
      d("hpiDifficultyAmbulating"),
      d("hpiDeniesWeakness"),
      d("hpiDeniesNumbness"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      musculoskeletal: [d("examLumbarTendernessPresent"), d("examDecreasedRangeOfMotion")],
      neuroPsych: coreTraumaExam(d).neuroPsych,
    },
    extraDifferential: [d("diffRadiculopathy"), d("diffCaudaEquina")],
  });
}

export function buildNeckPainComplaintV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildMskTraumaV1Intel(d, {
    hpi: [
      d("hpiNeckPainAfterInjury"),
      d("hpiMotorVehicleCollision"),
      d("hpiFallFromStanding"),
      d("hpiDeniesWeakness"),
      d("hpiDeniesNumbness"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      heent: [d("examMidlineCervicalTenderness"), d("examNoCervicalTenderness")],
      neuroPsych: coreTraumaExam(d).neuroPsych,
    },
    extraDifferential: [d("diffCervicalStrain")],
  });
}

export function buildShoulderInjuryComplaintV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildMskTraumaV1Intel(d, {
    hpi: [
      d("hpiDirectBlowToAffectedArea"),
      d("hpiFallFromStanding"),
      d("hpiSportsRelatedInjury"),
      d("hpiPainWorsenedWithMovement"),
      d("hpiDeniesNumbness"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      musculoskeletal: [d("examLocalizedTendernessPresent"), d("examSwellingPresent"), d("examDecreasedRangeOfMotion")],
      neuroPsych: [d("examNormalStrength"), d("examNormalSensation")],
    },
    extraDifferential: [d("diffDislocation"), d("diffRotatorCuffInjury")],
  });
}

export function buildKneeInjuryComplaintV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildMskTraumaV1Intel(d, {
    hpi: [
      d("hpiSportsRelatedInjury"),
      d("hpiFallFromStanding"),
      d("hpiUnableToBearWeight"),
      d("hpiPainWorsenedWithMovement"),
      d("hpiDeniesNumbness"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      musculoskeletal: [d("examSwellingPresent"), d("examLocalizedTendernessPresent"), d("examDecreasedRangeOfMotion")],
      neuroPsych: [d("examGaitInstabilityObserved"), d("examNormalSensation")],
    },
    extraDifferential: [d("diffMeniscalInjury"), d("diffLigamentInjury")],
  });
}

export function buildAnkleFootInjuryComplaintV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildMskTraumaV1Intel(d, {
    hpi: [
      d("hpiFallFromStanding"),
      d("hpiSportsRelatedInjury"),
      d("hpiUnableToBearWeight"),
      d("hpiDifficultyAmbulating"),
      d("hpiDeniesNumbness"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      musculoskeletal: [d("examSwellingPresent"), d("examEcchymosisPresent"), d("examLocalizedTendernessPresent")],
      neuroPsych: [d("examGaitInstabilityObserved"), d("examNormalSensation")],
    },
    extraDifferential: [d("diffLisfrancInjury")],
  });
}

export function buildHipPainInjuryComplaintV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildMskTraumaV1Intel(d, {
    hpi: [
      d("hpiFallFromStanding"),
      d("hpiMechanicalFall"),
      d("hpiUnableToBearWeight"),
      d("hpiDifficultyAmbulating"),
      d("hpiDeniesNumbness"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      musculoskeletal: [d("examLocalizedTendernessPresent"), d("examDecreasedRangeOfMotion")],
      neuroPsych: [d("examGaitInstabilityObserved"), d("examNormalStrength")],
    },
    extraDifferential: [d("diffHipFracture"), d("diffDislocation")],
  });
}

export function buildHandWristInjuryComplaintV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildMskTraumaV1Intel(d, {
    hpi: [
      d("hpiDirectBlowToAffectedArea"),
      d("hpiFallFromStanding"),
      d("hpiLacerationPresent"),
      d("hpiDeniesNumbness"),
      d("hpiDeniesWeakness"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      musculoskeletal: [d("examSwellingPresent"), d("examDecreasedRangeOfMotion")],
      neuroPsych: [d("examNormalStrength"), d("examNormalSensation")],
      skin: [d("examLacerationPresent")],
    },
    extraDifferential: [d("diffTendonInjury")],
  });
}

export function buildFallTraumaComplaintV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildMskTraumaV1Intel(d, {
    hpi: [
      d("hpiFallMechanismHeight"),
      d("hpiMechanicalFall"),
      d("hpiFallFromStanding"),
      d("hpiGroundLevelFall"),
      d("hpiHeadStrikeOccurred"),
      d("hpiLossOfConsciousness"),
      d("hpiNoLossOfConsciousness"),
      d("hpiNeckPainAfterInjury"),
      d("hpiBackPainAfterInjury"),
      d("hpiExtremityPainAfterInjury"),
      d("hpiDeniesAnticoagulantUse"),
      d("hpiDeniesVomiting"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      heent: coreTraumaExam(d).heent,
      musculoskeletal: coreTraumaExam(d).musculoskeletal,
      neuroPsych: coreTraumaExam(d).neuroPsych,
    },
    extraDifferential: [d("diffSyncope")],
  });
}

export function buildMinorHeadInjuryComplaintV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildMskTraumaV1Intel(d, {
    hpi: [
      d("hpiHeadStrikeOccurred"),
      d("hpiLossOfConsciousness"),
      d("hpiBriefLossOfConsciousness"),
      d("hpiNoLossOfConsciousness"),
      d("hpiAmnesiaAfterInjury"),
      d("hpiDeniesAnticoagulantUse"),
      d("hpiDeniesVomiting"),
      d("hpiDeniesSeizureActivity"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      heent: coreTraumaExam(d).heent,
      neuroPsych: coreTraumaExam(d).neuroPsych,
    },
    extraDifferential: [d("diffClosedHeadInjury")],
    mdmOverrides: {
      clinicalImpression: [d("impMinorHeadInjury"), d("impConcussion"), d("impContusion")],
    },
  });
}

export function buildLacerationSoftTissueComplaintV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildMskTraumaV1Intel(d, {
    hpi: [
      d("hpiLacerationPresent"),
      d("hpiAbrasionPresent"),
      d("hpiAssaultReported"),
      d("hpiWorkRelatedInjury"),
      d("hpiDeniesNumbness"),
      d("hpiDeniesWeakness"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      skin: coreTraumaExam(d).skin,
      musculoskeletal: [d("examLocalizedTendernessPresent")],
      neuroPsych: [d("examNormalStrength"), d("examNormalSensation")],
    },
    extraDifferential: [d("diffTendonInjury"), d("diffNerveInjury")],
    mdmOverrides: {
      mdmWorkingAssessment: [d("waLaceration"), d("waSoftTissueInjury")],
      clinicalImpression: [d("impLaceration"), d("impContusion")],
    },
  });
}

export function buildAnimalBiteAdultComplaintV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildMskTraumaV1Intel(d, {
    hpi: [
      d("hpiBiteDog"),
      d("hpiBiteCat"),
      d("hpiBiteHuman"),
      d("hpiBiteUnknownAnimal"),
      d("hpiBiteWildAnimal"),
      d("hpiBiteOther"),
      d("hpiBiteTimeKnown"),
      d("hpiBiteProvoked"),
      d("hpiBiteUnprovoked"),
      d("hpiBiteDomesticAnimal"),
      d("hpiBiteStrayWild"),
      d("hpiAnimalVaccinationStatusKnown"),
      d("hpiAnimalVaccinationStatusUnknown"),
      d("hpiRabiesRiskConcern"),
      d("hpiTetanusUpToDate"),
      d("hpiTetanusStatusUnknown"),
      d("hpiImmunocompromisedOrDiabetes"),
      d("hpiWoundPuncture"),
      d("hpiWoundLaceration"),
      d("hpiWoundAbrasion"),
      d("hpiWoundCrush"),
      d("hpiWoundDeep"),
      d("hpiForeignBodyConcern"),
      d("hpiInfectionSignsPresent"),
      d("hpiBiteLocationScalpHead"),
      d("hpiBiteLocationFace"),
      d("hpiBiteLocationEyePeriorbital"),
      d("hpiBiteLocationEar"),
      d("hpiBiteLocationNose"),
      d("hpiBiteLocationMouthLip"),
      d("hpiBiteLocationNeck"),
      d("hpiBiteLocationShoulder"),
      d("hpiBiteLocationUpperArm"),
      d("hpiBiteLocationElbow"),
      d("hpiBiteLocationForearm"),
      d("hpiBiteLocationWrist"),
      d("hpiBiteLocationHandFinger"),
      d("hpiBiteLocationChest"),
      d("hpiBiteLocationAbdomen"),
      d("hpiBiteLocationBack"),
      d("hpiBiteLocationButtock"),
      d("hpiBiteLocationHip"),
      d("hpiBiteLocationThigh"),
      d("hpiBiteLocationKnee"),
      d("hpiBiteLocationLowerLeg"),
      d("hpiBiteLocationAnkle"),
      d("hpiBiteLocationFootToe"),
      d("hpiBiteLocationMultipleSites"),
      d("hpiBiteLocationUnspecified"),
      d("hpiDeniesNumbness"),
      d("hpiDeniesWeakness"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      heent: [d("examLacerationPresent"), d("examFacialAbrasionPresent"), d("examEcchymosisPresent")],
      skin: [
        d("examBiteWoundPresent"),
        d("examPunctureWoundPresent"),
        d("examWoundIrrigated"),
        d("examInfectionSignsPresent"),
        d("examNoInfectionSigns"),
      ],
      musculoskeletal: [
        d("examLocalizedTendernessPresent"),
        d("examSwellingPresent"),
        d("examTendonJointConcern"),
        d("examDecreasedRangeOfMotion"),
      ],
      neuroPsych: [
        d("examNeurovascularIntact"),
        d("examNormalStrength"),
        d("examNormalSensation"),
        d("examNoFocalNeurologicDeficit"),
      ],
    },
    extraDifferential: [
      d("diffRabiesExposure"),
      d("diffDeepSoftTissueInfection"),
      d("diffTendonInjury"),
      d("diffNerveInjury"),
      d("diffRetainedForeignBody"),
      d("diffCellulitis"),
    ],
    mdmOverrides: {
      mdmWorkingAssessment: [
        d("waAnimalBite"),
        d("waDogBite"),
        d("waCatBite"),
        d("waHumanBite"),
        d("waSoftTissueInjury"),
      ],
      clinicalImpression: [
        d("impAnimalBite"),
        d("impDogBite"),
        d("impCatBite"),
        d("impHumanBite"),
        d("impOpenBiteWound"),
      ],
      mdmPlanSummary: [
        d("planWoundIrrigationCleansing"),
        d("planWoundClosureDecision"),
        d("planTetanusUpdate"),
        d("planRabiesRiskAssessment"),
        d("planAntibioticsDecision"),
        d("planImagingDecision"),
        d("planAnimalControlReporting"),
        d("planWoundCareInstructions"),
        d("planFollowUp24To48Hours"),
        d("planReturnPrecautions"),
        d("planEdReturnWorseningSymptoms"),
      ],
      mdmDataReviewed: [
        d("mdmXrayReviewed"),
        d("mdmWoundCarePlanReviewed"),
        d("mdmTetanusStatusReviewed"),
        d("mdmRabiesRiskReviewed"),
      ],
      mdmClinicalRationale: [
        d("reasoningHighRiskBiteWound"),
        d("reasoningCatBiteInfectionRisk"),
        d("reasoningHumanBiteInfectionRisk"),
        d("reasoningRabiesRiskLow"),
        d("reasoningRabiesRiskElevated"),
        d("reasoningNeurovascularExamReassuring"),
      ],
      mdmRiskStratification: [
        d("riskLowRiskBiteWound"),
        d("riskModerateRiskBiteWound"),
        d("riskHighRiskBiteWound"),
        d("riskAdmissionRecommended"),
      ],
    },
  });
}

/**
 * Fracture (adult) — single provider documentation template covering all body regions.
 * Region emphasis is not baked into fixed sub-templates; `adaptFractureComplaintIntel`
 * (see `fractureClinicalIntelligence.ts`) reorders these same chips by resolved region.
 */
export function buildFractureAdultComplaintV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildMskTraumaV1Intel(d, {
    hpi: [
      d("hpiMechanismDirectBlow"),
      d("hpiMechanismFallFromStanding"),
      d("hpiMechanismFallFromHeight"),
      d("hpiMechanismMotorVehicleCollision"),
      d("hpiMechanismSportsRelated"),
      d("hpiMechanismCrushInjury"),
      d("hpiMechanismTwistingInjury"),
      d("hpiMechanismAssault"),
      d("hpiMechanismWorkRelated"),
      d("hpiPainWorsenedWithMovement"),
      d("hpiUnableToBearWeight"),
      d("hpiDeformityNoted"),
      d("hpiSwellingNoted"),
      d("hpiOpenWoundAtFractureSite"),
      d("hpiNumbnessDistalToInjury"),
      d("hpiTinglingDistalToInjury"),
      d("hpiColorChangeDistalToInjury"),
      d("hpiHandDominanceRight"),
      d("hpiHandDominanceLeft"),
      d("hpiSplintAppliedPriorToArrival"),
      d("hpiSelfReducedPriorToArrival"),
      d("hpiPriorFractureSameSite"),
      d("hpiAnticoagulantUseNoted"),
      d("hpiDeniesLossOfConsciousness"),
      d("hpiSiteSkull"),
      d("hpiSiteFacial"),
      d("hpiSiteOrbital"),
      d("hpiSiteNasal"),
      d("hpiSiteMandible"),
      d("hpiSiteCervicalSpine"),
      d("hpiSiteShoulderClavicle"),
      d("hpiSiteUpperArmHumerus"),
      d("hpiSiteElbow"),
      d("hpiSiteForearmWrist"),
      d("hpiSiteHand"),
      d("hpiSiteFinger"),
      d("hpiSiteThoracicSpine"),
      d("hpiSiteRib"),
      d("hpiSiteSternum"),
      d("hpiSiteLumbarSpine"),
      d("hpiSitePelvis"),
      d("hpiSiteHip"),
      d("hpiSiteFemur"),
      d("hpiSiteKnee"),
      d("hpiSiteTibiaFibula"),
      d("hpiSiteAnkle"),
      d("hpiSiteFoot"),
      d("hpiSiteToe"),
      d("hpiVisionChangesNoted"),
      d("hpiDiplopiaNoted"),
      d("hpiMalocclusionNoted"),
      d("hpiBowelBladderDysfunctionNoted"),
      d("hpiSaddleAnesthesiaNoted"),
      d("hpiShortnessOfBreathNoted"),
      d("hpiPediatricGrowthPlateConcern"),
    ],
    physicalExam: {
      general: [d("examAlertAndOriented"), d("examHemodynamicallyStable"), d("examNoAcuteDistress")],
      heent: [
        d("examScalpHematomaPresent"),
        d("examFacialAsymmetryPresent"),
        d("examPeriorbitalEcchymosisPresent"),
        d("examExtraocularMovementsIntact"),
        d("examVisualAcuityGrosslyIntact"),
        d("examNasalDeformityPresent"),
        d("examMalocclusionPresent"),
        d("examMidlineCervicalTenderness"),
        d("examNoCervicalTenderness"),
      ],
      musculoskeletal: [
        d("examDeformityPresent"),
        d("examSwellingPresent"),
        d("examEcchymosisPresent"),
        d("examLocalizedTendernessPresent"),
        d("examDecreasedRangeOfMotion"),
        d("examCrepitusPresent"),
        d("examSplintAppliedInEd"),
        d("examJointAboveBelowFractureExamined"),
      ],
      neuroPsych: [
        d("examDistalPulsesIntact"),
        d("examCapillaryRefillNormal"),
        d("examSensationIntactDistally"),
        d("examMotorFunctionIntactDistally"),
        d("examCompartmentSoftAndNonTender"),
        d("examNoFocalNeurologicDeficit"),
        d("examSaddleAnesthesiaAbsent"),
      ],
      skin: [d("examOpenWoundPresent"), d("examWoundContaminationEvaluated"), d("examSkinIntactOverFractureSite")],
      respiratory: [d("examChestWallTendernessPresent"), d("examNoParadoxicalMovement"), d("examLungsClearBilaterally")],
      abdomen: [d("examAbdomenSoft"), d("examPelvicStabilityEvaluated")],
    },
    extraDifferential: [
      d("diffOpenFracture"),
      d("diffDislocation"),
      d("diffGrowthPlateInjuryPediatric"),
      d("diffNeurovascularInjury"),
    ],
    mdmOverrides: {
      mdmWorkingAssessment: [
        d("waClosedFracture"),
        d("waOpenFracture"),
        d("waMusculoskeletalInjury"),
        d("waBluntTrauma"),
        d("waPathologicFractureConcern"),
        d("waStressFractureConcern"),
      ],
      clinicalImpression: [
        d("impClosedFracture"),
        d("impOpenFracture"),
        d("impBluntTrauma"),
        d("impPathologicFractureConcern"),
      ],
      mdmPlanSummary: [
        d("planImmobilizationSplintCast"),
        d("planReductionPerformed"),
        d("planNeurovascularReassessmentAfterSplinting"),
        d("planPainControlProvided"),
        d("planWeightBearingInstructions"),
        d("planOrthopedicFollowUp"),
        d("planReturnPrecautions"),
        d("planEdReturnWorseningSymptoms"),
        d("planOrthopedicConsultRequested"),
        d("planNeurosurgeryConsultRequested"),
        d("planMaxillofacialConsultRequested"),
        d("planHandSurgeryConsultRequested"),
      ],
      mdmClinicalRationale: [
        d("reasoningMechanismConsistentFracturePattern"),
        d("reasoningNeurovascularExamReassuring"),
        d("reasoningCompartmentSyndromeLowConcern"),
        d("reasoningConcernOccultFracture"),
        d("reasoningTraumaImagingReassuring"),
        d("reasoningSurgicalFixationLikelyNeeded"),
      ],
    },
  });
}

export function buildConcussionFollowupComplaintV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return buildTraumaBundle(d, {
    hpi: [
      d("hpiHeadStrikeOccurred"),
      d("hpiAmnesiaAfterInjury"),
      d("hpiLossOfConsciousness"),
      d("hpiNoLossOfConsciousness"),
      d("hpiSportsRelatedInjury"),
      d("hpiDeniesVomiting"),
      d("hpiDeniesSeizureActivity"),
    ],
    physicalExam: {
      general: coreTraumaExam(d).general,
      neuroPsych: coreTraumaExam(d).neuroPsych,
    },
    extraDifferential: [d("diffPostConcussiveSyndrome")],
    mdmOverrides: {
      mdmWorkingAssessment: [d("waConcussion"), d("waMinorHeadInjury")],
      clinicalImpression: [d("impConcussion"), d("impMinorHeadInjury")],
      mdmPlanSummary: [
        d("planConcussionPrecautions"),
        d("planReturnPrecautions"),
        d("planPrimaryCareFollowUp"),
        d("planEdReturnWorseningSymptoms"),
      ],
    },
  });
}

/**
 * Dislocation (adult) — single provider documentation template covering all joints.
 * Region emphasis via `adaptDislocationComplaintIntel` (display ordering only).
 */
export function buildDislocationAdultComplaintV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return buildMskTraumaV1Intel(d, {
    hpi: [
      d("hpiMechanismDirectBlow"),
      d("hpiMechanismFallFromStanding"),
      d("hpiMechanismFallFromHeight"),
      d("hpiMechanismSportsRelated"),
      d("hpiMechanismTwistingInjury"),
      d("hpiMechanismAssault"),
      d("hpiDeformityNoted"),
      d("hpiSwellingNoted"),
      d("hpiUnableToBearWeight"),
      d("hpiNumbnessDistalToInjury"),
      d("hpiTinglingDistalToInjury"),
      d("hpiColorChangeDistalToInjury"),
      d("hpiHandDominanceRight"),
      d("hpiHandDominanceLeft"),
      d("hpiSelfReducedPriorToArrival"),
      d("hpiReductionAttemptedPriorToArrival"),
      d("hpiRecurrentDislocationHistory"),
      d("hpiPriorDislocationSameJoint"),
      d("hpiProstheticJointPresent"),
      d("hpiSiteJawTmj"),
      d("hpiSiteShoulder"),
      d("hpiSiteAcromioclavicular"),
      d("hpiSiteSternoclavicular"),
      d("hpiSiteElbow"),
      d("hpiSiteRadialHead"),
      d("hpiSiteWrist"),
      d("hpiSiteHand"),
      d("hpiSiteFinger"),
      d("hpiSiteThumb"),
      d("hpiSiteHip"),
      d("hpiSitePatella"),
      d("hpiSiteKnee"),
      d("hpiSiteAnkle"),
      d("hpiSiteFoot"),
      d("hpiSiteToe"),
      d("hpiLateralityRight"),
      d("hpiLateralityLeft"),
      d("hpiMalocclusionNoted"),
      d("hpiNursemaidElbowMechanism"),
    ],
    physicalExam: {
      general: [d("examAlertAndOriented"), d("examHemodynamicallyStable"), d("examNoAcuteDistress")],
      heent: [d("examMalocclusionPresent"), d("examJawDeviationPresent"), d("examNoCervicalTenderness")],
      musculoskeletal: [
        d("examDeformityPresent"),
        d("examSwellingPresent"),
        d("examEcchymosisPresent"),
        d("examLocalizedTendernessPresent"),
        d("examDecreasedRangeOfMotion"),
        d("examJointUnstable"),
        d("examJointReducedInEd"),
        d("examImmobilizationAppliedInEd"),
        d("examJointAboveBelowExamined"),
      ],
      neuroPsych: [
        d("examDistalPulsesIntact"),
        d("examCapillaryRefillNormal"),
        d("examSensationIntactDistally"),
        d("examMotorFunctionIntactDistally"),
        d("examNeurovascularIntactAfterReduction"),
        d("examNoFocalNeurologicDeficit"),
      ],
      skin: [d("examSkinIntactOverJoint"), d("examOpenWoundPresent")],
    },
    extraDifferential: [
      d("diffFractureDislocation"),
      d("diffFracture"),
      d("diffNeurovascularInjury"),
      d("diffLigamentInjury"),
    ],
    mdmOverrides: {
      mdmWorkingAssessment: [
        d("waJointDislocation"),
        d("waReducedDislocation"),
        d("waUnreducedDislocation"),
        d("waRecurrentDislocation"),
        d("waNursemaidElbow"),
        d("waMusculoskeletalInjury"),
      ],
      clinicalImpression: [
        d("impJointDislocation"),
        d("impReducedDislocation"),
        d("impFractureDislocationConcern"),
      ],
      mdmPlanSummary: [
        d("planReductionPerformed"),
        d("planReductionSuccessful"),
        d("planReductionUnsuccessful"),
        d("planNeurovascularReassessmentAfterReduction"),
        d("planImmobilizationSplintSling"),
        d("planPainControlProvided"),
        d("planOrthopedicFollowUp"),
        d("planOrthopedicConsultRequested"),
        d("planHandSurgeryConsultRequested"),
        d("planMaxillofacialConsultRequested"),
        d("planReturnPrecautions"),
        d("planEdReturnWorseningSymptoms"),
      ],
      mdmClinicalRationale: [
        d("reasoningMechanismConsistentDislocation"),
        d("reasoningNeurovascularExamReassuring"),
        d("reasoningReductionSuccessfulStable"),
        d("reasoningConcernAssociatedFracture"),
        d("reasoningUrgentOrthopedicCareNeeded"),
      ],
    },
  });
}

/**
 * Sprain / strain (adult) — single provider documentation template covering all regions.
 * Region emphasis via `adaptSprainStrainComplaintIntel` (display ordering only).
 */
export function buildSprainStrainAdultComplaintV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return buildMskTraumaV1Intel(d, {
    hpi: [
      d("hpiMechanismTwistingInjury"),
      d("hpiMechanismSportsRelated"),
      d("hpiMechanismFallFromStanding"),
      d("hpiMechanismDirectBlow"),
      d("hpiMechanismWorkRelated"),
      d("hpiPainWorsenedWithMovement"),
      d("hpiUnableToBearWeight"),
      d("hpiSwellingNoted"),
      d("hpiGivingWaySensation"),
      d("hpiPopHeardAtInjury"),
      d("hpiNumbnessDistalToInjury"),
      d("hpiSiteCervical"),
      d("hpiSiteThoracic"),
      d("hpiSiteLumbar"),
      d("hpiSiteShoulder"),
      d("hpiSiteRotatorCuff"),
      d("hpiSiteElbow"),
      d("hpiSiteWrist"),
      d("hpiSiteHand"),
      d("hpiSiteFinger"),
      d("hpiSiteThumb"),
      d("hpiSiteHip"),
      d("hpiSiteGroin"),
      d("hpiSiteThigh"),
      d("hpiSiteHamstring"),
      d("hpiSiteQuadriceps"),
      d("hpiSiteKnee"),
      d("hpiSiteAnkle"),
      d("hpiSiteFoot"),
      d("hpiSiteToe"),
      d("hpiSiteChestWall"),
      d("hpiSiteAbdominalWall"),
      d("hpiLateralityRight"),
      d("hpiLateralityLeft"),
      d("hpiBowelBladderDysfunctionNoted"),
      d("hpiSaddleAnesthesiaNoted"),
    ],
    physicalExam: {
      general: [d("examAlertAndOriented"), d("examHemodynamicallyStable"), d("examNoAcuteDistress")],
      heent: [d("examMidlineCervicalTenderness"), d("examNoCervicalTenderness")],
      musculoskeletal: [
        d("examSwellingPresent"),
        d("examEcchymosisPresent"),
        d("examLocalizedTendernessPresent"),
        d("examDecreasedRangeOfMotion"),
        d("examJointStable"),
        d("examJointUnstable"),
        d("examLigamentLaxityPresent"),
        d("examBraceAppliedInEd"),
        d("examWeightBearingAsTolerated"),
        d("examUnableToBearWeight"),
      ],
      neuroPsych: [
        d("examDistalPulsesIntact"),
        d("examSensationIntactDistally"),
        d("examMotorFunctionIntactDistally"),
        d("examNoFocalNeurologicDeficit"),
        d("examSaddleAnesthesiaAbsent"),
      ],
      respiratory: [d("examChestWallTendernessPresent"), d("examLungsClearBilaterally")],
      abdomen: [d("examAbdomenSoft"), d("examAbdominalWallTendernessPresent")],
    },
    extraDifferential: [
      d("diffFracture"),
      d("diffDislocation"),
      d("diffLigamentInjury"),
      d("diffOccultFracture"),
      d("diffCompartmentSyndrome"),
    ],
    mdmOverrides: {
      mdmWorkingAssessment: [
        d("waSprain"),
        d("waStrain"),
        d("waLigamentInjury"),
        d("waMusculoskeletalInjury"),
        d("waSoftTissueInjury"),
      ],
      clinicalImpression: [d("impSprain"), d("impStrain"), d("impLigamentInjury")],
      mdmPlanSummary: [
        d("planRiceInstructions"),
        d("planBraceOrWrapApplied"),
        d("planWeightBearingInstructions"),
        d("planActivityRestriction"),
        d("planPainControlProvided"),
        d("planOrthopedicFollowUp"),
        d("planPrimaryCareFollowUp"),
        d("planHandSurgeryConsultRequested"),
        d("planReturnPrecautions"),
        d("planEdReturnWorseningSymptoms"),
      ],
      mdmClinicalRationale: [
        d("reasoningMechanismConsistentSprainStrain"),
        d("reasoningNeurovascularExamReassuring"),
        d("reasoningJointStableOnExam"),
        d("reasoningConcernOccultFracture"),
        d("reasoningOutpatientManagementAppropriate"),
      ],
    },
  });
}

/**
 * Tendon injury / rupture (adult) — single adaptive provider documentation template.
 * Region emphasis via `adaptTendonComplaintIntel` (display ordering only).
 */
export function buildTendonInjuryAdultComplaintV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return buildMskTraumaV1Intel(d, {
    hpi: [
      d("hpiMechanismSportsRelated"),
      d("hpiMechanismDirectBlow"),
      d("hpiMechanismFallFromStanding"),
      d("hpiSuddenPopAtInjury"),
      d("hpiPopHeardAtInjury"),
      d("hpiWeaknessWithResistedMotion"),
      d("hpiInabilityToPlantarflex"),
      d("hpiInabilityToExtendKnee"),
      d("hpiInabilityToFlexFinger"),
      d("hpiInabilityToExtendFinger"),
      d("hpiUnableToBearWeight"),
      d("hpiSwellingNoted"),
      d("hpiNumbnessDistalToInjury"),
      d("hpiSiteRotatorCuff"),
      d("hpiSiteBicepsTendon"),
      d("hpiSiteTricepsTendon"),
      d("hpiSiteExtensorTendon"),
      d("hpiSiteFlexorTendon"),
      d("hpiSiteMalletFinger"),
      d("hpiSiteFinger"),
      d("hpiSiteHand"),
      d("hpiSiteAchilles"),
      d("hpiSitePatellarTendon"),
      d("hpiSiteQuadriceps"),
      d("hpiSiteHamstring"),
      d("hpiSiteAnkle"),
      d("hpiSiteFoot"),
      d("hpiSiteShoulder"),
      d("hpiLateralityRight"),
      d("hpiLateralityLeft"),
    ],
    physicalExam: {
      general: [d("examAlertAndOriented"), d("examHemodynamicallyStable"), d("examNoAcuteDistress")],
      musculoskeletal: [
        d("examSwellingPresent"),
        d("examEcchymosisPresent"),
        d("examLocalizedTendernessPresent"),
        d("examPalpableTendonGap"),
        d("examThompsonTestPositive"),
        d("examThompsonTestNegative"),
        d("examWeakResistedPlantarflexion"),
        d("examExtensorLagPresent"),
        d("examFlexorTendonIntegrityIntact"),
        d("examExtensorTendonIntegrityIntact"),
        d("examRotatorCuffStrengthWeak"),
        d("examPopeyeDeformityPresent"),
        d("examDecreasedRangeOfMotion"),
        d("examUnableToBearWeight"),
        d("examBraceAppliedInEd"),
      ],
      neuroPsych: [
        d("examDistalPulsesIntact"),
        d("examSensationIntactDistally"),
        d("examMotorFunctionIntactDistally"),
        d("examNoFocalNeurologicDeficit"),
      ],
      skin: [d("examSkinIntactOverJoint"), d("examOpenWoundPresent")],
    },
    extraDifferential: [
      d("diffTendonRupture"),
      d("diffFracture"),
      d("diffLigamentInjury"),
      d("diffOccultFracture"),
      d("diffCompartmentSyndrome"),
    ],
    mdmOverrides: {
      mdmWorkingAssessment: [
        d("waTendonInjury"),
        d("waTendonRupture"),
        d("waPartialTendonTear"),
        d("waCompleteTendonRupture"),
        d("waMalletFinger"),
        d("waMusculoskeletalInjury"),
      ],
      clinicalImpression: [d("impTendonInjury"), d("impTendonRupture"), d("impMalletFinger")],
      mdmPlanSummary: [
        d("planTendonSplintProtocol"),
        d("planBraceOrWrapApplied"),
        d("planNonWeightBearingAsDirected"),
        d("planWeightBearingInstructions"),
        d("planActivityRestriction"),
        d("planPainControlProvided"),
        d("planOrthopedicFollowUp"),
        d("planHandSurgeryConsultRequested"),
        d("planSportsMedicineFollowUp"),
        d("planReturnPrecautions"),
        d("planEdReturnWorseningSymptoms"),
      ],
      mdmClinicalRationale: [
        d("reasoningMechanismConsistentTendonInjury"),
        d("reasoningFunctionalDeficitConsistentWithTear"),
        d("reasoningNeurovascularExamReassuring"),
        d("reasoningOutpatientManagementAppropriate"),
      ],
    },
  });
}

/**
 * Ligament injury / tear (adult) — single adaptive provider documentation template.
 * Region emphasis via `adaptLigamentComplaintIntel` (display ordering only).
 */
export function buildLigamentInjuryAdultComplaintV1Intel(
  d: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return buildMskTraumaV1Intel(d, {
    hpi: [
      d("hpiMechanismTwistingInjury"),
      d("hpiMechanismSportsRelated"),
      d("hpiMechanismDirectBlow"),
      d("hpiHearingPopAtInjury"),
      d("hpiGivingWayInstability"),
      d("hpiImmediateSwelling"),
      d("hpiUnableToBearWeight"),
      d("hpiPainWorsenedWithMovement"),
      d("hpiNumbnessDistalToInjury"),
      d("hpiSiteAcl"),
      d("hpiSitePcl"),
      d("hpiSiteMcl"),
      d("hpiSiteLcl"),
      d("hpiSiteKnee"),
      d("hpiSiteAnkleLateralLigament"),
      d("hpiSiteSyndesmosis"),
      d("hpiSiteThumbUcl"),
      d("hpiSiteScapholunate"),
      d("hpiSiteWrist"),
      d("hpiSiteFinger"),
      d("hpiSiteElbow"),
      d("hpiSiteShoulder"),
      d("hpiSiteCervical"),
      d("hpiSiteLumbar"),
      d("hpiLateralityRight"),
      d("hpiLateralityLeft"),
    ],
    physicalExam: {
      general: [d("examAlertAndOriented"), d("examHemodynamicallyStable"), d("examNoAcuteDistress")],
      musculoskeletal: [
        d("examSwellingPresent"),
        d("examJointEffusionPresent"),
        d("examEcchymosisPresent"),
        d("examLocalizedTendernessPresent"),
        d("examJointStable"),
        d("examJointUnstable"),
        d("examLigamentLaxityPresent"),
        d("examLachmanPositive"),
        d("examAnteriorDrawerPositive"),
        d("examPivotShiftPositive"),
        d("examValgusStressPositive"),
        d("examVarusStressPositive"),
        d("examExternalRotationStressPositive"),
        d("examThumbUclLaxityPresent"),
        d("examAnkleAnteriorDrawerPositive"),
        d("examDecreasedRangeOfMotion"),
        d("examBraceAppliedInEd"),
        d("examUnableToBearWeight"),
        d("examWeightBearingAsTolerated"),
      ],
      neuroPsych: [
        d("examDistalPulsesIntact"),
        d("examSensationIntactDistally"),
        d("examMotorFunctionIntactDistally"),
        d("examNoFocalNeurologicDeficit"),
      ],
    },
    extraDifferential: [
      d("diffAclTear"),
      d("diffSyndesmoticInjury"),
      d("diffThumbUclInjury"),
      d("diffFracture"),
      d("diffDislocation"),
      d("diffOccultFracture"),
    ],
    mdmOverrides: {
      mdmWorkingAssessment: [
        d("waLigamentTear"),
        d("waAclInjury"),
        d("waAnkleLigamentInjury"),
        d("waThumbUclInjury"),
        d("waSyndesmoticInjury"),
        d("waLigamentInjury"),
        d("waMusculoskeletalInjury"),
      ],
      clinicalImpression: [d("impLigamentTear"), d("impAclInjury"), d("impSyndesmoticInjury"), d("impLigamentInjury")],
      mdmPlanSummary: [
        d("planBraceImmobilization"),
        d("planBraceOrWrapApplied"),
        d("planProtectedWeightBearing"),
        d("planWeightBearingInstructions"),
        d("planRiceInstructions"),
        d("planActivityRestriction"),
        d("planPainControlProvided"),
        d("planOrthopedicFollowUp"),
        d("planSportsMedicineFollowUp"),
        d("planHandSurgeryConsultRequested"),
        d("planReturnPrecautions"),
        d("planEdReturnWorseningSymptoms"),
      ],
      mdmClinicalRationale: [
        d("reasoningMechanismConsistentLigamentInjury"),
        d("reasoningInstabilityOnExam"),
        d("reasoningNeurovascularExamReassuring"),
        d("reasoningOutpatientManagementAppropriate"),
      ],
    },
  });
}

export function buildCrushInjuryAdultComplaintV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildMskTraumaV1Intel(d, {
    hpi: [d("hpiMechanismCrushInjury"), d("hpiMechanismWorkRelated"), d("hpiExtremityPainAfterInjury"), d("hpiSwellingNoted"), d("hpiNumbnessDistalToInjury"), d("hpiColorChangeDistalToInjury")],
    physicalExam: { general: [d("examHemodynamicallyStable")], musculoskeletal: [d("examSwellingPresent"), d("examEcchymosisPresent"), d("examLocalizedTendernessPresent"), d("examCompartmentSoftAndNonTender")], neuroPsych: [d("examDistalPulsesIntact"), d("examSensationIntactDistally"), d("examMotorFunctionIntactDistally")], skin: [d("examOpenWoundPresent"), d("examWoundContaminationEvaluated")] },
    extraDifferential: [d("diffCompartmentSyndrome"), d("diffRhabdomyolysis"), d("diffFracture"), d("diffVascularInjury")],
    mdmOverrides: { mdmWorkingAssessment: [d("waCrushInjury"), d("waSoftTissueInjury")], clinicalImpression: [d("impCrushInjury")], mdmPlanSummary: [d("planSerialCompartmentChecks"), d("planRhabdomyolysisMonitoring"), d("planOrthopedicConsultRequested"), d("planReturnPrecautions")], mdmClinicalRationale: [d("reasoningCompartmentSyndromeRisk"), d("reasoningRhabdomyolysisRisk"), d("reasoningNeurovascularExamReassuring")] },
  });
}

export function buildTraumaticAmputationAdultComplaintV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildMskTraumaV1Intel(d, {
    hpi: [d("hpiMechanismCrushInjury"), d("hpiMechanismDirectBlow"), d("hpiSiteFinger"), d("hpiSiteThumb"), d("hpiSiteToe"), d("hpiHandDominanceRight"), d("hpiHandDominanceLeft")],
    physicalExam: { general: [d("examHemodynamicallyStable")], musculoskeletal: [d("examDeformityPresent"), d("examLocalizedTendernessPresent")], neuroPsych: [d("examDistalPulsesIntact"), d("examSensationIntactDistally")], skin: [d("examOpenWoundPresent"), d("examWoundContaminationEvaluated")] },
    extraDifferential: [d("diffVascularInjury"), d("diffOpenFracture"), d("diffNerveInjury")],
    mdmOverrides: { mdmWorkingAssessment: [d("waTraumaticAmputation"), d("waOpenFracture")], clinicalImpression: [d("impTraumaticAmputation")], mdmPlanSummary: [d("planHemorrhageControl"), d("planTetanusUpdate"), d("planReplantationPreservation"), d("planHandSurgeryConsultRequested")], mdmClinicalRationale: [d("reasoningReplantationTimeSensitive"), d("reasoningUrgentOrthopedicCareNeeded")] },
  });
}

export function buildForeignBodyAdultComplaintV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildMskTraumaV1Intel(d, {
    hpi: [d("hpiForeignBodyConcern"), d("hpiWoundPuncture"), d("hpiLacerationPresent"), d("hpiSiteHand"), d("hpiSiteFoot"), d("hpiSiteEye")],
    physicalExam: { general: [d("examNoAcuteDistress")], heent: [d("examVisualAcuityGrosslyIntact")], musculoskeletal: [d("examLocalizedTendernessPresent")], skin: [d("examForeignBodyVisualized"), d("examWoundContaminationEvaluated")], neuroPsych: [d("examNeurovascularIntact")] },
    extraDifferential: [d("diffRetainedForeignBody"), d("diffInfection"), d("diffTendonInjury")],
    mdmOverrides: { mdmWorkingAssessment: [d("waForeignBody"), d("waRetainedForeignBody")], clinicalImpression: [d("impForeignBody")], mdmPlanSummary: [d("planForeignBodyRemovalComplete"), d("planImagingDecision"), d("planWoundCareInstructions"), d("planReturnPrecautions")], mdmClinicalRationale: [d("reasoningForeignBodyRemovalComplete"), d("reasoningNoRetainedFragmentOnImaging")] },
  });
}

export function buildBurnInjuryAdultComplaintV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildMskTraumaV1Intel(d, {
    hpi: [d("hpiBurnMechanismFlame"), d("hpiBurnMechanismScald"), d("hpiBurnMechanismChemical"), d("hpiBurnMechanismElectrical"), d("hpiSmokeOrHotGasExposure"), d("hpiFrostbiteExposure"), d("hpiBurnDepthReported"), d("hpiTbsaEstimated"), d("hpiAirwaySymptoms"), d("hpiCircumferentialBurnConcern")],
    physicalExam: {
      general: [d("examHemodynamicallyStable")],
      heent: [d("examFacialBurnPresent"), d("examSootInNaresOrOropharynx")],
      respiratory: [d("examAirwayPatent"), d("examRespiratoryDistressPresent")],
      skin: [d("examBurnDepthDocumented"), d("examTbsaDocumented"), d("examCircumferentialBurnPresent"), d("examChemicalDecontaminationCompleted"), d("examFrostbiteTissueChangesPresent")],
      neuroPsych: [d("examDistalPulsesIntact"), d("examSensationIntactDistally")],
    },
    extraDifferential: [d("diffInhalationInjury"), d("diffFullThicknessBurn"), d("diffChemicalBurn"), d("diffElectricalInjury"), d("diffCompartmentSyndrome")],
    mdmOverrides: {
      mdmWorkingAssessment: [d("waBurnInjury"), d("waInhalationInjury"), d("waChemicalBurn"), d("waElectricalBurn"), d("waFrostbite")],
      clinicalImpression: [d("impBurnInjury"), d("impInhalationInjury"), d("impFullThicknessBurn"), d("impFrostbite")],
      mdmDataReviewed: [d("mdmTraumaImagingReviewed"), d("mdmCbcReviewed"), d("mdmCmpReviewed")],
      mdmPlanSummary: [d("planBurnWoundCare"), d("planTbsaAndDepthDocumentation"), d("planAirwayMonitoring"), d("planChemicalIrrigation"), d("planElectricalMonitoring"), d("planBurnCenterConsult"), d("planReturnPrecautions")],
      mdmClinicalRationale: [d("reasoningAirwayRisk"), d("reasoningBurnDepthAndTbsaRisk"), d("reasoningChemicalExposureRisk"), d("reasoningElectricalInjuryRisk"), d("reasoningFrostbiteRewarming")],
      mdmRiskStratification: [d("riskLowRiskBurn"), d("riskModerateRiskBurn"), d("riskHighRiskBurn"), d("riskAdmissionRecommended")],
    },
  });
}

export function buildPenetratingTraumaAdultComplaintV1Intel(d: (key: string) => string): ProviderDocumentationComplaintIntelligence {
  return buildMskTraumaV1Intel(d, {
    hpi: [d("hpiGunshotMechanism"), d("hpiStabMechanism"), d("hpiImpalementMechanism"), d("hpiEntryWound"), d("hpiExitWound"), d("hpiThroughAndThroughWound"), d("hpiRetainedProjectile"), d("hpiActiveHemorrhage"), d("hpiTourniquetApplied"), d("hpiObjectLeftInPlace")],
    physicalExam: {
      general: [d("examHemodynamicInstability"), d("examHemodynamicallyStable")],
      heent: [d("examAirwayPatent")],
      respiratory: [d("examChestWoundPresent"), d("examBreathSoundsAsymmetric")],
      abdomen: [d("examAbdominalWoundPresent"), d("examAbdominalTendernessPresent")],
      skin: [d("examEntryExitWoundsDocumented"), d("examActiveBleedingPresent"), d("examImpaledObjectInPlace")],
      neuroPsych: [d("examNeurovascularIntact"), d("examSensationIntactDistally")],
      musculoskeletal: [d("examDistalPulsesIntact")],
    },
    extraDifferential: [d("diffVascularInjury"), d("diffThoracicOrganInjury"), d("diffAbdominalOrganInjury"), d("diffNerveInjury"), d("diffRetainedForeignBody")],
    mdmOverrides: {
      mdmWorkingAssessment: [d("waPenetratingTrauma"), d("waGunshotWound"), d("waStabWound"), d("waHemorrhagicShock")],
      clinicalImpression: [d("impPenetratingTrauma"), d("impGunshotWound"), d("impStabWound")],
      mdmDataReviewed: [d("mdmTraumaImagingReviewed"), d("mdmCbcReviewed"), d("mdmCmpReviewed")],
      mdmPlanSummary: [d("planTraumaActivation"), d("planHemorrhageControl"), d("planTourniquetReassessment"), d("planImpaledObjectStabilized"), d("planSerialNeurovascularChecks"), d("planTraumaTransfer"), d("planForensicEvidencePreservedOptional")],
      mdmClinicalRationale: [d("reasoningPenetratingMechanismHighRisk"), d("reasoningHemorrhageRisk"), d("reasoningThoracoabdominalRisk"), d("reasoningNeurovascularRisk"), d("reasoningForensicEvidenceOptional")],
      mdmRiskStratification: [d("riskLowRiskSuperficialPuncture"), d("riskModerateRiskExtremityWound"), d("riskHighRiskPenetratingTrauma"), d("riskTraumaTransfer")],
    },
  });
}

export const TRAUMA_INJURY_GOLD_STANDARD_BUILDERS = {
  fall: buildFallComplaintIntel,
  head_injury: buildHeadInjuryComplaintIntel,
  laceration: buildLacerationComplaintIntel,
  fracture_concern: buildFractureConcernComplaintIntel,
  mvc: buildMvcCollisionComplaintIntel,
  assault: buildAssaultTraumaComplaintIntel,
  neck_pain_trauma: buildNeckPainTraumaComplaintIntel,
  back_pain: buildBackPainTraumaComplaintIntel,
  crush_injury: buildCrushInjuryComplaintIntel,
  penetrating_injury: buildPenetratingInjuryComplaintIntel,
  burn: buildBurnInjuryComplaintIntel,
  pediatric_trauma: buildPediatricTraumaComplaintIntel,
  back_pain_complaint_v1: buildBackPainComplaintV1Intel,
  neck_pain_complaint_v1: buildNeckPainComplaintV1Intel,
  shoulder_injury_complaint_v1: buildShoulderInjuryComplaintV1Intel,
  knee_injury_complaint_v1: buildKneeInjuryComplaintV1Intel,
  ankle_foot_injury_complaint_v1: buildAnkleFootInjuryComplaintV1Intel,
  hip_pain_injury_complaint_v1: buildHipPainInjuryComplaintV1Intel,
  hand_wrist_injury_complaint_v1: buildHandWristInjuryComplaintV1Intel,
  fall_trauma_complaint_v1: buildFallTraumaComplaintV1Intel,
  minor_head_injury_complaint_v1: buildMinorHeadInjuryComplaintV1Intel,
  laceration_soft_tissue_complaint_v1: buildLacerationSoftTissueComplaintV1Intel,
  animal_bite_adult_complaint_v1: buildAnimalBiteAdultComplaintV1Intel,
  fracture_adult_complaint_v1: buildFractureAdultComplaintV1Intel,
  dislocation_adult_complaint_v1: buildDislocationAdultComplaintV1Intel,
  sprain_strain_adult_complaint_v1: buildSprainStrainAdultComplaintV1Intel,
  tendon_injury_adult_complaint_v1: buildTendonInjuryAdultComplaintV1Intel,
  ligament_injury_adult_complaint_v1: buildLigamentInjuryAdultComplaintV1Intel,
  crush_injury_adult_complaint_v1: buildCrushInjuryAdultComplaintV1Intel,
  traumatic_amputation_adult_complaint_v1: buildTraumaticAmputationAdultComplaintV1Intel,
  foreign_body_adult_complaint_v1: buildForeignBodyAdultComplaintV1Intel,
  burn_injury_adult_complaint_v1: buildBurnInjuryAdultComplaintV1Intel,
  penetrating_trauma_adult_complaint_v1: buildPenetratingTraumaAdultComplaintV1Intel,
  concussion_followup_complaint_v1: buildConcussionFollowupComplaintV1Intel,
} as const;
