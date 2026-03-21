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
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export type ListUpcomingFollowUpsQuery = z.infer<
  typeof listUpcomingFollowUpsQuerySchema
>;
