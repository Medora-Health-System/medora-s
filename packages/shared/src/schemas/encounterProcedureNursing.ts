import { z } from "zod";
import { DOCUMENTED_PROCEDURE_TYPES } from "./encounterProcedureDocument.js";

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

/** Nursing assist / monitoring note linked to a clinical procedure (19M.3). */
export const nursingProcedureAssistDocumentDtoSchema = z
  .object({
    procedureType: z.literal("NURSING_PROCEDURE_ASSIST"),
    documentationRole: z.literal("NURSING"),
    assistedProcedureType: z.enum(DOCUMENTED_PROCEDURE_TYPES),
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

export type NursingProcedureAssistDocumentDto = z.infer<typeof nursingProcedureAssistDocumentDtoSchema>;

export function readDocumentationRoleFromPayload(payloadJson: unknown): ProcedureDocumentationRole {
  if (!payloadJson || typeof payloadJson !== "object" || Array.isArray(payloadJson)) return "PROVIDER";
  const role = (payloadJson as Record<string, unknown>).documentationRole;
  return role === "NURSING" ? "NURSING" : "PROVIDER";
}

/** Provider-side procedure documentation eligible for billing review export. */
export function isProviderProcedureDocumentationForBilling(payloadJson: unknown): boolean {
  if (!payloadJson || typeof payloadJson !== "object" || Array.isArray(payloadJson)) return false;
  const record = payloadJson as Record<string, unknown>;
  if (record.documentationRole === "NURSING") return false;
  if (record.procedureType === "NURSING_PROCEDURE_ASSIST") return false;
  return Boolean(typeof record.procedureType === "string" && record.procedureType.trim());
}
