/** Phase 19MDM.5 — GU / renal complaint intelligence (click-to-insert only). */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  buildPelvicPainComplaintV1Intel,
  buildVaginalBleedingComplaintV1Intel,
  buildVaginalDischargeComplaintV1Intel,
} from "./providerDocumentationFemalePelvicGynComplaintIntelGoldStandard";
import { buildTesticularPainComplaintV1Intel } from "./providerDocumentationMaleGuComplaintIntelGoldStandard";
import { buildUrinaryRetentionComplaintV1Intel } from "./providerDocumentationUrinaryRetentionComplaintIntelGoldStandard";
import { buildFlankPainRenalComplaintV1Intel } from "./providerDocumentationFlankPainRenalComplaintIntelGoldStandard";
import { buildHematuriaComplaintV1Intel } from "./providerDocumentationHematuriaComplaintIntelGoldStandard";
import { buildDysuriaComplaintV1Intel } from "./providerDocumentationDysuriaComplaintIntelGoldStandard";
const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;
const dysuria = (key: string) => `providerDocumentationComplaintIntel.dysuriaComplaintV1.${key}`;
const hematuria = (key: string) => `providerDocumentationComplaintIntel.hematuriaComplaintV1.${key}`;
const flankPainRenal = (key: string) => `providerDocumentationComplaintIntel.flankPainRenalComplaintV1.${key}`;
const urinaryRetention = (key: string) => `providerDocumentationComplaintIntel.urinaryRetentionComplaintV1.${key}`;
const testicularPain = (key: string) => `providerDocumentationComplaintIntel.testicularPainComplaintV1.${key}`;
const pelvicPain = (key: string) => `providerDocumentationComplaintIntel.pelvicPainComplaintV1.${key}`;
const vaginalBleeding = (key: string) => `providerDocumentationComplaintIntel.vaginalBleedingComplaintV1.${key}`;
const vaginalDischarge = (key: string) => `providerDocumentationComplaintIntel.vaginalDischargeComplaintV1.${key}`;
const renalFailureSymptoms = (key: string) => `providerDocumentationComplaintIntel.renalFailureSymptomsComplaintV1.${key}`;

export const DYSURIA_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildDysuriaComplaintV1Intel(dysuria);

export const HEMATURIA_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildHematuriaComplaintV1Intel(hematuria);

export const FLANK_PAIN_RENAL_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildFlankPainRenalComplaintV1Intel(flankPainRenal);

export const URINARY_RETENTION_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildUrinaryRetentionComplaintV1Intel(urinaryRetention);

export const TESTICULAR_PAIN_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildTesticularPainComplaintV1Intel(testicularPain);

export const PELVIC_PAIN_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildPelvicPainComplaintV1Intel(pelvicPain);

export const VAGINAL_BLEEDING_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildVaginalBleedingComplaintV1Intel(vaginalBleeding);

export const VAGINAL_DISCHARGE_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildVaginalDischargeComplaintV1Intel(vaginalDischarge);

export const RENAL_FAILURE_SYMPTOMS_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence = intel({
  hpi: [renalFailureSymptoms("hpiDecreasedUrineOutput"), renalFailureSymptoms("hpiEdemaWeaknessNausea"), renalFailureSymptoms("hpiDyspneaDialysisHistory"), renalFailureSymptoms("hpiMedicationComplianceWeightChanges")],
  rosImportantPositives: [renalFailureSymptoms("rosEdema"), renalFailureSymptoms("rosWeakness"), renalFailureSymptoms("rosDyspnea")],
  rosImportantNegatives: [renalFailureSymptoms("rosDeniesChestPain")],
  rosRedFlags: [renalFailureSymptoms("rfVolumeOverloadConcern"), renalFailureSymptoms("rfAlteredMentalStatus")],
  physicalExam: { abdomen: [renalFailureSymptoms("examEdemaIfDocumented"), renalFailureSymptoms("examPerfusionIfDocumented"), renalFailureSymptoms("examRespiratoryFindingsIfDocumented")], general: [renalFailureSymptoms("examGeneralAppearance")] },
  mdmWorkingAssessment: [renalFailureSymptoms("mdmRenalFailureSymptomsPresentation")],
  mdmDifferentialSynthesis: [renalFailureSymptoms("diffAki"), renalFailureSymptoms("diffCkdProgression"), renalFailureSymptoms("diffElectrolyteDerangement"), renalFailureSymptoms("diffVolumeOverload"), renalFailureSymptoms("diffDehydration")],
  mdmDataReviewed: [renalFailureSymptoms("mdmRenalLabsElectrolytesImagingIfObtained")],
  mdmClinicalRationale: [renalFailureSymptoms("mdmDialysisPlanIfApplicable"), renalFailureSymptoms("mdmNephrologyConsultIfIndicated")],
  mdmAdmitObserveDischarge: [renalFailureSymptoms("mdmAdmissionIfIndicated")],
  reassessment: [renalFailureSymptoms("reassessVolumeRespiratoryStatus")],
  followUpDisposition: [renalFailureSymptoms("dispReturnWorseningEdemaSob")],
});

export const GU_RENAL_COMPLAINT_V1_TEMPLATE_IDS = [
  "dysuria_complaint_v1",
  "hematuria_complaint_v1",
  "flank_pain_renal_complaint_v1",
  "urinary_retention_complaint_v1",
  "testicular_pain_complaint_v1",
  "pelvic_pain_complaint_v1",
  "vaginal_bleeding_complaint_v1",
  "vaginal_discharge_complaint_v1",
  "renal_failure_symptoms_complaint_v1"
] as const;

export const GU_RENAL_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID = {
  dysuria_complaint_v1: DYSURIA_COMPLAINT_V1_INTEL,
  hematuria_complaint_v1: HEMATURIA_COMPLAINT_V1_INTEL,
  flank_pain_renal_complaint_v1: FLANK_PAIN_RENAL_COMPLAINT_V1_INTEL,
  urinary_retention_complaint_v1: URINARY_RETENTION_COMPLAINT_V1_INTEL,
  testicular_pain_complaint_v1: TESTICULAR_PAIN_COMPLAINT_V1_INTEL,
  pelvic_pain_complaint_v1: PELVIC_PAIN_COMPLAINT_V1_INTEL,
  vaginal_bleeding_complaint_v1: VAGINAL_BLEEDING_COMPLAINT_V1_INTEL,
  vaginal_discharge_complaint_v1: VAGINAL_DISCHARGE_COMPLAINT_V1_INTEL,
  renal_failure_symptoms_complaint_v1: RENAL_FAILURE_SYMPTOMS_COMPLAINT_V1_INTEL,
} as const;