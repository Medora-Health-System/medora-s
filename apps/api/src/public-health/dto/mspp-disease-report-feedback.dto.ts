import { BadRequestException } from "@nestjs/common";
import {
  MsppDiseaseReportFeedbackCategory,
  MsppDiseaseReportFeedbackSeverity,
  MsppDiseaseReportFeedbackStatus,
} from "@prisma/client";
import { z } from "zod";

export const createMsppDiseaseReportFeedbackSchema = z.object({
  diseaseCaseReportId: z.string().uuid(),
  diseaseCaseReviewId: z.string().uuid().nullable().optional(),
  category: z.nativeEnum(MsppDiseaseReportFeedbackCategory),
  severity: z.nativeEnum(MsppDiseaseReportFeedbackSeverity),
  feedbackText: z.string().min(1).max(8000),
});

export type CreateMsppDiseaseReportFeedbackDto = z.infer<typeof createMsppDiseaseReportFeedbackSchema>;

export const facilityMsppFeedbackStatusSchema = z.object({
  status: z.enum(["REVIEWED", "RESOLVED"]),
});

export type FacilityMsppFeedbackStatusDto = z.infer<typeof facilityMsppFeedbackStatusSchema>;

export function parseCreateMsppDiseaseReportFeedback(body: unknown): CreateMsppDiseaseReportFeedbackDto {
  const p = createMsppDiseaseReportFeedbackSchema.safeParse(body ?? {});
  if (!p.success) {
    throw new BadRequestException(p.error.errors.map((e) => e.message).join(" ") || "Corps invalide.");
  }
  return p.data;
}

export function parseFacilityMsppFeedbackStatus(body: unknown): FacilityMsppFeedbackStatusDto {
  const p = facilityMsppFeedbackStatusSchema.safeParse(body ?? {});
  if (!p.success) {
    throw new BadRequestException(p.error.errors.map((e) => e.message).join(" ") || "Corps invalide.");
  }
  return p.data;
}
