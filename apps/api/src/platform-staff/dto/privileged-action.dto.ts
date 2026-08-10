import { z } from "zod";
import { MEDORA_STAFF_PERSONAS, PLATFORM_CAPABILITY_CODES } from "../platform-capabilities";
const reason = z.string().trim().min(3).max(500);
const ticketReference = z.string().trim().min(1).max(100).optional();
const common = { targetUserId: z.string().uuid(), reason, ticketReference };
export const createPrivilegedActionSchema = z.discriminatedUnion("operationType", [
  z.object({ operationType: z.literal("STAFF_PROVISION"), ...common, persona: z.enum(MEDORA_STAFF_PERSONAS) }).strict(),
  z.object({ operationType: z.literal("STAFF_GRANT_CAPABILITY"), ...common, capabilityCode: z.enum(PLATFORM_CAPABILITY_CODES) }).strict(),
]);
export const decisionSchema = z.object({ reason }).strict();
export const listPrivilegedActionsSchema = z.object({ status: z.enum(["PENDING","APPROVED","REJECTED","CANCELLED","EXPIRED","EXECUTED","FAILED"]).optional(), take: z.coerce.number().int().min(1).max(100).default(50) }).strict();
