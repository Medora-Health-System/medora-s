import { z } from "zod";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";

/** Platform default: card IDs requiring a second signer (witness). */
export const DEFAULT_WITNESS_REQUIRED_CARD_IDS = [
  "blood_transfusion",
  "blood_massive_transfusion",
  "flow_blood_product_administration",
  "blood_transfusion_reaction",
  "safety_restraint_initial",
  "flow_restraint_monitoring",
  "safety_belongings_checklist",
  "score_gcs",
  "safety_behavioral_observation",
  "flow_procedural_sedation",
  "proc_sedation_monitoring",
] as const;

/** Future high-alert infusion / controlled-substance cards use these tags in the registry. */
export const CLINICAL_DOCUMENTATION_WITNESS_POLICY_TAGS = [
  "witness_required",
  "high_alert_infusion",
  "altered_consciousness",
  "controlled_substance_waste",
] as const;

export const facilityClinicalDocumentationWitnessPolicySchema = z
  .object({
    additionalCardIds: z.array(z.string().min(1).max(120)).optional(),
    disabledCardIds: z.array(z.string().min(1).max(120)).optional(),
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
