import { BLOOD_PRODUCT_INITIATION_CARD_ID, BLOOD_PRODUCT_VERIFICATION_CARD_ID } from "./bloodProductDocumentationPayloads.js";
import { requiresImmediateWitnessCaptureForBelongingsPayload } from "./belongingsValuablesDocumentationPayloads.js";
import { HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID } from "./highAlertInfusionDocumentationPayloads.js";
import { RESTRAINT_INITIATION_CARD_ID } from "./restraintDocumentationPayloads.js";

/** EDOC.8B — cards requiring witness selection before first save (no orphan PENDING_WITNESS). */
export const DEFAULT_IMMEDIATE_WITNESS_CAPTURE_CARD_IDS = [
  BLOOD_PRODUCT_VERIFICATION_CARD_ID,
  BLOOD_PRODUCT_INITIATION_CARD_ID,
  RESTRAINT_INITIATION_CARD_ID,
  HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID,
] as const;

/**
 * Future Phase — immediate witness candidates (documented only; not enabled by default):
 * - procedural sedation verification
 * - PCA verification
 * - chemotherapy verification
 * - controlled substance waste
 * - belongings/valuables handoff for altered/unconscious patient
 */
export const EDOC_8B_FUTURE_IMMEDIATE_WITNESS_CANDIDATES = [
  "proc_sedation_verification",
  "pca_verification",
  "chemotherapy_verification",
  "controlled_substance_waste",
  "safety_belongings_checklist",
] as const;

/** EDOC.8B + EDOC.9 — card and payload rules for pre-save witness capture. */
export function requiresImmediateWitnessCaptureForPayload(
  cardId: string,
  payload: Record<string, unknown>
): boolean {
  if ((DEFAULT_IMMEDIATE_WITNESS_CAPTURE_CARD_IDS as readonly string[]).includes(cardId)) {
    return true;
  }
  return requiresImmediateWitnessCaptureForBelongingsPayload(cardId, payload);
}

export function requiresImmediateWitnessCapture(cardId: string): boolean {
  return requiresImmediateWitnessCaptureForPayload(cardId, {});
}
