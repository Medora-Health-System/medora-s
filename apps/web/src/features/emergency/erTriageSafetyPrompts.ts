import { encounterHasMedicationSafetyAllergyDocumentation } from "@medora/shared";
import type { ErTriageV1Form } from "./medoraErTriageV1";
import { mergeVitalsJsonForSave, type VitalsJsonMergeFormInput } from "./emergencyTriageVitalsMerge";

const CHEST_PAIN_MARKERS = [
  "chest pain",
  "douleur thoracique",
  "thoracic pain",
  "angina",
  "precordial",
  "douleur precordiale",
] as const;

/** True when chief complaint text suggests chest pain (templates apply plain text). */
export function chiefComplaintSuggestsChestPain(chiefComplaint: string): boolean {
  const s = chiefComplaint.trim().toLowerCase();
  if (!s) return false;
  return CHEST_PAIN_MARKERS.some((m) => s.includes(m));
}

const HIGH_ACUITY_REFERRAL_NEEDLES = [
  "ambulance",
  "ems",
  "paramedic",
  "paramedics",
  "transfer",
  "transfert",
  "samu",
  "smur",
  "911",
  "evacuation",
] as const;

/** Structured routing codes or free-text referral hints for ambulance / EMS / transfer. */
export function erTriageV1HasHighAcuityArrivalSource(er: ErTriageV1Form): boolean {
  const codes = er.sourceRoutingSelections;
  if (codes.includes("AMBULANCE") || codes.includes("TRANSFER")) return true;
  const ref = er.referralSource.trim().toLowerCase();
  if (!ref) return false;
  return HIGH_ACUITY_REFERRAL_NEEDLES.some((n) => ref.includes(n));
}

/**
 * Same allergy-documentation rule as medication safety, scoped to merged triage vitalsJson draft
 * (triage-level allergy note + medoraErTriageV1 allergy fields only — vitals/nursing not included).
 */
export function draftTriageHasAllergyDocumentation(
  previousVitalsJson: unknown,
  form: VitalsJsonMergeFormInput
): boolean {
  const merged = mergeVitalsJsonForSave(previousVitalsJson, form);
  return encounterHasMedicationSafetyAllergyDocumentation({
    triageVitalsJson: merged && typeof merged === "object" ? merged : {},
  });
}
