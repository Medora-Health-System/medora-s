/** Phase 19MDM.6 — MSK / trauma complaint intelligence (ME.2N-R gold standard). */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  buildAnkleFootInjuryComplaintV1Intel,
  buildAnimalBiteAdultComplaintV1Intel,
  buildBackPainComplaintV1Intel,
  buildFallTraumaComplaintV1Intel,
  buildDislocationAdultComplaintV1Intel,
  buildFractureAdultComplaintV1Intel,
  buildHandWristInjuryComplaintV1Intel,
  buildLigamentInjuryAdultComplaintV1Intel,
  buildSprainStrainAdultComplaintV1Intel,
  buildTendonInjuryAdultComplaintV1Intel,
  buildCrushInjuryAdultComplaintV1Intel,
  buildTraumaticAmputationAdultComplaintV1Intel,
  buildForeignBodyAdultComplaintV1Intel,
  buildBurnInjuryAdultComplaintV1Intel,
  buildHipPainInjuryComplaintV1Intel,
  buildKneeInjuryComplaintV1Intel,
  buildLacerationSoftTissueComplaintV1Intel,
  buildMinorHeadInjuryComplaintV1Intel,
  buildNeckPainComplaintV1Intel,
  buildShoulderInjuryComplaintV1Intel,
} from "./providerDocumentationTraumaInjuryComplaintIntelGoldStandard";

const backPain = (key: string) => `providerDocumentationComplaintIntel.backPainComplaintV1.${key}`;
const neckPain = (key: string) => `providerDocumentationComplaintIntel.neckPainComplaintV1.${key}`;
const shoulderInjury = (key: string) => `providerDocumentationComplaintIntel.shoulderInjuryComplaintV1.${key}`;
const kneeInjury = (key: string) => `providerDocumentationComplaintIntel.kneeInjuryComplaintV1.${key}`;
const ankleFootInjury = (key: string) => `providerDocumentationComplaintIntel.ankleFootInjuryComplaintV1.${key}`;
const hipPainInjury = (key: string) => `providerDocumentationComplaintIntel.hipPainInjuryComplaintV1.${key}`;
const handWristInjury = (key: string) => `providerDocumentationComplaintIntel.handWristInjuryComplaintV1.${key}`;
const fallTrauma = (key: string) => `providerDocumentationComplaintIntel.fallTraumaComplaintV1.${key}`;
const minorHeadInjury = (key: string) => `providerDocumentationComplaintIntel.minorHeadInjuryComplaintV1.${key}`;
const lacerationSoftTissue = (key: string) => `providerDocumentationComplaintIntel.lacerationSoftTissueComplaintV1.${key}`;
const animalBiteAdult = (key: string) => `providerDocumentationComplaintIntel.animalBiteAdultComplaintV1.${key}`;
const fractureAdult = (key: string) => `providerDocumentationComplaintIntel.fractureAdultComplaintV1.${key}`;
const dislocationAdult = (key: string) => `providerDocumentationComplaintIntel.dislocationAdultComplaintV1.${key}`;
const sprainStrainAdult = (key: string) => `providerDocumentationComplaintIntel.sprainStrainAdultComplaintV1.${key}`;
const tendonInjuryAdult = (key: string) => `providerDocumentationComplaintIntel.tendonInjuryAdultComplaintV1.${key}`;
const ligamentInjuryAdult = (key: string) => `providerDocumentationComplaintIntel.ligamentInjuryAdultComplaintV1.${key}`;
const crushInjuryAdult = (key: string) => `providerDocumentationComplaintIntel.crushInjuryAdultComplaintV1.${key}`;
const traumaticAmputationAdult = (key: string) => `providerDocumentationComplaintIntel.traumaticAmputationAdultComplaintV1.${key}`;
const foreignBodyAdult = (key: string) => `providerDocumentationComplaintIntel.foreignBodyAdultComplaintV1.${key}`;
const burnInjuryAdult = (key: string) => `providerDocumentationComplaintIntel.burnInjuryAdultComplaintV1.${key}`;

export const BACK_PAIN_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildBackPainComplaintV1Intel(backPain);
export const NECK_PAIN_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildNeckPainComplaintV1Intel(neckPain);
export const SHOULDER_INJURY_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildShoulderInjuryComplaintV1Intel(shoulderInjury);
export const KNEE_INJURY_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildKneeInjuryComplaintV1Intel(kneeInjury);
export const ANKLE_FOOT_INJURY_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildAnkleFootInjuryComplaintV1Intel(ankleFootInjury);
export const HIP_PAIN_INJURY_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildHipPainInjuryComplaintV1Intel(hipPainInjury);
export const HAND_WRIST_INJURY_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildHandWristInjuryComplaintV1Intel(handWristInjury);
export const FALL_TRAUMA_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildFallTraumaComplaintV1Intel(fallTrauma);
export const MINOR_HEAD_INJURY_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildMinorHeadInjuryComplaintV1Intel(minorHeadInjury);
export const LACERATION_SOFT_TISSUE_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildLacerationSoftTissueComplaintV1Intel(lacerationSoftTissue);
export const ANIMAL_BITE_ADULT_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildAnimalBiteAdultComplaintV1Intel(animalBiteAdult);
export const FRACTURE_ADULT_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildFractureAdultComplaintV1Intel(fractureAdult);
export const DISLOCATION_ADULT_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildDislocationAdultComplaintV1Intel(dislocationAdult);
export const SPRAIN_STRAIN_ADULT_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildSprainStrainAdultComplaintV1Intel(sprainStrainAdult);
export const TENDON_INJURY_ADULT_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildTendonInjuryAdultComplaintV1Intel(tendonInjuryAdult);
export const LIGAMENT_INJURY_ADULT_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildLigamentInjuryAdultComplaintV1Intel(ligamentInjuryAdult);
export const CRUSH_INJURY_ADULT_COMPLAINT_V1_INTEL = buildCrushInjuryAdultComplaintV1Intel(crushInjuryAdult);
export const TRAUMATIC_AMPUTATION_ADULT_COMPLAINT_V1_INTEL = buildTraumaticAmputationAdultComplaintV1Intel(traumaticAmputationAdult);
export const FOREIGN_BODY_ADULT_COMPLAINT_V1_INTEL = buildForeignBodyAdultComplaintV1Intel(foreignBodyAdult);
export const BURN_INJURY_ADULT_COMPLAINT_V1_INTEL = buildBurnInjuryAdultComplaintV1Intel(burnInjuryAdult);

export const MSK_TRAUMA_COMPLAINT_V1_TEMPLATE_IDS = [
  "back_pain_complaint_v1",
  "neck_pain_complaint_v1",
  "shoulder_injury_complaint_v1",
  "knee_injury_complaint_v1",
  "ankle_foot_injury_complaint_v1",
  "hip_pain_injury_complaint_v1",
  "hand_wrist_injury_complaint_v1",
  "fall_trauma_complaint_v1",
  "minor_head_injury_complaint_v1",
  "laceration_soft_tissue_complaint_v1",
  "animal_bite_adult_complaint_v1",
  "fracture_adult_complaint_v1",
  "dislocation_adult_complaint_v1",
  "sprain_strain_adult_complaint_v1",
  "tendon_injury_adult_complaint_v1",
  "ligament_injury_adult_complaint_v1",
  "crush_injury_adult_complaint_v1",
  "traumatic_amputation_adult_complaint_v1",
  "foreign_body_adult_complaint_v1",
  "burn_injury_adult_complaint_v1",
] as const;

export const MSK_TRAUMA_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID = {
  back_pain_complaint_v1: BACK_PAIN_COMPLAINT_V1_INTEL,
  neck_pain_complaint_v1: NECK_PAIN_COMPLAINT_V1_INTEL,
  shoulder_injury_complaint_v1: SHOULDER_INJURY_COMPLAINT_V1_INTEL,
  knee_injury_complaint_v1: KNEE_INJURY_COMPLAINT_V1_INTEL,
  ankle_foot_injury_complaint_v1: ANKLE_FOOT_INJURY_COMPLAINT_V1_INTEL,
  hip_pain_injury_complaint_v1: HIP_PAIN_INJURY_COMPLAINT_V1_INTEL,
  hand_wrist_injury_complaint_v1: HAND_WRIST_INJURY_COMPLAINT_V1_INTEL,
  fall_trauma_complaint_v1: FALL_TRAUMA_COMPLAINT_V1_INTEL,
  minor_head_injury_complaint_v1: MINOR_HEAD_INJURY_COMPLAINT_V1_INTEL,
  laceration_soft_tissue_complaint_v1: LACERATION_SOFT_TISSUE_COMPLAINT_V1_INTEL,
  animal_bite_adult_complaint_v1: ANIMAL_BITE_ADULT_COMPLAINT_V1_INTEL,
  fracture_adult_complaint_v1: FRACTURE_ADULT_COMPLAINT_V1_INTEL,
  dislocation_adult_complaint_v1: DISLOCATION_ADULT_COMPLAINT_V1_INTEL,
  sprain_strain_adult_complaint_v1: SPRAIN_STRAIN_ADULT_COMPLAINT_V1_INTEL,
  tendon_injury_adult_complaint_v1: TENDON_INJURY_ADULT_COMPLAINT_V1_INTEL,
  ligament_injury_adult_complaint_v1: LIGAMENT_INJURY_ADULT_COMPLAINT_V1_INTEL,
  crush_injury_adult_complaint_v1: CRUSH_INJURY_ADULT_COMPLAINT_V1_INTEL,
  traumatic_amputation_adult_complaint_v1: TRAUMATIC_AMPUTATION_ADULT_COMPLAINT_V1_INTEL,
  foreign_body_adult_complaint_v1: FOREIGN_BODY_ADULT_COMPLAINT_V1_INTEL,
  burn_injury_adult_complaint_v1: BURN_INJURY_ADULT_COMPLAINT_V1_INTEL,
} as const;
