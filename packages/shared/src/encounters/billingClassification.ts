import { z } from "zod";
import type { EncounterType } from "../schemas/patient.js";

/** Phase 19UCED.1 — facility billing site profile (not clinical workflow). */
export const facilityBillingSiteTypeSchema = z.enum([
  "CLINIC",
  "URGENT_CARE",
  "FREESTANDING_ER",
  "HOSPITAL",
  "HYBRID",
]);
export type FacilityBillingSiteType = z.infer<typeof facilityBillingSiteTypeSchema>;

/** Phase 19UCED.1 — encounter billing/regulatory classification (one chart, many classifications). */
export const billingClassificationSchema = z.enum([
  "CLINIC_VISIT",
  "URGENT_CARE",
  "EMERGENCY_DEPARTMENT",
  "OBSERVATION",
  "INPATIENT",
  "PROCEDURE",
  "TELEHEALTH",
]);
export type BillingClassification = z.infer<typeof billingClassificationSchema>;

/** Clinical workflow type — derived from encounter.type; not duplicated on Encounter row. */
export const clinicalWorkflowTypeSchema = z.enum([
  "AMBULATORY",
  "EMERGENCY",
  "OBSERVATION",
  "INPATIENT",
]);
export type ClinicalWorkflowType = z.infer<typeof clinicalWorkflowTypeSchema>;

export const billingClassificationChangeReasonCodeSchema = z.enum([
  "HIGHER_ACUITY_WORKUP_REQUIRED",
  "PROVIDER_DIRECTED_ED_EVALUATION",
  "PATIENT_AGREED_TO_ED_BILLING",
  "FACILITY_POLICY",
  "OTHER",
]);
export type BillingClassificationChangeReasonCode = z.infer<
  typeof billingClassificationChangeReasonCodeSchema
>;

export const billingClassificationAcknowledgmentMethodSchema = z.enum([
  "SIGNED_FORM",
  "ELECTRONIC_ACKNOWLEDGMENT",
  "VERBAL_WITH_WITNESS",
  "NOT_APPLICABLE_PER_POLICY",
]);
export type BillingClassificationAcknowledgmentMethod = z.infer<
  typeof billingClassificationAcknowledgmentMethodSchema
>;

export type BillingClassificationTransitionEntry = {
  from: BillingClassification;
  to: BillingClassification;
  reasonCode: BillingClassificationChangeReasonCode;
  freeTextReasonPresent: boolean;
  patientAcknowledged: boolean;
  acknowledgmentMethod: BillingClassificationAcknowledgmentMethod;
  changedAt: string;
  changedById: string;
  facilityId: string;
};

export const encounterBillingClassificationPatchDtoSchema = z
  .object({
    classification: billingClassificationSchema,
    reasonCode: billingClassificationChangeReasonCodeSchema,
    acknowledgmentMethod: billingClassificationAcknowledgmentMethodSchema,
    patientAcknowledged: z.boolean(),
    /** Short operational note — avoid PHI-heavy clinical narrative. */
    changeReason: z.string().max(512).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.classification === "EMERGENCY_DEPARTMENT") {
      if (!data.patientAcknowledged) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Patient acknowledgment required for ED billing classification.",
          path: ["patientAcknowledged"],
        });
      }
    }
  });

export type EncounterBillingClassificationPatchDto = z.infer<
  typeof encounterBillingClassificationPatchDtoSchema
>;

export function mapEncounterTypeToClinicalWorkflowType(
  encounterType: EncounterType,
): ClinicalWorkflowType {
  switch (encounterType) {
    case "EMERGENCY":
      return "EMERGENCY";
    case "INPATIENT":
      return "OBSERVATION";
    case "URGENT_CARE":
    case "OUTPATIENT":
    default:
      return "AMBULATORY";
  }
}

export type DefaultBillingClassificationInput = {
  facilityBillingSiteType: FacilityBillingSiteType | null;
  encounterType: EncounterType;
  /** When HYBRID facility explicitly routes new visits as ED (facility policy config). */
  hybridRoutesAsEd?: boolean;
};

/**
 * Deterministic defaults — never uses chief complaint or diagnosis.
 * Facility profile takes precedence; encounter.type is fallback when facility unset.
 */
export function resolveDefaultBillingClassification(
  input: DefaultBillingClassificationInput,
): BillingClassification {
  const { facilityBillingSiteType, encounterType, hybridRoutesAsEd = false } = input;

  if (facilityBillingSiteType) {
    switch (facilityBillingSiteType) {
      case "CLINIC":
        return "CLINIC_VISIT";
      case "URGENT_CARE":
        return "URGENT_CARE";
      case "FREESTANDING_ER":
        return "EMERGENCY_DEPARTMENT";
      case "HOSPITAL":
        return encounterType === "INPATIENT" ? "OBSERVATION" : "EMERGENCY_DEPARTMENT";
      case "HYBRID":
        return hybridRoutesAsEd ? "EMERGENCY_DEPARTMENT" : "URGENT_CARE";
      default:
        break;
    }
  }

  switch (encounterType) {
    case "OUTPATIENT":
      return "CLINIC_VISIT";
    case "URGENT_CARE":
      return "URGENT_CARE";
    case "EMERGENCY":
      return "EMERGENCY_DEPARTMENT";
    case "INPATIENT":
      return "OBSERVATION";
    default:
      return "URGENT_CARE";
  }
}

export function mapEncounterTypeToLegacyBillingClassification(
  encounterType: EncounterType,
): BillingClassification {
  return resolveDefaultBillingClassification({
    facilityBillingSiteType: null,
    encounterType,
  });
}

export type BillingClassificationTransitionValidation = {
  allowed: boolean;
  requiresAcknowledgment: boolean;
  requiresElevatedPermission: boolean;
  code?: string;
};

/** Explicit transitions only — no silent or complaint-driven changes. */
export function validateBillingClassificationTransition(params: {
  from: BillingClassification;
  to: BillingClassification;
  isAdmin: boolean;
}): BillingClassificationTransitionValidation {
  const { from, to, isAdmin } = params;
  if (from === to) {
    return { allowed: false, requiresAcknowledgment: false, requiresElevatedPermission: false, code: "NO_OP" };
  }

  if (from === "URGENT_CARE" && to === "EMERGENCY_DEPARTMENT") {
    return { allowed: true, requiresAcknowledgment: true, requiresElevatedPermission: false };
  }

  if (from === "EMERGENCY_DEPARTMENT" && to === "URGENT_CARE") {
    return {
      allowed: isAdmin,
      requiresAcknowledgment: true,
      requiresElevatedPermission: true,
      code: isAdmin ? undefined : "ED_DOWNGRADE_REQUIRES_ADMIN",
    };
  }

  if (isAdmin) {
    return { allowed: true, requiresAcknowledgment: false, requiresElevatedPermission: false };
  }

  return {
    allowed: false,
    requiresAcknowledgment: false,
    requiresElevatedPermission: true,
    code: "TRANSITION_REQUIRES_ADMIN",
  };
}

export const BILLING_CLASSIFICATION_BADGE_SOFT: Record<
  BillingClassification,
  { bg: string; text: string; border: string }
> = {
  CLINIC_VISIT: { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" },
  URGENT_CARE: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  EMERGENCY_DEPARTMENT: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  OBSERVATION: { bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" },
  INPATIENT: { bg: "#eef2ff", text: "#312e81", border: "#c7d2fe" },
  PROCEDURE: { bg: "#f8fafc", text: "#334155", border: "#94a3b8" },
  TELEHEALTH: { bg: "#ecfeff", text: "#0e7490", border: "#a5f3fc" },
};

export const UC_TO_ED_ACKNOWLEDGMENT_PLACEHOLDER_FR =
  "Le patient a été informé que la classification de facturation de la visite peut passer de Soins urgents à Urgences selon le niveau d'évaluation et la politique de l'établissement. Le patient a reconnu ce changement avant la conversion.";

export const UC_TO_ED_ACKNOWLEDGMENT_PLACEHOLDER_EN =
  "The patient was informed that the visit billing classification may change from Urgent Care to Emergency Department based on the level of evaluation and facility policy. The patient acknowledged this change before conversion.";

/** PHI-safe audit metadata keys for ENCOUNTER_BILLING_CLASSIFICATION_CHANGED */
export const BILLING_CLASSIFICATION_AUDIT_METADATA_KEYS = [
  "encounterId",
  "patientId",
  "facilityId",
  "fromClassification",
  "toClassification",
  "reasonCode",
  "patientAcknowledged",
  "acknowledgmentMethod",
  "actorId",
  "timestamp",
] as const;

export const FORBIDDEN_BILLING_CLASSIFICATION_AUDIT_KEYS = [
  "chiefComplaint",
  "diagnosis",
  "freeTextClinicalRationale",
  "payer",
  "medicalDetails",
] as const;
