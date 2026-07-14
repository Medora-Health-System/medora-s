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
  concussion_followup_complaint_v1: buildConcussionFollowupComplaintV1Intel,
} as const;
