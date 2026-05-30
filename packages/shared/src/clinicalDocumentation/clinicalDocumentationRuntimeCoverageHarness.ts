/**
 * EDOC.TEST.2 — shared registry integrity helpers (no API fixture dependency).
 */

import { EDOC_BASIC_STRUCTURED_CARD_ID } from "./observationDocumentationPayloads.js";
import { EDOC23B_FOUNDATION_CATALOG_COMPLETION_CARD_IDS } from "./foundationCatalogCompletionPayloads.js";
import { EDOC3_OBSERVATION_DOCUMENTATION_CARD_IDS } from "./observationDocumentationPayloads.js";
import { EDOC4_STROKE_DOCUMENTATION_CARD_IDS } from "./strokeDocumentationPayloads.js";
import { EDOC5_INTAKE_OUTPUT_CARD_IDS } from "./intakeOutputDocumentationPayloads.js";
import { EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS } from "./restraintDocumentationPayloads.js";
import { EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS } from "./bloodProductDocumentationPayloads.js";
import { EDOC8_HIGH_ALERT_INFUSION_DOCUMENTATION_CARD_IDS } from "./highAlertInfusionDocumentationPayloads.js";
import { EDOC9_BELONGINGS_VALUABLES_DOCUMENTATION_CARD_IDS } from "./belongingsValuablesDocumentationPayloads.js";
import { EDOC10_PROCEDURAL_SEDATION_DOCUMENTATION_CARD_IDS } from "./proceduralSedationDocumentationPayloads.js";
import { EDOC11_STROKE_NEURO_REASSESSMENT_CARD_IDS } from "./strokeNeuroReassessmentDocumentationPayloads.js";
import { EDOC12_RESPIRATORY_DOCUMENTATION_CARD_IDS } from "./respiratoryDocumentationPayloads.js";
import { EDOC13_PAIN_DOCUMENTATION_CARD_IDS } from "./painDocumentationPayloads.js";
import { EDOC14_FALL_RISK_SAFETY_DOCUMENTATION_CARD_IDS } from "./fallRiskSafetyDocumentationPayloads.js";
import { EDOC14_NEUROLOGICAL_DOCUMENTATION_CARD_IDS } from "./neurologicalDocumentationPayloads.js";
import { EDOC15_CARDIAC_MONITORING_DOCUMENTATION_CARD_IDS } from "./cardiacMonitoringDocumentationPayloads.js";
import { EDOC16_BEHAVIORAL_HEALTH_SAFETY_DOCUMENTATION_CARD_IDS } from "./behavioralHealthSafetyDocumentationPayloads.js";
import { EDOC17_DEVICE_LINE_TUBE_DRAIN_MONITORING_CARD_IDS } from "./deviceLineTubeDrainMonitoringDocumentationPayloads.js";
import { EDOC18_SEPSIS_MONITORING_DOCUMENTATION_CARD_IDS } from "./sepsisMonitoringDocumentationPayloads.js";
import { EDOC19_NURSING_ADMISSION_CARE_PLAN_DOCUMENTATION_CARD_IDS } from "./nursingAdmissionCarePlanDocumentationPayloads.js";
import { EDOC20_SKIN_WOUND_PRESSURE_INJURY_DOCUMENTATION_CARD_IDS } from "./skinWoundPressureInjuryDocumentationPayloads.js";
import { EDOC21_DIALYSIS_RENAL_FLUID_MANAGEMENT_DOCUMENTATION_CARD_IDS } from "./dialysisRenalFluidManagementDocumentationPayloads.js";
import { EDOC22_PATIENT_EDUCATION_DISCHARGE_TEACHING_DOCUMENTATION_CARD_IDS } from "./patientEducationDischargeTeachingDocumentationPayloads.js";
import { EDOC23_PROCEDURAL_SAFETY_THROMBOLYTIC_CARD_IDS } from "./proceduralSafetyThrombolyticPayloads.js";

const ALL_EDOC_MODULE_CARD_IDS = new Set<string>([
  EDOC_BASIC_STRUCTURED_CARD_ID,
  ...EDOC3_OBSERVATION_DOCUMENTATION_CARD_IDS,
  ...EDOC4_STROKE_DOCUMENTATION_CARD_IDS,
  ...EDOC5_INTAKE_OUTPUT_CARD_IDS,
  ...EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS,
  ...EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS,
  ...EDOC8_HIGH_ALERT_INFUSION_DOCUMENTATION_CARD_IDS,
  ...EDOC9_BELONGINGS_VALUABLES_DOCUMENTATION_CARD_IDS,
  ...EDOC10_PROCEDURAL_SEDATION_DOCUMENTATION_CARD_IDS,
  ...EDOC11_STROKE_NEURO_REASSESSMENT_CARD_IDS,
  ...EDOC12_RESPIRATORY_DOCUMENTATION_CARD_IDS,
  ...EDOC13_PAIN_DOCUMENTATION_CARD_IDS,
  ...EDOC14_FALL_RISK_SAFETY_DOCUMENTATION_CARD_IDS,
  ...EDOC14_NEUROLOGICAL_DOCUMENTATION_CARD_IDS,
  ...EDOC15_CARDIAC_MONITORING_DOCUMENTATION_CARD_IDS,
  ...EDOC16_BEHAVIORAL_HEALTH_SAFETY_DOCUMENTATION_CARD_IDS,
  ...EDOC17_DEVICE_LINE_TUBE_DRAIN_MONITORING_CARD_IDS,
  ...EDOC18_SEPSIS_MONITORING_DOCUMENTATION_CARD_IDS,
  ...EDOC19_NURSING_ADMISSION_CARE_PLAN_DOCUMENTATION_CARD_IDS,
  ...EDOC20_SKIN_WOUND_PRESSURE_INJURY_DOCUMENTATION_CARD_IDS,
  ...EDOC21_DIALYSIS_RENAL_FLUID_MANAGEMENT_DOCUMENTATION_CARD_IDS,
  ...EDOC22_PATIENT_EDUCATION_DISCHARGE_TEACHING_DOCUMENTATION_CARD_IDS,
  ...EDOC23_PROCEDURAL_SAFETY_THROMBOLYTIC_CARD_IDS,
  ...EDOC23B_FOUNDATION_CATALOG_COMPLETION_CARD_IDS,
]);

/**
 * EDOC.TEST.2 — every AVAILABLE card must appear in fixtures and EDOC module unions.
 */
export function assertRegistryRuntimeCoverageIntegrity(
  availableCardIds: readonly string[],
  fixtureCardIds: readonly string[]
): void {
  const available = [...availableCardIds].sort();
  const fixtures = [...fixtureCardIds].sort();

  if (available.length !== fixtures.length) {
    throw new Error(
      `Runtime coverage fixture count (${fixtures.length}) != AVAILABLE cards (${available.length})`
    );
  }

  for (let i = 0; i < available.length; i++) {
    if (available[i] !== fixtures[i]) {
      throw new Error(
        `Fixture/card mismatch at index ${i}: available=${available[i]} fixture=${fixtures[i]}`
      );
    }
  }

  const missingModule = available.filter((id) => !ALL_EDOC_MODULE_CARD_IDS.has(id));
  if (missingModule.length > 0) {
    throw new Error(
      `AVAILABLE cards missing from EDOC module unions: ${missingModule.join(", ")}`
    );
  }
}

export function listEdocModuleCardIds(): string[] {
  return [...ALL_EDOC_MODULE_CARD_IDS].sort();
}
