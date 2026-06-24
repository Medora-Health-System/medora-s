import type { ZodError } from "zod";
import { createStructuredLogger } from "../common/logging/structured-logger";

const log = createStructuredLogger("MedicationOrderCreateValidation");

export type MedicationOrderValidationStage =
  | "ORDER_CREATE"
  | "MAR_ADMINISTRATION"
  | "RESPONSE_DOCUMENTATION";

export type MedicationOrderCreateFailureLog = {
  stage: MedicationOrderValidationStage;
  validatorName: string;
  failureReason: string;
  requestId?: string;
  encounterId?: string;
  facilityId?: string;
  catalogCode?: string;
  catalogMedicationId?: string;
  medicationName?: string;
  errorCode?: string;
  blockers?: string[];
};

export function resolveOrderCreateZodValidatorName(path: (string | number)[] | undefined): string {
  if (!path?.length) return "orderCreateDtoSchema";
  const joined = path.map(String).join(".");
  if (joined.includes("route")) return "orderCreateDtoSchema.route";
  if (joined.includes("frequencyCode")) return "orderCreateDtoSchema.frequencyCode";
  if (joined.includes("quantity")) return "orderCreateDtoSchema.quantity";
  if (joined.includes("prescriberName")) return "orderCreateDtoSchema.prescriberName";
  return `orderCreateDtoSchema.${joined}`;
}

export function extractOrderCreateBodyCatalogHints(body: unknown): {
  catalogMedicationId?: string;
  route?: string;
} {
  if (!body || typeof body !== "object") return {};
  const items = (body as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length === 0) return {};
  const first = items[0];
  if (!first || typeof first !== "object") return {};
  const row = first as { catalogItemId?: unknown; route?: unknown };
  const catalogMedicationId =
    typeof row.catalogItemId === "string" && row.catalogItemId.trim()
      ? row.catalogItemId.trim()
      : undefined;
  const route = typeof row.route === "string" && row.route.trim() ? row.route.trim() : undefined;
  return { catalogMedicationId, route };
}

export function logMedicationOrderCreateValidationFailure(input: MedicationOrderCreateFailureLog): void {
  log.warn("medication_order_validation_failed", {
    stage: input.stage,
    validatorName: input.validatorName,
    failureReason: input.failureReason,
    requestId: input.requestId ?? null,
    encounterId: input.encounterId ?? null,
    facilityId: input.facilityId ?? null,
    catalogCode: input.catalogCode ?? null,
    catalogMedicationId: input.catalogMedicationId ?? null,
    medicationName: input.medicationName ?? null,
    errorCode: input.errorCode ?? null,
    blockers: input.blockers ?? null,
  });
}

export function logOrderCreateZodFailure(input: {
  error: ZodError;
  requestId?: string;
  encounterId?: string;
  facilityId?: string;
  body?: unknown;
}): void {
  const issue = input.error.issues[0];
  const hints = extractOrderCreateBodyCatalogHints(input.body);
  logMedicationOrderCreateValidationFailure({
    stage: "ORDER_CREATE",
    validatorName: resolveOrderCreateZodValidatorName(issue?.path),
    failureReason: issue?.message ?? "Données invalides",
    requestId: input.requestId,
    encounterId: input.encounterId,
    facilityId: input.facilityId,
    catalogMedicationId: hints.catalogMedicationId,
    errorCode: "ORDER_CREATE_DTO_VALIDATION_FAILED",
  });
}

export function medicationOrderCreateBadRequest(input: {
  message: string;
  validatorName: string;
  errorCode: string;
  blockers?: string[];
  catalogCode?: string;
  catalogMedicationId?: string;
  medicationName?: string;
}) {
  return {
    message: input.message,
    errorCode: input.errorCode,
    stage: "ORDER_CREATE" as const,
    validatorName: input.validatorName,
    blockers: input.blockers,
    catalogCode: input.catalogCode,
    catalogMedicationId: input.catalogMedicationId,
    medicationName: input.medicationName,
  };
}
