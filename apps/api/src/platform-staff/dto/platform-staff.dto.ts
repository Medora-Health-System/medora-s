import { z } from "zod";
import { MEDORA_STAFF_PERSONAS, PLATFORM_CAPABILITY_CODES } from "../platform-capabilities";
const safeReason = z.string().trim().min(3).max(500);
export const classifyStaffSchema = z.object({ reason: safeReason, ticketReference: z.string().trim().min(1).max(100).optional() }).strict();
export const staffLifecycleSchema = z.object({ reason: safeReason, ticketReference: z.string().trim().min(1).max(100).optional() }).strict();
export const provisionStaffSchema = staffLifecycleSchema.extend({ persona: z.enum(MEDORA_STAFF_PERSONAS) }).strict();
export const changePersonaSchema = provisionStaffSchema;
export const grantCapabilitySchema = z.object({ code: z.enum(PLATFORM_CAPABILITY_CODES), reason: safeReason, ticketReference: z.string().trim().min(1).max(100).optional() }).strict();
export const revokeCapabilitySchema = z.object({ reason: safeReason, ticketReference: z.string().trim().min(1).max(100).optional() }).strict();
export const governanceBootstrapSchema = z.object({ targetUserId: z.string().uuid(), reason: safeReason, ticketReference: z.string().trim().min(1).max(100) }).strict();
export const createPlatformStaffAccountSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(200),
  reason: safeReason,
  ticketReference: z.string().trim().min(1).max(100).optional(),
}).strict();
