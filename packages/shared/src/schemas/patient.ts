import { z } from "zod";

export const sexAtBirthSchema = z.enum(["M", "F", "X", "U"]);
export type SexAtBirth = z.infer<typeof sexAtBirthSchema>;

export const patientCreateDtoSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  facilityId: z.string().uuid(),
  mrn: z.string().optional(),
  dob: z.coerce.date().optional(),
  phone: z.string().min(5).max(32).optional(),
  email: z.string().email().optional(),
  sexAtBirth: sexAtBirthSchema.optional(),
  nationalId: z.string().min(3).max(64).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  language: z.string().optional(),
});

export type PatientCreateDto = z.infer<typeof patientCreateDtoSchema>;

export const patientUpdateDtoSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dob: z.coerce.date().optional(),
  phone: z.string().min(5).max(32).optional().nullable(),
  email: z.string().email().optional().nullable(),
  sexAtBirth: sexAtBirthSchema.optional().nullable(),
  nationalId: z.string().min(3).max(64).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
});

export type PatientUpdateDto = z.infer<typeof patientUpdateDtoSchema>;

export const encounterTypeSchema = z.enum(["OUTPATIENT", "INPATIENT", "EMERGENCY", "URGENT_CARE"]);
export type EncounterType = z.infer<typeof encounterTypeSchema>;

export const encounterStatusSchema = z.enum(["OPEN", "CLOSED", "CANCELLED"]);
export type EncounterStatus = z.infer<typeof encounterStatusSchema>;

export const encounterCreateDtoSchema = z.object({
  type: encounterTypeSchema,
  providerId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export type EncounterCreateDto = z.infer<typeof encounterCreateDtoSchema>;

export const encounterUpdateDtoSchema = z.object({
  notes: z.string().optional().nullable(),
});

export type EncounterUpdateDto = z.infer<typeof encounterUpdateDtoSchema>;

export const orderStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const orderPrioritySchema = z.enum(["ROUTINE", "URGENT", "STAT"]);
export type OrderPriority = z.infer<typeof orderPrioritySchema>;

export const orderItemCreateDtoSchema = z.object({
  catalogItemId: z.string().uuid(),
  catalogItemType: z.enum(["LAB_TEST", "IMAGING_STUDY", "MEDICATION"]),
  quantity: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export const orderCreateDtoSchema = z.object({
  type: z.enum(["LAB", "IMAGING", "MEDICATION"]),
  priority: orderPrioritySchema.optional(),
  notes: z.string().optional(),
  items: z.array(orderItemCreateDtoSchema).min(1),
});

export type OrderCreateDto = z.infer<typeof orderCreateDtoSchema>;

export const orderUpdateDtoSchema = z.object({
  status: orderStatusSchema.optional(),
  priority: orderPrioritySchema.optional(),
  notes: z.string().optional().nullable(),
});

export type OrderUpdateDto = z.infer<typeof orderUpdateDtoSchema>;

