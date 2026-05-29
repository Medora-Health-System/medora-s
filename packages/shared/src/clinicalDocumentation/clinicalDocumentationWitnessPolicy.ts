import { z } from "zod";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";

/** Platform default: card IDs requiring a second signer (witness). */
export const DEFAULT_WITNESS_REQUIRED_CARD_IDS = [
  "blood_product_verification",
  "blood_product_initiation",
  "high_alert_infusion_verification",
  "flow_blood_product_administration",
  "safety_restraint_initial",
  "flow_restraint_monitoring",
  "safety_belongings_checklist",
  "score_gcs",
  "safety_behavioral_observation",
  "flow_procedural_sedation",
  "proc_sedation_monitoring",
] as const;

/** Tags that imply dual-signature when present on a card (explicit per-card policy preferred for EDOC.8). */
export const CLINICAL_DOCUMENTATION_WITNESS_POLICY_TAGS = [
  "witness_required",
  "altered_consciousness",
  "controlled_substance_waste",
] as const;

export const facilityClinicalDocumentationWitnessPolicySchema = z
  .object({
    additionalCardIds: z.array(z.string().min(1).max(120)).optional(),
    disabledCardIds: z.array(z.string().min(1).max(120)).optional(),
    /** EDOC.8 — medication types requiring witness on titration entries when listed. */
    witnessRequiredTitrationMedicationTypes: z.array(z.string().min(1).max(80)).optional(),
  })
  .strict();

export type FacilityClinicalDocumentationWitnessPolicy = z.infer<
  typeof facilityClinicalDocumentationWitnessPolicySchema
>;

export function parseFacilityClinicalDocumentationWitnessPolicy(
  raw: unknown
): FacilityClinicalDocumentationWitnessPolicy | null {
  if (raw == null) return null;
  const parsed = facilityClinicalDocumentationWitnessPolicySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function resolveRequiresWitnessSignature(
  cardId: string,
  facilityPolicy?: FacilityClinicalDocumentationWitnessPolicy | null
): boolean {
  if (facilityPolicy?.disabledCardIds?.includes(cardId)) {
    return false;
  }
  if (facilityPolicy?.additionalCardIds?.includes(cardId)) {
    return true;
  }
  if ((DEFAULT_WITNESS_REQUIRED_CARD_IDS as readonly string[]).includes(cardId)) {
    return true;
  }
  const card = getClinicalDocumentationCardById(cardId);
  if (!card) return false;
  if (card.requiresWitnessSignature === true) return true;
  return card.tags.some((t) =>
    (CLINICAL_DOCUMENTATION_WITNESS_POLICY_TAGS as readonly string[]).includes(t)
  );
}
