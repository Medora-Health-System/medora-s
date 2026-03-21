import { z } from "zod";
import { diseaseCaseStatusSchema } from "./create-disease-case-report.dto";

export const listDiseaseCaseReportsQuerySchema = z.object({
  status: diseaseCaseStatusSchema.optional(),
  commune: z.string().max(128).optional(),
  diseaseCode: z.string().max(64).optional(),
  diseaseName: z.string().max(256).optional(),
  reportedFrom: z.coerce.date().optional(),
  reportedTo: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export type ListDiseaseCaseReportsQuery = z.infer<
  typeof listDiseaseCaseReportsQuerySchema
>;

export const diseaseSummaryQuerySchema = z.object({
  reportedFrom: z.coerce.date().optional(),
  reportedTo: z.coerce.date().optional(),
});

export type DiseaseSummaryQuery = z.infer<typeof diseaseSummaryQuerySchema>;
