import { z } from "zod";
import { AuditAction } from "@prisma/client";

export const adminAuditEventsQuerySchema = z.object({
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
  actorUserId: z.string().uuid().optional(),
  entity: z.string().trim().min(1).max(120).optional(),
  action: z.nativeEnum(AuditAction).optional(),
  encounterId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  cursor: z.string().trim().min(1).max(512).optional(),
});

export type AdminAuditEventsQueryDto = z.infer<typeof adminAuditEventsQuerySchema>;
