import { z } from "zod";
import { PLATFORM_CAPABILITY_CODES } from "../platform-capabilities";
const safeReason = z.string().trim().min(3).max(500);
export const classifyStaffSchema = z.object({ reason: safeReason, ticketReference: z.string().trim().min(1).max(100).optional() }).strict();
export const grantCapabilitySchema = z.object({ code: z.enum(PLATFORM_CAPABILITY_CODES), reason: safeReason, ticketReference: z.string().trim().min(1).max(100).optional() }).strict();
export const revokeCapabilitySchema = z.object({ reason: safeReason, ticketReference: z.string().trim().min(1).max(100).optional() }).strict();
