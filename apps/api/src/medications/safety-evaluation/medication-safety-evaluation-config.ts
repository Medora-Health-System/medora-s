import {
  assertNoOrderBlocking,
  assertNoProviderFacingAlerts,
  PHASE10_SAFETY_EVALUATION_DEFAULTS,
  resolveMedicationSafetyEvaluationMode,
  type MedicationSafetyEvaluationMode,
} from "@medora/shared";

export function getMedicationSafetyEvaluationMode(
  env: NodeJS.ProcessEnv = process.env
): MedicationSafetyEvaluationMode {
  const mode = resolveMedicationSafetyEvaluationMode(
    env.MEDICATION_SAFETY_EVALUATION_MODE
  );
  assertNoProviderFacingAlerts(
    PHASE10_SAFETY_EVALUATION_DEFAULTS.providerFacingAlertsEnabled
  );
  assertNoOrderBlocking(PHASE10_SAFETY_EVALUATION_DEFAULTS.orderBlockingEnabled);
  return mode;
}

export function assertEvaluationModeAllowsShadowRun(
  mode: MedicationSafetyEvaluationMode
): void {
  if (mode !== "SHADOW") {
    throw new Error(
      `Medication safety evaluation is ${mode}; shadow runs require MEDICATION_SAFETY_EVALUATION_MODE=shadow.`
    );
  }
}
