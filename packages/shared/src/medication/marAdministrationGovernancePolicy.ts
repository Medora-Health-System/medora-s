import type { MarClinicalAction } from "../mar/marClinicalAction.js";

/** High-alert classes that require MAR double-check (M1.7A.9). */
export const MAR_DOUBLE_CHECK_HIGH_ALERT_CLASSES = [
  "HIGH_ALERT_INSULIN",
  "HIGH_ALERT_ANTICOAGULANT",
] as const;

export type MarDoubleCheckInput = {
  highAlertClass?: string | null;
  safetyRequirementCodes?: string[] | null;
  requiresDoubleSign?: boolean | null;
  isHighAlert?: boolean | null;
  route?: string | null;
  catalogCode?: string | null;
  genericName?: string | null;
  therapeuticClass?: string | null;
  /** True when order line uses continuous infusion lifecycle (not IV push/bolus). */
  isContinuousInfusion?: boolean;
};

function trimOrNull(v: string | null | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

/** Blood product medications (transfusion catalog entries). */
export function isBloodProductMedicationCatalog(input: {
  catalogCode?: string | null;
  therapeuticClass?: string | null;
  genericName?: string | null;
}): boolean {
  const code = (input.catalogCode ?? "").toUpperCase();
  const patterns = [
    "BLOOD",
    "RBC",
    "FFP",
    "PLATELET",
    "PLASMA",
    "CRYO",
    "PRBC",
    "TRANSFUSION",
  ];
  if (patterns.some((p) => code.includes(p))) return true;
  const tc = (input.therapeuticClass ?? "").toUpperCase();
  if (tc.includes("BLOOD")) return true;
  const gn = (input.genericName ?? "").toUpperCase();
  if (
    gn.includes("BLOOD") ||
    gn.includes("PLATELET") ||
    gn.includes("PLASMA") ||
    gn.includes("RBC")
  ) {
    return true;
  }
  return false;
}

/** PCA / PCP patient-controlled analgesia pump route. */
export function isPcaOrPcpOpioidPumpRoute(route: string | null | undefined): boolean {
  const n = trimOrNull(route)?.toLowerCase() ?? "";
  if (!n) return false;
  if (n.includes("pca") || n.includes("pcp")) return true;
  if (n.includes("patient controlled")) return true;
  return false;
}

function isOpioidMedicationHint(input: MarDoubleCheckInput): boolean {
  const cls = trimOrNull(input.highAlertClass);
  if (cls === "HIGH_ALERT_OPIOID") return true;
  const hay = `${input.genericName ?? ""} ${input.catalogCode ?? ""}`.toLowerCase();
  return (
    hay.includes("morphine") ||
    hay.includes("hydromorphone") ||
    hay.includes("fentanyl") ||
    hay.includes("opioid")
  );
}

/**
 * M1.7A.9 — double-check required only for insulin, heparin/anticoagulant class,
 * blood products, and PCA/PCP continuous opioid pump administration.
 */
export function marAdministrationRequiresDoubleCheck(input: MarDoubleCheckInput): boolean {
  if (isBloodProductMedicationCatalog(input)) return true;

  const cls = trimOrNull(input.highAlertClass);
  if (cls && (MAR_DOUBLE_CHECK_HIGH_ALERT_CLASSES as readonly string[]).includes(cls)) {
    return true;
  }

  if (isPcaOrPcpOpioidPumpRoute(input.route) && isOpioidMedicationHint(input)) {
    return true;
  }

  if (input.isContinuousInfusion === true && isOpioidMedicationHint(input)) {
    return true;
  }

  return false;
}

/** M1.7A.9 — pharmacy verification is informational at MAR; never blocks administration. */
export function marPharmacyVerificationBlocksAdministration(): boolean {
  return false;
}

/** MAR modal blocking pharmacy workflow (always hidden per M1.7A.9). */
export function marPharmacyBlockingWorkflowVisible(
  _governance: { requiresPharmacyVerification?: boolean | null },
  _marAction: MarClinicalAction | string
): boolean {
  return false;
}
