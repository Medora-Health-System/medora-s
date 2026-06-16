/** POSTCERT.1B — MDM.1 gold-standard builder for medication refill complaint intelligence. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const intel = (bundle: ProviderDocumentationComplaintIntelligence): ProviderDocumentationComplaintIntelligence => bundle;

export const MEDICATION_REFILL_TEMPLATE_ID = "medication_refill" as const;

export const MEDICATION_REFILL_REQUIRED_MDM1_SECTIONS = [
  "mdmWorkingAssessment",
  "mdmDifferentialSynthesis",
  "mdmDataReviewed",
  "mdmRiskStratification",
  "mdmClinicalRationale",
  "clinicalImpression",
  "mdmPlanSummary",
] as const;

export function buildMedicationRefillComplaintIntel(
  mr: (key: string) => string
): ProviderDocumentationComplaintIntelligence {
  return intel({
    hpi: [
      mr("hpiRequestsMedicationRefill"),
      mr("hpiRanOutOfMedication"),
      mr("hpiLastDoseTaken"),
      mr("hpiUnableToReachPcp"),
      mr("hpiMissedFollowUpAppointment"),
      mr("hpiInsuranceIssue"),
      mr("hpiPharmacyIssue"),
      mr("hpiMedicationLost"),
      mr("hpiMedicationStolen"),
      mr("hpiTravelingAwayFromHome"),
      mr("hpiBridgeRefillRequest"),
      mr("hpiMedicationName"),
      mr("hpiDose"),
      mr("hpiChronicCondition"),
      mr("hpiSymptomsAfterInterruption"),
      mr("hpiControlledSubstanceRequest"),
    ],
    rosImportantPositives: [
      mr("rosNoAcuteComplaint"),
      mr("rosSymptomsControlledOnMedication"),
      mr("rosSymptomsWorseningAfterInterruption"),
      mr("rosWithdrawalSymptoms"),
      mr("rosChronicConditionSymptoms"),
    ],
    rosImportantNegatives: [
      mr("rosDeniesChestPain"),
      mr("rosDeniesShortnessOfBreath"),
      mr("rosDeniesFever"),
      mr("rosDeniesNeurologicSymptoms"),
      mr("rosDeniesSevereWithdrawalSymptoms"),
      mr("rosDeniesSuicidalIdeation"),
      mr("rosDeniesAdverseMedicationReaction"),
    ],
    rosRedFlags: [
      mr("rfControlledSubstanceRefillRequest"),
      mr("rfWithdrawalConcern"),
      mr("rfMedicationMisuseConcern"),
      mr("rfUnsafeChronicDiseaseControl"),
      mr("rfInabilityToAccessPrimaryCare"),
      mr("rfHighRiskMedicationRequest"),
    ],
    physicalExam: {
      general: [mr("examNoAcuteDistress"), mr("examWellAppearing"), mr("examStableVitalSigns")],
      respiratory: [mr("examNormalRespiratoryEffort")],
      neuroPsych: [mr("examNormalMentalStatus"), mr("examAlertAndOriented"), mr("examNoFocalNeurologicDeficit")],
    },
    mdmWorkingAssessment: [
      mr("waMedicationRefillRequest"),
      mr("waMedicationInterruption"),
      mr("waChronicDiseaseManagementIssue"),
    ],
    mdmDifferentialSynthesis: [
      mr("diffMedicationNonadherence"),
      mr("diffPharmacyAccessIssue"),
      mr("diffInsuranceCoverageIssue"),
      mr("diffUncontrolledChronicCondition"),
      mr("diffAcuteExacerbationRequiringEvaluation"),
      mr("diffMedicationLapse"),
      mr("diffWithdrawalSyndrome"),
      mr("diffMedicationAdverseEffect"),
      mr("diffSubstanceMisuseDiversionConcern"),
    ],
    mdmDataReviewed: [
      mr("mdmMedicationListReviewed"),
      mr("mdmRefillHistoryReviewed"),
      mr("mdmPharmacyRecordsReviewed"),
      mr("mdmPriorVisitRecordsReviewed"),
      mr("mdmPdmpReviewed"),
    ],
    mdmRiskStratification: [
      mr("riskLowRiskRefillRequest"),
      mr("riskModerateRiskMedicationInterruption"),
      mr("riskHighRiskCriticalMedicationUnavailable"),
    ],
    mdmClinicalRationale: [
      mr("reasoningNoEvidenceAcuteEmergency"),
      mr("reasoningBridgeRefillAppropriate"),
      mr("reasoningEmergencyEvaluationRequired"),
      mr("reasoningControlledSubstancePolicyAddressed"),
      mr("reasoningRisksBenefitsAddressed"),
    ],
    clinicalImpression: [
      mr("impStableChronicCondition"),
      mr("impMedicationRefillRequest"),
      mr("impMedicationInterruption"),
    ],
    mdmPlanSummary: [
      mr("planBridgePrescriptionProvided"),
      mr("planFollowUpWithPcp"),
      mr("planSpecialistFollowUp"),
      mr("planReturnPrecautionsProvided"),
      mr("planRefillDeclinedUnsafe"),
      mr("planMedicationSafetyInstructionsProvided"),
    ],
    reassessment: [
      mr("reassessRemainsStable"),
      mr("reassessNoAcuteFindings"),
      mr("reassessRefillAppropriate"),
      mr("reassessFurtherEvaluationRequired"),
    ],
    followUpDisposition: [
      mr("dispBridgePrescriptionProvided"),
      mr("dispPrimaryCareFollowUpArranged"),
      mr("dispReturnPrecautionsProvided"),
      mr("dispRefillDeclinedUnsafe"),
      mr("dispMedicationSafetyInstructionsProvided"),
    ],
  });
}
