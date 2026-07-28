import { z } from "zod";
import { FollowUpStatus } from "@prisma/client";

export const listPatientFollowUpsQuerySchema = z.object({
  status: z.nativeEnum(FollowUpStatus).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export type ListPatientFollowUpsQuery = z.infer<
  typeof listPatientFollowUpsQuerySchema
>;

export const listUpcomingFollowUpsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  /** Exclusive end instant (ISO) — preferred for actionable KPI match. */
  endExclusive: z.coerce.date().optional(),
  /** Durable FollowUpStatus filter. When omitted with actionable=1 → OPEN. */
  status: z.nativeEnum(FollowUpStatus).optional(),
  /**
   * When true: OPEN only, dueDate < endExclusive|to (half-open), overdue included.
   */
  actionable: z
    .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "1" || v === "true"),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export type ListUpcomingFollowUpsQuery = z.infer<
  typeof listUpcomingFollowUpsQuerySchema
>;
