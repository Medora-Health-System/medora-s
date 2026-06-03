import { BadRequestException } from "@nestjs/common";
import { createStructuredLogger } from "../common/logging/structured-logger";

const marCreateLog = createStructuredLogger("MedicationAdministrationCreate");

export type MarCreateValidationBlockedLog = {
  encounterId: string;
  orderItemId?: string | null;
  medicationProductId?: string | null;
  catalogMedicationId?: string | null;
  marAction?: string | null;
  governanceBlockerCode?: string | null;
  missingFields?: string[];
  message: string;
};

/** PHI-safe structured log when MAR create validation rejects (M1.7A.8). */
export function logMarCreateValidationBlocked(input: MarCreateValidationBlockedLog): void {
  marCreateLog.warn("mar_create_validation_blocked", {
    encounterId: input.encounterId,
    orderItemId: input.orderItemId ?? null,
    medicationProductId: input.medicationProductId ?? null,
    catalogMedicationId: input.catalogMedicationId ?? null,
    marAction: input.marAction ?? null,
    governanceBlockerCode: input.governanceBlockerCode ?? null,
    missingFields: input.missingFields ?? [],
    message: input.message,
  });
}

export function badRequestExceptionMessage(err: BadRequestException): string {
  const response = err.getResponse();
  if (typeof response === "string") return response;
  if (response && typeof response === "object" && "message" in response) {
    const m = (response as { message: string | string[] }).message;
    return Array.isArray(m) ? m.join("; ") : String(m);
  }
  return String(err.message);
}

export function governanceBlockerCodeFromMessage(message: string): string | null {
  const m = message.trim();
  if (m.includes("Vérification pharmacie requise")) return "PHARMACY_VERIFICATION_REQUIRED";
  if (m.includes("Vérification pharmacie refusée")) return "PHARMACY_VERIFICATION_REJECTED";
  if (m.includes("Témoin requis")) return "CONTROLLED_WITNESS_REQUIRED";
  if (m.includes("double")) return "HIGH_ALERT_VERIFIER_REQUIRED";
  if (m.includes("LASA")) return "LASA_ACKNOWLEDGEMENT_REQUIRED";
  if (m.includes("allergies") || m.includes("allergies ou intolérances")) {
    return "ALLERGY_ACKNOWLEDGEMENT_REQUIRED";
  }
  if (m.includes("site d'injection") || m.includes("injection")) return "INJECTION_SITE_REQUIRED";
  if (m.includes("infusion start/stop")) return "INFUSION_LIFECYCLE_REQUIRED";
  if (m.includes("Données invalides") || m.includes("Invalid")) return "DTO_VALIDATION_FAILED";
  return null;
}
