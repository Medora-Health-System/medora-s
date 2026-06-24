/**
 * MEDUI.MEDICATION.CONTROLLED_SUBSTANCES_WAVE_A_B_PROVIDER_ORDERING_ACTIVATION.1
 * Medora controlled-substance MAR workflow — Pyxis externalizes routine waste/witness.
 */

import { isPcaOrPcpOpioidPumpRoute } from "./marAdministrationGovernancePolicy.js";
import type { ControlledSubstanceMarGovernanceContext } from "./controlledSubstanceMarGovernance.js";

export type ControlledSubstanceMarWorkflowMode =
  | "ROUTINE_PYXIS_EXTERNALIZED"
  | "MEDORA_DUAL_SIGN_REQUIRED"
  | "PCA_EXCLUDED";

const ANESTHESIA_TERMS = ["propofol", "ketamine", "etomidate", "dexmedetomidine"];
const PARALYTIC_TERMS = ["succinylcholine", "rocuronium", "vecuronium", "cisatracurium"];
const PCA_EXCLUDED_TERMS = ["pca", "patient controlled analgesia"];

export type ResolveControlledSubstanceMarWorkflowInput = {
  catalogCode?: string | null;
  genericName?: string | null;
  route?: string | null;
  administrationType?: string | null;
  isControlled?: boolean;
  requiresWitness?: boolean;
  requiresDoubleSign?: boolean;
  isContinuousInfusion?: boolean;
};

function hay(input: ResolveControlledSubstanceMarWorkflowInput): string {
  return [
    input.catalogCode ?? "",
    input.genericName ?? "",
    input.route ?? "",
    input.administrationType ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function resolveControlledSubstanceMarWorkflowMode(
  input: ResolveControlledSubstanceMarWorkflowInput
): ControlledSubstanceMarWorkflowMode {
  const text = hay(input);
  if (ANESTHESIA_TERMS.some((term) => text.includes(term))) return "PCA_EXCLUDED";
  if (PARALYTIC_TERMS.some((term) => text.includes(term))) return "PCA_EXCLUDED";
  if (PCA_EXCLUDED_TERMS.some((term) => text.includes(term))) return "PCA_EXCLUDED";
  if (isPcaOrPcpOpioidPumpRoute(input.route)) return "PCA_EXCLUDED";

  const admin = (input.administrationType ?? "").toUpperCase();
  const opioidInfusionPump =
    input.isContinuousInfusion === true &&
    (text.includes("morphine") || text.includes("hydromorphone") || text.includes("fentanyl") || text.includes("opioid"));

  const insulin = text.includes("insulin");
  const heparinIvpb =
    text.includes("heparin") &&
    (admin === "IVPB" || admin === "INFUSION" || text.includes("perfusion") || input.isContinuousInfusion === true);

  if (opioidInfusionPump || insulin || heparinIvpb || input.requiresDoubleSign === true) {
    return "MEDORA_DUAL_SIGN_REQUIRED";
  }

  if (input.isControlled) return "ROUTINE_PYXIS_EXTERNALIZED";
  return "ROUTINE_PYXIS_EXTERNALIZED";
}

/** Build MAR governance context for controlled-substance administration. */
export function resolveControlledSubstanceMarGovernanceContext(
  input: ResolveControlledSubstanceMarWorkflowInput
): ControlledSubstanceMarGovernanceContext {
  const mode = resolveControlledSubstanceMarWorkflowMode(input);
  const isControlled = Boolean(input.isControlled);
  return {
    isControlled,
    requiresWitness: mode === "MEDORA_DUAL_SIGN_REQUIRED",
    wasteDocumentationRecommended: mode === "MEDORA_DUAL_SIGN_REQUIRED",
    pyxisWasteWitnessExternalized: mode === "ROUTINE_PYXIS_EXTERNALIZED",
    medoraWitnessRequired: mode === "MEDORA_DUAL_SIGN_REQUIRED",
  };
}

export function routineControlledSubstancePyxisExternalized(
  input: ResolveControlledSubstanceMarWorkflowInput
): boolean {
  return resolveControlledSubstanceMarWorkflowMode(input) === "ROUTINE_PYXIS_EXTERNALIZED";
}
