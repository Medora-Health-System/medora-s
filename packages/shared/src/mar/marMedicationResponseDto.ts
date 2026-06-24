/** MEDUI.ED.MAR.H9L — POST medication response documentation DTO. */

import { z } from "zod";
import { MAR_MEDICATION_RESPONSE_CODES } from "./marMedicationResponseGovernance.js";

const emptyStrToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const marMedicationResponseDocumentDtoSchema = z.object({
  responseCode: z.enum(MAR_MEDICATION_RESPONSE_CODES),
  responseDetail: z.preprocess(emptyStrToUndefined, z.string().trim().max(2000).optional()),
  responseTime: z.coerce.date().optional(),
  painBefore: z.number().int().min(0).max(10).optional().nullable(),
  painAfter: z.number().int().min(0).max(10).optional().nullable(),
  painResponseTrend: z.enum(["IMPROVED", "SAME", "WORSE"]).optional().nullable(),
  noAdverseReaction: z.boolean().optional().nullable(),
  nausea: z.boolean().optional().nullable(),
  vomiting: z.boolean().optional().nullable(),
  itching: z.boolean().optional().nullable(),
  sedation: z.boolean().optional().nullable(),
  dizziness: z.boolean().optional().nullable(),
  constipation: z.boolean().optional().nullable(),
  respiratoryDepression: z.boolean().optional().nullable(),
});

export type MarMedicationResponseDocumentDto = z.infer<typeof marMedicationResponseDocumentDtoSchema>;
