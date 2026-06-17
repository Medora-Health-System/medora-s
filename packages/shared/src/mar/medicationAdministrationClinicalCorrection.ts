import { z } from "zod";
import {
  isMedicationAdministrationCorrectionReasonCode,
  parseMedicationAdministrationCorrectionReasonCode,
  type MedicationAdministrationCorrectionReasonCode,
} from "./medicationAdministrationCorrectionGovernance.js";
import {
  medicationAdministrationRowIsInfusionStart,
  medicationAdministrationRowIsInfusionStop,
} from "./medicationAdministrationInfusionMar.js";

export const medicationAdministrationClinicalCorrectionDtoSchema = z
  .object({
    correctionReasonCode: z.string().trim().min(1),
    reason: z.string().max(500).optional(),
    doseValue: z.string().trim().optional(),
    doseUnit: z.string().trim().max(32).optional(),
    route: z.string().trim().max(64).optional(),
    relatedDuplicateAdministrationId: z.string().uuid().optional(),
  })
  .strict();

export type MedicationAdministrationClinicalCorrectionDto = z.infer<
  typeof medicationAdministrationClinicalCorrectionDtoSchema
>;

export type MedicationAdministrationClinicalCorrectionValidationCode =
  | "FORBIDDEN_WRONG_PATIENT"
  | "INVALID_REASON_CODE"
  | "REASON_REQUIRED"
  | "DOSE_REQUIRED"
  | "ROUTE_REQUIRED"
  | "NOT_ADMINISTERED"
  | "ALREADY_NOT_ADMINISTERED"
  | "INFUSION_DOSE_FORBIDDEN"
  | "INFUSION_ROUTE_FORBIDDEN"
  | "INFUSION_NOT_GIVEN_FORBIDDEN"
  | "NO_CHANGE"
  | "DUPLICATE_DETAIL_REQUIRED";

export type MedicationAdministrationClinicalCorrectionMarSnapshot = {
  doseValue: string | null;
  doseUnit: string | null;
  route: string | null;
  marAction: string | null;
  notes: string | null;
};

export type MedicationAdministrationClinicalCorrectionUpdatePlan = {
  reasonCode: MedicationAdministrationCorrectionReasonCode;
  previousValues: Record<string, unknown>;
  correctedValues: Record<string, unknown>;
  marUpdate: {
    doseValue?: string | null;
    doseUnit?: string | null;
    route?: string | null;
    marAction?: string;
    notes?: string | null;
  };
};

const CHARTED_NOT_GIVEN_NOTES_PREFIX = "Refused: DOCUMENTED_NOT_GIVEN";

export function medicationAdministrationClinicalCorrectionReasonRequiresDetail(
  code: MedicationAdministrationCorrectionReasonCode
): boolean {
  return code === "DUPLICATE_ENTRY" || code === "OTHER" || code === "DOCUMENTED_WRONG_PATIENT";
}

export function assertMedicationAdministrationInfusionClinicalCorrectionAllowed(input: {
  correctionReasonCode: MedicationAdministrationCorrectionReasonCode;
  infusionPhase?: string | null;
  notes?: string | null;
}): { ok: true } | { ok: false; code: MedicationAdministrationClinicalCorrectionValidationCode } {
  const infusionRow =
    medicationAdministrationRowIsInfusionStart(input.notes, input.infusionPhase) ||
    medicationAdministrationRowIsInfusionStop(input.notes, input.infusionPhase);

  if (!infusionRow) return { ok: true };

  if (input.correctionReasonCode === "DOCUMENTED_WRONG_DOSE") {
    return { ok: false, code: "INFUSION_DOSE_FORBIDDEN" };
  }
  if (input.correctionReasonCode === "DOCUMENTED_WRONG_ROUTE") {
    return { ok: false, code: "INFUSION_ROUTE_FORBIDDEN" };
  }
  if (input.correctionReasonCode === "DOCUMENTED_NOT_GIVEN") {
    return { ok: false, code: "INFUSION_NOT_GIVEN_FORBIDDEN" };
  }
  return { ok: true };
}

export function planMedicationAdministrationClinicalCorrection(input: {
  dto: MedicationAdministrationClinicalCorrectionDto;
  current: MedicationAdministrationClinicalCorrectionMarSnapshot;
  marActionResolved: string;
  infusionPhase?: string | null;
}): { ok: true; plan: MedicationAdministrationClinicalCorrectionUpdatePlan } | {
  ok: false;
  code: MedicationAdministrationClinicalCorrectionValidationCode;
} {
  const reasonCode = parseMedicationAdministrationCorrectionReasonCode(input.dto.correctionReasonCode);
  if (!reasonCode || !isMedicationAdministrationCorrectionReasonCode(reasonCode)) {
    return { ok: false, code: "INVALID_REASON_CODE" };
  }

  if (reasonCode === "DOCUMENTED_WRONG_PATIENT") {
    return { ok: false, code: "FORBIDDEN_WRONG_PATIENT" };
  }

  const infusionGate = assertMedicationAdministrationInfusionClinicalCorrectionAllowed({
    correctionReasonCode: reasonCode,
    infusionPhase: input.infusionPhase,
    notes: input.current.notes,
  });
  if (!infusionGate.ok) return infusionGate;

  const reasonDetail = input.dto.reason?.trim() || null;
  if (medicationAdministrationClinicalCorrectionReasonRequiresDetail(reasonCode) && !reasonDetail) {
    return {
      ok: false,
      code: reasonCode === "DUPLICATE_ENTRY" ? "DUPLICATE_DETAIL_REQUIRED" : "REASON_REQUIRED",
    };
  }

  const previousValues: Record<string, unknown> = {
    doseValue: input.current.doseValue,
    doseUnit: input.current.doseUnit,
    route: input.current.route,
    marAction: input.current.marAction ?? input.marActionResolved,
    notes: input.current.notes,
  };

  if (reasonCode === "DOCUMENTED_WRONG_DOSE") {
    const nextValue = input.dto.doseValue?.trim() || null;
    const nextUnit = input.dto.doseUnit?.trim() || input.current.doseUnit?.trim() || null;
    if (!nextValue) return { ok: false, code: "DOSE_REQUIRED" };
    const currentValue = input.current.doseValue?.trim() || null;
    const currentUnit = input.current.doseUnit?.trim() || null;
    if (currentValue === nextValue && (currentUnit ?? "") === (nextUnit ?? "")) {
      return { ok: false, code: "NO_CHANGE" };
    }
    if (input.marActionResolved !== "administered") {
      return { ok: false, code: "NOT_ADMINISTERED" };
    }
    return {
      ok: true,
      plan: {
        reasonCode,
        previousValues,
        correctedValues: { doseValue: nextValue, doseUnit: nextUnit },
        marUpdate: { doseValue: nextValue, doseUnit: nextUnit },
      },
    };
  }

  if (reasonCode === "DOCUMENTED_WRONG_ROUTE") {
    const nextRoute = input.dto.route?.trim() || null;
    if (!nextRoute) return { ok: false, code: "ROUTE_REQUIRED" };
    const currentRoute = input.current.route?.trim() || null;
    if (currentRoute === nextRoute) return { ok: false, code: "NO_CHANGE" };
    if (input.marActionResolved !== "administered") {
      return { ok: false, code: "NOT_ADMINISTERED" };
    }
    return {
      ok: true,
      plan: {
        reasonCode,
        previousValues,
        correctedValues: { route: nextRoute },
        marUpdate: { route: nextRoute },
      },
    };
  }

  if (reasonCode === "DOCUMENTED_NOT_GIVEN") {
    if (input.marActionResolved !== "administered") {
      return {
        ok: false,
        code: input.marActionResolved === "refused" ? "ALREADY_NOT_ADMINISTERED" : "NOT_ADMINISTERED",
      };
    }
    const refusedNotes = reasonDetail
      ? `${CHARTED_NOT_GIVEN_NOTES_PREFIX} — ${reasonDetail}`
      : CHARTED_NOT_GIVEN_NOTES_PREFIX;
    return {
      ok: true,
      plan: {
        reasonCode,
        previousValues,
        correctedValues: { marAction: "refused", notes: refusedNotes },
        marUpdate: { marAction: "refused", notes: refusedNotes },
      },
    };
  }

  if (reasonCode === "DUPLICATE_ENTRY") {
    const correctedValues: Record<string, unknown> = {
      duplicateDocumentationFlag: true,
    };
    if (input.dto.relatedDuplicateAdministrationId?.trim()) {
      correctedValues.relatedDuplicateAdministrationId = input.dto.relatedDuplicateAdministrationId.trim();
    }
    return {
      ok: true,
      plan: {
        reasonCode,
        previousValues,
        correctedValues,
        marUpdate: {},
      },
    };
  }

  if (reasonCode === "USER_ERROR" || reasonCode === "OTHER" || reasonCode === "LATE_DOCUMENTATION") {
    const nextValue = input.dto.doseValue?.trim() || null;
    const nextUnit = input.dto.doseUnit?.trim() || null;
    const nextRoute = input.dto.route?.trim() || null;
    const marUpdate: MedicationAdministrationClinicalCorrectionUpdatePlan["marUpdate"] = {};
    const correctedValues: Record<string, unknown> = {};

    if (nextValue) {
      marUpdate.doseValue = nextValue;
      correctedValues.doseValue = nextValue;
      if (nextUnit) {
        marUpdate.doseUnit = nextUnit;
        correctedValues.doseUnit = nextUnit;
      }
    }
    if (nextRoute) {
      marUpdate.route = nextRoute;
      correctedValues.route = nextRoute;
    }
    if (Object.keys(correctedValues).length === 0) {
      return { ok: false, code: "NO_CHANGE" };
    }
    if (input.marActionResolved !== "administered") {
      return { ok: false, code: "NOT_ADMINISTERED" };
    }
    return {
      ok: true,
      plan: { reasonCode, previousValues, correctedValues, marUpdate },
    };
  }

  return { ok: false, code: "INVALID_REASON_CODE" };
}
