import { z } from "zod";

export const patientMessageCategorySchema = z.enum([
  "GENERAL",
  "CLINICAL",
  "MEDICATION",
  "APPOINTMENT",
]);

const patientMessageBodySchema = z.string().trim().min(1).max(4000);

export const createPatientMessageThreadSchema = z
  .object({
    category: patientMessageCategorySchema,
    subject: z.string().trim().min(1).max(120),
    message: patientMessageBodySchema,
  })
  .strict();

export const patientMessageReplySchema = z
  .object({
    message: patientMessageBodySchema,
  })
  .strict();

export type CreatePatientMessageThreadInput = z.infer<
  typeof createPatientMessageThreadSchema
>;
export type PatientMessageReplyInput = z.infer<typeof patientMessageReplySchema>;
