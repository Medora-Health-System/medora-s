import { z } from "zod";
import { MEDORA_STAFF_PERSONAS, PLATFORM_CAPABILITY_CODES } from "../platform-capabilities";
const safeReason = z.string().trim().min(3).max(500);
export const classifyStaffSchema = z.object({ reason: safeReason, ticketReference: z.string().trim().min(1).max(100).optional() }).strict();
export const staffLifecycleSchema = z.object({ reason: safeReason, ticketReference: z.string().trim().min(1).max(100).optional() }).strict();
export const provisionStaffSchema = staffLifecycleSchema.extend({ persona: z.enum(MEDORA_STAFF_PERSONAS) }).strict();
export const changePersonaSchema = provisionStaffSchema;
export const grantCapabilitySchema = z.object({ code: z.enum(PLATFORM_CAPABILITY_CODES), reason: safeReason, ticketReference: z.string().trim().min(1).max(100).optional() }).strict();
export const revokeCapabilitySchema = z.object({ reason: safeReason, ticketReference: z.string().trim().min(1).max(100).optional() }).strict();
