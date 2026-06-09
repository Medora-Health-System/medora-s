import type { MarClinicalAction } from "../mar/marClinicalAction.js";
import { isApprovedElectrolyteIvpbMedication } from "./electrolyteIvpbGovernance.js";
import {
  resolveMarMedicationRouteCategory,
  type MarMedicationRouteCategory,
} from "./marMedicationRouteNormalization.js";

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
  orderRoute?: string | null;
  marRoute?: string | null;
  catalogRoute?: string | null;
  administrationType?: string | null;
  catalogCode?: string | null;
  genericName?: string | null;
  dosageForm?: string | null;
  therapeuticClass?: string | null;
  /** True when order line uses continuous infusion lifecycle (not IV push/bolus). */
  isContinuousInfusion?: boolean;
  infusionPhase?: string | null;
};

export type ResolveMarDoubleCheckRequirementInput = MarDoubleCheckInput & {
  medicationName?: string | null;
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

function isOpioidMedicationHint(input: ResolveMarDoubleCheckRequirementInput): boolean {
  const cls = trimOrNull(input.highAlertClass);
  if (cls === "HIGH_ALERT_OPIOID") return true;
  const name = input.medicationName ?? input.genericName ?? "";
  const hay = `${name} ${input.catalogCode ?? ""}`.toLowerCase();
  return (
    hay.includes("morphine") ||
    hay.includes("hydromorphone") ||
    hay.includes("fentanyl") ||
    hay.includes("opioid")
  );
}

function resolveRouteCategoryForPolicy(
  input: ResolveMarDoubleCheckRequirementInput
): MarMedicationRouteCategory {
  return resolveMarMedicationRouteCategory({
    orderRoute: input.orderRoute,
    marRoute: input.marRoute,
    catalogRoute: input.catalogRoute,
    route: input.route,
    administrationType: input.administrationType,
    isContinuousInfusion: input.isContinuousInfusion,
  });
}

function primaryRouteForOpioidHints(input: ResolveMarDoubleCheckRequirementInput): string | null {
  return (
    trimOrNull(input.route) ??
    trimOrNull(input.orderRoute) ??
    trimOrNull(input.marRoute) ??
    trimOrNull(input.catalogRoute)
  );
}

function insulinRequiresDoubleCheck(routeCategory: MarMedicationRouteCategory, input: ResolveMarDoubleCheckRequirementInput): boolean {
  if (routeCategory === "SQ" || routeCategory === "IVP" || routeCategory === "IVPB") {
    return true;
  }
  if (input.isContinuousInfusion === true) {
    return true;
  }
  // Unspecified route: retain class-based enforcement for insulin (M1.7A.9).
  if (routeCategory === "OTHER") {
    return true;
  }
  return false;
}

function anticoagulantRequiresDoubleCheck(
  routeCategory: MarMedicationRouteCategory,
  input: ResolveMarDoubleCheckRequirementInput
): boolean {
  if (routeCategory === "SQ") {
    return false;
  }
  if (routeCategory === "IVP" || routeCategory === "IVPB") {
    return true;
  }
  if (input.isContinuousInfusion === true) {
    return true;
  }
  // Unspecified / generic IV route: require verifier (SQ is the only exempt route).
  if (routeCategory === "OTHER") {
    return true;
  }
  return false;
}

function electrolyteIvpbStartRequiresWitness(
  routeCategory: MarMedicationRouteCategory,
  input: ResolveMarDoubleCheckRequirementInput
): boolean {
  if (routeCategory !== "IVPB") {
    return false;
  }
  if (
    !isApprovedElectrolyteIvpbMedication({
      catalogCode: input.catalogCode,
      genericName: input.genericName,
      medicationName: input.medicationName,
      administrationType: input.administrationType,
      dosageForm: input.dosageForm,
    })
  ) {
    return false;
  }

  const cls = trimOrNull(input.highAlertClass);
  if (cls === "HIGH_ALERT_ELECTROLYTE" || input.requiresDoubleSign === true) {
    return true;
  }
  return false;
}

/**
 * M1.8B.7E.1 / M1.8B.7E.2B — high-alert insulin/heparin/electrolyte IVPB infusion START requires
 * second-clinician verification. Blood products remain exempt at START (witness at STOP per API-07).
 */
export function marInfusionStartRequiresHighAlertIvpbWitness(
  input: ResolveMarDoubleCheckRequirementInput
): boolean {
  if (
    isBloodProductMedicationCatalog({
      catalogCode: input.catalogCode,
      therapeuticClass: input.therapeuticClass,
      genericName: input.medicationName ?? input.genericName,
    })
  ) {
    return false;
  }

  const cls = trimOrNull(input.highAlertClass);
  const routeCategory = resolveRouteCategoryForPolicy(input);

  if (cls === "HIGH_ALERT_INSULIN" && routeCategory === "IVPB") {
    return insulinRequiresDoubleCheck(routeCategory, input);
  }

  if (cls === "HIGH_ALERT_ANTICOAGULANT" && routeCategory === "IVPB") {
    return anticoagulantRequiresDoubleCheck(routeCategory, input);
  }

  if (electrolyteIvpbStartRequiresWitness(routeCategory, input)) {
    return true;
  }

  return false;
}

/**
 * M1.8B.4A — route-aware MAR independent double-check requirement.
 * Insulin: SQ / IVP / IVPB require verifier. Heparin SQ exempt; IVP / IVPB require verifier.
 * Blood products, PCA/continuous opioid, and controlled witness paths unchanged.
 */
export function resolveMarDoubleCheckRequirement(
  input: ResolveMarDoubleCheckRequirementInput
): boolean {
  if (
    isBloodProductMedicationCatalog({
      catalogCode: input.catalogCode,
      therapeuticClass: input.therapeuticClass,
      genericName: input.medicationName ?? input.genericName,
    })
  ) {
    return true;
  }

  if (trimOrNull(input.infusionPhase) === "INFUSION_START") {
    return marInfusionStartRequiresHighAlertIvpbWitness(input);
  }

  const cls = trimOrNull(input.highAlertClass);
  const routeCategory = resolveRouteCategoryForPolicy(input);

  if (cls === "HIGH_ALERT_INSULIN") {
    return insulinRequiresDoubleCheck(routeCategory, input);
  }

  if (cls === "HIGH_ALERT_ANTICOAGULANT") {
    return anticoagulantRequiresDoubleCheck(routeCategory, input);
  }

  const opioidRoute = primaryRouteForOpioidHints(input);
  if (isPcaOrPcpOpioidPumpRoute(opioidRoute) && isOpioidMedicationHint(input)) {
    return true;
  }

  if (input.isContinuousInfusion === true && isOpioidMedicationHint(input)) {
    return true;
  }

  return false;
}

/**
 * M1.7A.9 / M1.8B.4A — double-check required for route-governed insulin/heparin,
 * blood products, and PCA/PCP continuous opioid pump administration.
 */
export function marAdministrationRequiresDoubleCheck(input: MarDoubleCheckInput): boolean {
  return resolveMarDoubleCheckRequirement({
    ...input,
    medicationName: input.genericName,
  });
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
