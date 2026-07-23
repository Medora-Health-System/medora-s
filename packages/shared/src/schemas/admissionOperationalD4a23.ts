import { z } from "zod";
import { OPERATIONAL_HOLD_REASON_CODES } from "../encounters/admissionOperationalAcceptanceD4a23.js";

const holdReasonSet = new Set<string>(OPERATIONAL_HOLD_REASON_CODES);

export const admissionOperationalActionDtoSchema = z.object({
  action: z.enum([
    "ACCEPT",
    "ACCEPT_WITH_NOTE",
    "HOLD",
    "DECLINE",
    "REDIRECT",
    "ESCALATE",
    "RECEIVING_ACCEPT",
    "RECEIVING_ACCEPT_WITH_CONDITIONS",
    "RECEIVING_HOLD",
    "RECEIVING_DECLINE",
  ]),
  clientRequestId: z.string().trim().min(1).max(128).optional().nullable(),
  note: z.string().trim().max(2000).optional().nullable(),
  receivingService: z.string().trim().max(120).optional().nullable(),
  receivingUnit: z.string().trim().max(64).optional().nullable(),
  receivingTeam: z.string().trim().max(120).optional().nullable(),
  holdReasonCode: z
    .string()
    .trim()
    .max(64)
    .optional()
    .nullable()
    .refine((v) => v == null || v === "" || holdReasonSet.has(v), {
      message: "Invalid hold reason",
    }),
  holdExplanation: z.string().trim().max(2000).optional().nullable(),
  responsibleTeam: z.string().trim().max(120).optional().nullable(),
  reassessmentTargetAt: z.string().datetime().optional().nullable(),
  redirectToService: z.string().trim().max(120).optional().nullable(),
  redirectToUnit: z.string().trim().max(64).optional().nullable(),
  declineReasonCode: z.string().trim().max(64).optional().nullable(),
  expectedAdmissionDecisionAt: z.string().datetime().optional().nullable(),
  precautionsAcknowledged: z.boolean().optional(),
  equipmentAcknowledged: z.boolean().optional(),
  isolationAcknowledged: z.boolean().optional(),
  conditionsNote: z.string().trim().max(2000).optional().nullable(),
});

export type AdmissionOperationalActionDto = z.infer<
  typeof admissionOperationalActionDtoSchema
>;
