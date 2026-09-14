import { z } from "zod";
import { AuditAction } from "@prisma/client";

export const auditPresetSchema = z.enum([
  "critical_events",
  "security_interop",
  "clinical_actions",
  "billing_exports",
  "access_views",
  "overrides",
]);

export const adminAuditEventsQuerySchema = z.object({
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
  actorUserId: z.string().uuid().optional(),
  entity: z.string().trim().min(1).max(120).optional(),
  action: z.nativeEnum(AuditAction).optional(),
  encounterId: z.string().uuid().optional(),
  /** When set, server applies a curated OR filter; raw `action` / `entity` filters are ignored. */
  preset: auditPresetSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  /** 1-based page number for the enterprise audit center. Cursor remains supported for older callers. */
  page: z.coerce.number().int().min(1).max(100000).optional(),
  cursor: z.string().trim().min(1).max(512).optional(),
}).strict();

export type AdminAuditEventsQueryDto = z.infer<typeof adminAuditEventsQuerySchema>;
