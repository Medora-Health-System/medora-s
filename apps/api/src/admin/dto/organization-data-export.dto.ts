import { z } from "zod";

export const organizationDataExportCreateSchema = z.object({
  facility_id: z.string().uuid().optional(),
  format: z.enum(["ZIP", "XLSX"]).default("ZIP"),
});

export type OrganizationDataExportCreateDto = z.infer<typeof organizationDataExportCreateSchema>;

export const organizationDataExportListQuerySchema = z.object({
  facilityId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type OrganizationDataExportListQueryDto = z.infer<typeof organizationDataExportListQuerySchema>;
