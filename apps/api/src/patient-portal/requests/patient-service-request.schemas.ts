import { z } from "zod";

const boundedNote = z.string().trim().min(1).max(500);

export const createPatientServiceRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("APPOINTMENT_NEW"),
    preferredStartAt: z.coerce.date(),
    reason: boundedNote.optional(),
  }).strict(),
  z.object({
    type: z.literal("APPOINTMENT_CHANGE"),
    appointmentId: z.string().uuid(),
    preferredStartAt: z.coerce.date(),
    reason: boundedNote.optional(),
  }).strict(),
  z.object({
    type: z.literal("APPOINTMENT_CANCEL"),
    appointmentId: z.string().uuid(),
    reason: boundedNote.optional(),
  }).strict(),
  z.object({
    type: z.literal("MEDICATION_REFILL"),
    medicationOrderItemId: z.string().uuid(),
    reason: boundedNote.optional(),
  }).strict(),
]);

export const patientServiceRequestDecisionSchema = z.object({
  status: z.enum(["IN_REVIEW", "ACCEPTED", "DECLINED", "COMPLETED"]),
  resolutionCode: z.enum([
    "REVIEWING",
    "ACTION_REQUIRED_OUTSIDE_PORTAL",
    "PATIENT_CONTACT_REQUIRED",
    "REQUEST_ACCEPTED",
    "REQUEST_DECLINED",
    "REQUEST_COMPLETED",
  ]),
}).strict();

export type CreatePatientServiceRequestInput = z.infer<typeof createPatientServiceRequestSchema>;
export type PatientServiceRequestDecisionInput = z.infer<typeof patientServiceRequestDecisionSchema>;
