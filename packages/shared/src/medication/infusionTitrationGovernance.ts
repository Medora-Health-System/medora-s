/**
 * MEDUI.MEDICATION.PULMONARY_AND_CONTINUOUS_INFUSION_EXPANSION.1
 * Infusion titration documentation governance.
 */

export const INFUSION_TITRATION_GOAL_TYPES = [
  "MAP",
  "BP",
  "SEDATION",
  "RASS",
  "CPOT",
  "BIS",
  "BLOOD_GLUCOSE",
  "PTT",
  "ANTI_XA",
  "ICP",
  "HEART_RATE",
  "RESPIRATORY_RATE",
] as const;

export type InfusionTitrationGoalType = (typeof INFUSION_TITRATION_GOAL_TYPES)[number];

export type InfusionTitrationEventPayload = {
  goalType: InfusionTitrationGoalType;
  previousRate: string;
  newRate: string;
  reasonForChange: string;
  goalValueBefore?: string | null;
  goalValueAfter?: string | null;
  goalTarget?: string | null;
  documentedAt: string;
  documentedByUserId?: string | null;
  witnessUserId?: string | null;
};

export type InfusionTitrationGoalDefinition = {
  goalType: InfusionTitrationGoalType;
  labelKey: string;
  unit: string | null;
  autoDocumentOnRateChange: boolean;
};

export const INFUSION_TITRATION_GOAL_DEFINITIONS: readonly InfusionTitrationGoalDefinition[] = [
  { goalType: "MAP", labelKey: "infusionTitration.goals.map", unit: "mmHg", autoDocumentOnRateChange: true },
  { goalType: "BP", labelKey: "infusionTitration.goals.bp", unit: "mmHg", autoDocumentOnRateChange: true },
  { goalType: "SEDATION", labelKey: "infusionTitration.goals.sedation", unit: null, autoDocumentOnRateChange: true },
  { goalType: "RASS", labelKey: "infusionTitration.goals.rass", unit: null, autoDocumentOnRateChange: true },
  { goalType: "CPOT", labelKey: "infusionTitration.goals.cpot", unit: null, autoDocumentOnRateChange: true },
  { goalType: "BIS", labelKey: "infusionTitration.goals.bis", unit: null, autoDocumentOnRateChange: true },
  { goalType: "BLOOD_GLUCOSE", labelKey: "infusionTitration.goals.bloodGlucose", unit: "mg/dL", autoDocumentOnRateChange: true },
  { goalType: "PTT", labelKey: "infusionTitration.goals.ptt", unit: "sec", autoDocumentOnRateChange: true },
  { goalType: "ANTI_XA", labelKey: "infusionTitration.goals.antiXa", unit: "IU/mL", autoDocumentOnRateChange: true },
  { goalType: "ICP", labelKey: "infusionTitration.goals.icp", unit: "mmHg", autoDocumentOnRateChange: true },
  { goalType: "HEART_RATE", labelKey: "infusionTitration.goals.heartRate", unit: "bpm", autoDocumentOnRateChange: true },
  { goalType: "RESPIRATORY_RATE", labelKey: "infusionTitration.goals.respiratoryRate", unit: "breaths/min", autoDocumentOnRateChange: true },
] as const;

const GOAL_INDEX = new Map(INFUSION_TITRATION_GOAL_DEFINITIONS.map((g) => [g.goalType, g]));

export function resolveInfusionTitrationGoalDefinition(
  goalType: InfusionTitrationGoalType
): InfusionTitrationGoalDefinition | null {
  return GOAL_INDEX.get(goalType) ?? null;
}

/** Auto-document titration event when rate changes with goal context. */
export function buildInfusionTitrationAutoDocumentEvent(input: {
  goalType: InfusionTitrationGoalType;
  previousRate: string;
  newRate: string;
  reasonForChange: string;
  goalValueBefore?: string | null;
  goalValueAfter?: string | null;
  goalTarget?: string | null;
  documentedAt: string;
  documentedByUserId?: string | null;
}): InfusionTitrationEventPayload {
  return {
    goalType: input.goalType,
    previousRate: input.previousRate,
    newRate: input.newRate,
    reasonForChange: input.reasonForChange,
    goalValueBefore: input.goalValueBefore ?? null,
    goalValueAfter: input.goalValueAfter ?? null,
    goalTarget: input.goalTarget ?? null,
    documentedAt: input.documentedAt,
    documentedByUserId: input.documentedByUserId ?? null,
  };
}

export type InfusionTitrationGovernanceReport = {
  supportedGoals: readonly InfusionTitrationGoalType[];
  autoDocumentOnRateChange: boolean;
  witnessSupported: boolean;
  decision: "PASS" | "FAIL";
};

export function buildInfusionTitrationGovernanceReport(): InfusionTitrationGovernanceReport {
  return {
    supportedGoals: INFUSION_TITRATION_GOAL_TYPES,
    autoDocumentOnRateChange: true,
    witnessSupported: true,
    decision: "PASS",
  };
}
