/** Phase 18 (Commit 1) — psychiatric / behavioral / capacity complaint intelligence wiring. */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  buildCapacityRefusalSafetyDispositionV1Intel,
  buildDeliriumCatatoniaCognitiveBehaviorChangeV1Intel,
  buildDepressionAnxietyTraumaCrisisV1Intel,
  buildPediatricDevelopmentalBehavioralEmergencyV1Intel,
  buildPsychosisManiaBehavioralCrisisV1Intel,
  buildSuicideSelfHarmRiskV1Intel,
} from "./providerDocumentationPsychiatricBehavioralIntelGoldStandard";

const suicideSelfHarmRisk = (key: string) =>
  `providerDocumentationComplaintIntel.suicideSelfHarmRiskV1.${key}`;
const psychosisManiaBehavioralCrisis = (key: string) =>
  `providerDocumentationComplaintIntel.psychosisManiaBehavioralCrisisV1.${key}`;
const depressionAnxietyTraumaCrisis = (key: string) =>
  `providerDocumentationComplaintIntel.depressionAnxietyTraumaCrisisV1.${key}`;
const deliriumCatatoniaCognitiveBehaviorChange = (key: string) =>
  `providerDocumentationComplaintIntel.deliriumCatatoniaCognitiveBehaviorChangeV1.${key}`;
const pediatricDevelopmentalBehavioralEmergency = (key: string) =>
  `providerDocumentationComplaintIntel.pediatricDevelopmentalBehavioralEmergencyV1.${key}`;
const capacityRefusalSafetyDisposition = (key: string) =>
  `providerDocumentationComplaintIntel.capacityRefusalSafetyDispositionV1.${key}`;

export const SUICIDE_SELF_HARM_RISK_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildSuicideSelfHarmRiskV1Intel(suicideSelfHarmRisk);
export const PSYCHOSIS_MANIA_BEHAVIORAL_CRISIS_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildPsychosisManiaBehavioralCrisisV1Intel(psychosisManiaBehavioralCrisis);
export const DEPRESSION_ANXIETY_TRAUMA_CRISIS_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildDepressionAnxietyTraumaCrisisV1Intel(depressionAnxietyTraumaCrisis);
export const DELIRIUM_CATATONIA_COGNITIVE_BEHAVIOR_CHANGE_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildDeliriumCatatoniaCognitiveBehaviorChangeV1Intel(deliriumCatatoniaCognitiveBehaviorChange);
export const PEDIATRIC_DEVELOPMENTAL_BEHAVIORAL_EMERGENCY_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildPediatricDevelopmentalBehavioralEmergencyV1Intel(pediatricDevelopmentalBehavioralEmergency);
export const CAPACITY_REFUSAL_SAFETY_DISPOSITION_V1_INTEL: ProviderDocumentationComplaintIntelligence =
  buildCapacityRefusalSafetyDispositionV1Intel(capacityRefusalSafetyDisposition);

export const PSYCHIATRIC_BEHAVIORAL_CAPACITY_COMPLAINT_V1_TEMPLATE_IDS = [
  "suicide_self_harm_risk_v1",
  "psychosis_mania_behavioral_crisis_v1",
  "depression_anxiety_trauma_crisis_v1",
  "delirium_catatonia_cognitive_behavior_change_v1",
  "pediatric_developmental_behavioral_emergency_v1",
  "capacity_refusal_safety_disposition_v1",
] as const;

export const PSYCHIATRIC_BEHAVIORAL_CAPACITY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID = {
  suicide_self_harm_risk_v1: SUICIDE_SELF_HARM_RISK_V1_INTEL,
  psychosis_mania_behavioral_crisis_v1: PSYCHOSIS_MANIA_BEHAVIORAL_CRISIS_V1_INTEL,
  depression_anxiety_trauma_crisis_v1: DEPRESSION_ANXIETY_TRAUMA_CRISIS_V1_INTEL,
  delirium_catatonia_cognitive_behavior_change_v1: DELIRIUM_CATATONIA_COGNITIVE_BEHAVIOR_CHANGE_V1_INTEL,
  pediatric_developmental_behavioral_emergency_v1: PEDIATRIC_DEVELOPMENTAL_BEHAVIORAL_EMERGENCY_V1_INTEL,
  capacity_refusal_safety_disposition_v1: CAPACITY_REFUSAL_SAFETY_DISPOSITION_V1_INTEL,
} as const;
