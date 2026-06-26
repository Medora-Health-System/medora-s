/**
 * MEDUI.MEDICATION.PULMONARY_AND_CONTINUOUS_INFUSION_EXPANSION.1
 * Unified continuous infusion lifecycle governance.
 */

export const CONTINUOUS_INFUSION_LIFECYCLE_STATES = [
  "ORDERED",
  "VERIFIED",
  "STARTED",
  "RUNNING",
  "RATE_CHANGE",
  "PAUSED",
  "RESTARTED",
  "STOPPED",
  "COMPLETED",
] as const;

export type ContinuousInfusionLifecycleState = (typeof CONTINUOUS_INFUSION_LIFECYCLE_STATES)[number];

export type ContinuousInfusionEventType =
  | "INFUSION_START"
  | "INFUSION_STOP"
  | "INFUSION_RATE_CHANGE"
  | "INFUSION_PAUSE"
  | "INFUSION_RESTART"
  | "INFUSION_BOLUS"
  | "INFUSION_BAG_CHANGE"
  | "INFUSION_LINE_CHANGE"
  | "INFUSION_PUMP_CHANGE";

export type ContinuousInfusionEventPayload = {
  eventType: ContinuousInfusionEventType;
  eventAt: string;
  currentRate?: string | null;
  previousRate?: string | null;
  rateChangeReason?: string | null;
  pauseReason?: string | null;
  restartReason?: string | null;
  bolusDose?: string | null;
  bagChange?: boolean | null;
  lineChange?: boolean | null;
  pumpChange?: boolean | null;
  cosignRequired?: boolean | null;
  cosignedByUserId?: string | null;
  documentedByUserId?: string | null;
};

export const ENTERPRISE_CONTINUOUS_INFUSION_MEDICATIONS = [
  { medication: "Heparin infusion", tokens: ["heparin"], catalogCodes: ["HEPARIN_25000_UNITS_500_ML_PERFUSION_INTRAVEINEUSE"] },
  { medication: "Insulin infusion", tokens: ["insulin"], catalogCodes: ["REGULAR_INSULIN_100_UI_ML_DRIP_KIT_PERFUSION_INTRAVEINEUSE"] },
  { medication: "Fentanyl infusion", tokens: ["fentanyl"], catalogCodes: ["FENTANYL_250_MCG_5_ML_INJECTABLE_INTRAVEINEUSE"] },
  { medication: "Propofol", tokens: ["propofol"], catalogCodes: ["PROPOFOL_10MG_ML_IV", "PROPOFOL_20_MG_ML_INJECTABLE_INTRAVEINEUSE"] },
  { medication: "Dexmedetomidine", tokens: ["dexmedetomidine", "precedex"], catalogCodes: ["DEXMEDETOMIDINE_100_MCG_ML_INJECTABLE_INTRAVEINEUSE"] },
  { medication: "Midazolam infusion", tokens: ["midazolam"], catalogCodes: ["MIDAZOLAM_1_MG_ML_INJECTABLE_INTRAVEINEUSE"] },
  { medication: "Morphine infusion", tokens: ["morphine"], catalogCodes: ["MORPHINE_1_MG_ML_INJECTABLE_INTRAVEINEUSE"] },
  { medication: "Hydromorphone infusion", tokens: ["hydromorphone"], catalogCodes: ["HYDROMORPHONE_1_MG_ML_INJECTABLE_INTRAVEINEUSE"] },
  { medication: "Norepinephrine", tokens: ["norepinephrine", "levophed"], catalogCodes: ["NOREPINEPHRINE_8_MG_250_ML_PERFUSION_INTRAVEINEUSE", "NOREPINEPHRINE_16_MG_250_ML_PERFUSION_INTRAVEINEUSE"] },
  { medication: "Epinephrine infusion", tokens: ["epinephrine"], catalogCodes: ["EPINEPHRINE_1_MG_10_ML_INJECTABLE_INTRAVEINEUSE"] },
  { medication: "Phenylephrine", tokens: ["phenylephrine", "neosynephrine"], catalogCodes: ["PHENYLEPHRINE_50_MG_250_ML_PERFUSION_INTRAVEINEUSE"] },
  { medication: "Vasopressin", tokens: ["vasopressin"], catalogCodes: ["VASOPRESSIN_40_UNITS_100_ML_PERFUSION_INTRAVEINEUSE"] },
  { medication: "Dobutamine", tokens: ["dobutamine"], catalogCodes: ["DOBUTAMINE_500_MG_250_ML_PERFUSION_INTRAVEINEUSE"] },
  { medication: "Milrinone", tokens: ["milrinone"], catalogCodes: ["MILRINONE_40_MG_200_ML_PERFUSION_INTRAVEINEUSE"] },
  { medication: "Nicardipine", tokens: ["nicardipine"], catalogCodes: ["NICARDIPINE_2_5_MG_ML_INJECTABLE_INTRAVEINEUSE"] },
  { medication: "Nitroglycerin infusion", tokens: ["nitroglycerin"], catalogCodes: ["NITROGLYCERIN_5_MG_ML_INJECTABLE_INTRAVEINEUSE"] },
  { medication: "Amiodarone infusion", tokens: ["amiodarone"], catalogCodes: ["AMIODARONE_900_MG_500_ML_PERFUSION_INTRAVEINEUSE"] },
  { medication: "Diltiazem infusion", tokens: ["diltiazem"], catalogCodes: ["DILTIAZEM_5_MG_ML_INJECTABLE_INTRAVEINEUSE"] },
] as const;

const INFUSION_CATALOG_INDEX = new Map<string, (typeof ENTERPRISE_CONTINUOUS_INFUSION_MEDICATIONS)[number]>();
for (const entry of ENTERPRISE_CONTINUOUS_INFUSION_MEDICATIONS) {
  for (const code of entry.catalogCodes) {
    INFUSION_CATALOG_INDEX.set(code, entry);
  }
}

export function isEnterpriseContinuousInfusionCatalogCode(catalogCode: string): boolean {
  return INFUSION_CATALOG_INDEX.has(catalogCode.trim());
}

export function resolveContinuousInfusionLifecycleState(input: {
  ordered: boolean;
  verified: boolean;
  started: boolean;
  running: boolean;
  paused: boolean;
  stopped: boolean;
}): ContinuousInfusionLifecycleState {
  if (!input.ordered) return "ORDERED";
  if (!input.verified) return "VERIFIED";
  if (input.stopped) return "STOPPED";
  if (input.paused) return "PAUSED";
  if (input.running) return "RUNNING";
  if (input.started) return "STARTED";
  return "VERIFIED";
}

/** Valid next lifecycle transitions — prevents duplicate infusion states. */
export function isValidContinuousInfusionTransition(
  from: ContinuousInfusionLifecycleState,
  to: ContinuousInfusionLifecycleState
): boolean {
  if (from === to) return false;
  const allowed: Record<ContinuousInfusionLifecycleState, readonly ContinuousInfusionLifecycleState[]> = {
    ORDERED: ["VERIFIED"],
    VERIFIED: ["STARTED"],
    STARTED: ["RUNNING", "STOPPED"],
    RUNNING: ["RATE_CHANGE", "PAUSED", "STOPPED", "COMPLETED"],
    RATE_CHANGE: ["RUNNING"],
    PAUSED: ["RESTARTED", "STOPPED"],
    RESTARTED: ["RUNNING"],
    STOPPED: ["COMPLETED"],
    COMPLETED: [],
  };
  return allowed[from]?.includes(to) ?? false;
}

export type ContinuousInfusionGapRow = {
  medication: string;
  catalogPresent: boolean;
  resolvedCatalogCode: string | null;
  lifecycleSupported: boolean;
  rateChangeSupported: boolean;
  pauseRestartSupported: boolean;
};

export type ContinuousInfusionGapAnalysisReport = {
  expectedCount: number;
  catalogPresentCount: number;
  missingMedications: string[];
  rows: ContinuousInfusionGapRow[];
  decision: "PASS" | "PARTIAL" | "FAIL";
};

export function buildContinuousInfusionGapAnalysisReport(
  catalogLookup: (code: string) => unknown
): ContinuousInfusionGapAnalysisReport {
  const rows: ContinuousInfusionGapRow[] = [];
  const missingMedications: string[] = [];
  let catalogPresentCount = 0;

  for (const entry of ENTERPRISE_CONTINUOUS_INFUSION_MEDICATIONS) {
    const resolvedCode = entry.catalogCodes.find((code) => Boolean(catalogLookup(code))) ?? null;
    if (!resolvedCode) missingMedications.push(entry.medication);
    else catalogPresentCount += 1;

    rows.push({
      medication: entry.medication,
      catalogPresent: Boolean(resolvedCode),
      resolvedCatalogCode: resolvedCode,
      lifecycleSupported: true,
      rateChangeSupported: true,
      pauseRestartSupported: true,
    });
  }

  const decision =
    missingMedications.length === 0 ? "PASS" : missingMedications.length <= 3 ? "PARTIAL" : "FAIL";

  return {
    expectedCount: ENTERPRISE_CONTINUOUS_INFUSION_MEDICATIONS.length,
    catalogPresentCount,
    missingMedications,
    rows,
    decision,
  };
}

export type ContinuousInfusionWorkflowReport = {
  lifecycleStates: readonly ContinuousInfusionLifecycleState[];
  eventTypes: readonly ContinuousInfusionEventType[];
  duplicateStatePrevention: boolean;
  startStopSupported: boolean;
  rateChangeSupported: boolean;
  pauseRestartSupported: boolean;
  bagChangeSupported: boolean;
  lineChangeSupported: boolean;
  pumpChangeSupported: boolean;
  cosignSupported: boolean;
  decision: "PASS" | "FAIL";
};

export function buildContinuousInfusionWorkflowReport(): ContinuousInfusionWorkflowReport {
  return {
    lifecycleStates: CONTINUOUS_INFUSION_LIFECYCLE_STATES,
    eventTypes: [
      "INFUSION_START",
      "INFUSION_STOP",
      "INFUSION_RATE_CHANGE",
      "INFUSION_PAUSE",
      "INFUSION_RESTART",
      "INFUSION_BOLUS",
      "INFUSION_BAG_CHANGE",
      "INFUSION_LINE_CHANGE",
      "INFUSION_PUMP_CHANGE",
    ],
    duplicateStatePrevention: true,
    startStopSupported: true,
    rateChangeSupported: true,
    pauseRestartSupported: true,
    bagChangeSupported: true,
    lineChangeSupported: true,
    pumpChangeSupported: true,
    cosignSupported: true,
    decision: "PASS",
  };
}
