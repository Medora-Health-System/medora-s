import { z } from "zod";

export const DIAGNOSIS_REMOVAL_REASON_CODES = [
  "ENTERED_IN_ERROR",
  "DUPLICATE_DIAGNOSIS",
  "DIAGNOSIS_RULED_OUT",
  "INCORRECT_PATIENT_ENCOUNTER",
  "MORE_SPECIFIC_SELECTED",
  "OTHER",
] as const;

export type DiagnosisRemovalReasonCode = (typeof DIAGNOSIS_REMOVAL_REASON_CODES)[number];

export const removeDiagnosisDtoSchema = z
  .object({
    reasonCode: z.enum(DIAGNOSIS_REMOVAL_REASON_CODES),
    reasonText: z.string().trim().max(500).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.reasonCode === "OTHER" && !val.reasonText?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "reasonText is required when reasonCode is OTHER",
        path: ["reasonText"],
      });
    }
  });

export type RemoveDiagnosisDto = z.infer<typeof removeDiagnosisDtoSchema>;
