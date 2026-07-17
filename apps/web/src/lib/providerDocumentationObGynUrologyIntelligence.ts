/** Phase 17 (Commit 1) — OB/GYN / urology complaint intelligence wiring. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  buildAcuteGynecologicPelvicComplaintV1Intel,
  buildAcuteScrotalPenileEmergencyV1Intel,
  buildEarlyPregnancyBleedingPainV1Intel,
  buildHypertensivePostpartumObstetricEmergencyV1Intel,
  buildLatePregnancyLaborEmergencyV1Intel,
  buildRenalUrinaryEmergencyV1Intel,
} from "./providerDocumentationObGynUrologyIntelGoldStandard";

const earlyPregnancyBleedingPain = (key: string) =>
  `providerDocumentationComplaintIntel.earlyPregnancyBleedingPainV1.${key}`;
const latePregnancyLaborEmergency = (key: string) =>
  `providerDocumentationComplaintIntel.latePregnancyLaborEmergencyV1.${key}`;
const hypertensivePostpartumObstetricEmergency = (key: string) =>
  `providerDocumentationComplaintIntel.hypertensivePostpartumObstetricEmergencyV1.${key}`;
const acuteGynecologicPelvicComplaint = (key: string) =>
  `providerDocumentationComplaintIntel.acuteGynecologicPelvicComplaintV1.${key}`;
const renalUrinaryEmergency = (key: string) =>
  `providerDocumentationComplaintIntel.renalUrinaryEmergencyV1.${key}`;
const acuteScrotalPenileEmergency = (key: string) =>
  `providerDocumentationComplaintIntel.acuteScrotalPenileEmergencyV1.${key}`;

export const EARLY_PREGNANCY_BLEEDING_PAIN_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildEarlyPregnancyBleedingPainV1Intel(earlyPregnancyBleedingPain);
export const LATE_PREGNANCY_LABOR_EMERGENCY_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildLatePregnancyLaborEmergencyV1Intel(latePregnancyLaborEmergency);
export const HYPERTENSIVE_POSTPARTUM_OBSTETRIC_EMERGENCY_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildHypertensivePostpartumObstetricEmergencyV1Intel(hypertensivePostpartumObstetricEmergency);
export const ACUTE_GYNECOLOGIC_PELVIC_COMPLAINT_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildAcuteGynecologicPelvicComplaintV1Intel(acuteGynecologicPelvicComplaint);
export const RENAL_URINARY_EMERGENCY_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildRenalUrinaryEmergencyV1Intel(renalUrinaryEmergency);
export const ACUTE_SCROTAL_PENILE_EMERGENCY_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildAcuteScrotalPenileEmergencyV1Intel(acuteScrotalPenileEmergency);

export const OBGYN_UROLOGY_COMPLAINT_V1_TEMPLATE_IDS = [
  "early_pregnancy_bleeding_pain_v1",
  "late_pregnancy_labor_emergency_v1",
  "hypertensive_postpartum_obstetric_emergency_v1",
  "acute_gynecologic_pelvic_complaint_v1",
  "renal_urinary_emergency_v1",
  "acute_scrotal_penile_emergency_v1",
] as const;

export const OBGYN_UROLOGY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID = {
  early_pregnancy_bleeding_pain_v1: EARLY_PREGNANCY_BLEEDING_PAIN_V1_INTEL,
  late_pregnancy_labor_emergency_v1: LATE_PREGNANCY_LABOR_EMERGENCY_V1_INTEL,
  hypertensive_postpartum_obstetric_emergency_v1: HYPERTENSIVE_POSTPARTUM_OBSTETRIC_EMERGENCY_V1_INTEL,
  acute_gynecologic_pelvic_complaint_v1: ACUTE_GYNECOLOGIC_PELVIC_COMPLAINT_V1_INTEL,
  renal_urinary_emergency_v1: RENAL_URINARY_EMERGENCY_V1_INTEL,
  acute_scrotal_penile_emergency_v1: ACUTE_SCROTAL_PENILE_EMERGENCY_V1_INTEL,
} as const;
