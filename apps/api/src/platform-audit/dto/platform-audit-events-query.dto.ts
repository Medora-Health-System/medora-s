import { AuditAction } from "@prisma/client";
import { z } from "zod";

export const platformAuditEventsQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  facilityId: z.string().uuid().optional(),
  actorUserId: z.string().uuid().optional(),
  action: z.nativeEnum(AuditAction).optional(),
  entityType: z.string().trim().min(1).max(120).optional(),
  entityId: z.string().trim().min(1).max(191).optional(),
  outcome: z.enum(["SUCCESS", "DENIED"]).optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().trim().min(1).max(1024).optional(),
}).strict();

export type PlatformAuditEventsQueryDto = z.infer<typeof platformAuditEventsQuerySchema>;
