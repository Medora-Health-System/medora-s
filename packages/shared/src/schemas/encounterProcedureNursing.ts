import { z } from "zod";
import { DOCUMENTED_PROCEDURE_TYPES } from "./encounterProcedureDocument.js";

/** Canonical payload version for procedure documentation events (19M.3A). */
export const PROCEDURE_DOCUMENT_PAYLOAD_VERSION = 1 as const;

export const PROCEDURE_DOCUMENTATION_ROLE_VALUES = ["PROVIDER", "NURSING"] as const;
export type ProcedureDocumentationRole = (typeof PROCEDURE_DOCUMENTATION_ROLE_VALUES)[number];

export const NURSING_TIMEOUT_WITNESS_VALUES = ["CONFIRMED", "NOT_APPLICABLE", "NOT_DOCUMENTED"] as const;
export const NURSING_TOLERANCE_VALUES = [
  "TOLERATED_WELL",
  "MILD_DISTRESS",
  "MODERATE_DISTRESS",
  "SEVERE_DISTRESS",
  "OTHER",
] as const;

const emptyStrToUndefined = (v: unknown) => (v === "" ? undefined : v);
const performedAtOpt = z.preprocess(emptyStrToUndefined, z.string().trim().max(48).optional());
const notesOpt = z.preprocess(emptyStrToUndefined, z.string().trim().max(4000).optional());
const linkedProcedureEventIdOpt = z.preprocess(
  emptyStrToUndefined,
  z.string().trim().uuid().optional()
);

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readStr(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

/**
 * Canonical procedure identity from payload.
 * Legacy 19M.3 rows used procedureType=NURSING_PROCEDURE_ASSIST + assistedProcedureType — normalized here.
 */
export function readCanonicalProcedureTypeFromPayload(payloadJson: unknown): string | null {
  const record = asRecord(payloadJson);
  const procedureType = readStr(record, "procedureType");
  if (!procedureType) return null;
  if (procedureType === "NURSING_PROCEDURE_ASSIST") {
    return readStr(record, "assistedProcedureType") ?? procedureType;
  }
  return procedureType;
}

export function readDocumentationRoleFromPayload(payloadJson: unknown): ProcedureDocumentationRole {
  const record = asRecord(payloadJson);
  if (record.documentationRole === "NURSING") return "NURSING";
  const procedureType = readStr(record, "procedureType");
  if (procedureType === "NURSING_PROCEDURE_ASSIST") return "NURSING";
  return "PROVIDER";
}

export function readLinkedProcedureEventIdFromPayload(payloadJson: unknown): string | null {
  return readStr(asRecord(payloadJson), "linkedProcedureEventId");
}

export function readPayloadVersionFromPayload(payloadJson: unknown): number {
  const raw = asRecord(payloadJson).payloadVersion;
  return typeof raw === "number" && Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
}

/** Nursing assist / monitoring note — canonical procedureType + documentationRole=NURSING (19M.3A). */
export const nursingProcedureDocumentDtoSchema = z
  .object({
    procedureType: z.enum(DOCUMENTED_PROCEDURE_TYPES),
    documentationRole: z.literal("NURSING"),
    payloadVersion: z.literal(PROCEDURE_DOCUMENT_PAYLOAD_VERSION).default(PROCEDURE_DOCUMENT_PAYLOAD_VERSION),
    linkedProcedureEventId: linkedProcedureEventIdOpt,
    performedAt: performedAtOpt,
    assistedProviderName: z.preprocess(emptyStrToUndefined, z.string().trim().max(200).optional()),
    patientPositionPrep: z.preprocess(emptyStrToUndefined, z.string().trim().max(2000).optional()),
    suppliesPrepared: z.boolean(),
    timeoutWitness: z.enum(NURSING_TIMEOUT_WITNESS_VALUES),
    chaperonePresent: z.boolean().optional(),
    vitalsMonitoringNotes: z.preprocess(emptyStrToUndefined, z.string().trim().max(2000).optional()),
    specimensCollected: z.boolean(),
    specimensSentToLab: z.boolean(),
    specimenDetails: z.preprocess(emptyStrToUndefined, z.string().trim().max(500).optional()),
    patientTolerance: z.enum(NURSING_TOLERANCE_VALUES),
    patientToleranceOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
    postProcedureCareGiven: z.boolean(),
    complicationsObserved: z.preprocess(emptyStrToUndefined, z.string().trim().max(2000).optional()),
    providerNotified: z.boolean(),
    notes: notesOpt,
  })
  .superRefine((val, ctx) => {
    if (val.patientTolerance === "OTHER" && !val.patientToleranceOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["patientToleranceOther"], message: "required" });
    }
    if (val.specimensCollected && val.specimensSentToLab && !val.specimenDetails?.trim()) {
      ctx.addIssue({ code: "custom", path: ["specimenDetails"], message: "required" });
    }
  });

export type NursingProcedureDocumentDto = z.infer<typeof nursingProcedureDocumentDtoSchema>;

/** Detect nursing assist/monitoring payload (distinct from nursing-primary bedside forms). */
export function isNursingAssistMonitoringPayload(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const o = body as Record<string, unknown>;
  if (o.documentationRole !== "NURSING") return false;
  return typeof o.suppliesPrepared === "boolean" || typeof o.timeoutWitness === "string";
}

/** Provider-side procedure documentation eligible for billing review export. */
export function isProviderProcedureDocumentationForBilling(payloadJson: unknown): boolean {
  if (!payloadJson || typeof payloadJson !== "object" || Array.isArray(payloadJson)) return false;
  if (readDocumentationRoleFromPayload(payloadJson) !== "PROVIDER") return false;
  return Boolean(readCanonicalProcedureTypeFromPayload(payloadJson));
}

/** @deprecated Legacy alias — use nursingProcedureDocumentDtoSchema */
export const nursingProcedureAssistDocumentDtoSchema = nursingProcedureDocumentDtoSchema;
/** @deprecated Legacy alias */
export type NursingProcedureAssistDocumentDto = NursingProcedureDocumentDto;
