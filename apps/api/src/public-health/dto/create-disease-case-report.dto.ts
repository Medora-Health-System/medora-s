import { z } from "zod";

export const diseaseCaseStatusSchema = z.enum([
  "SUSPECTED",
  "CONFIRMED",
  "RULED_OUT",
]);

export const createDiseaseCaseReportDtoSchema = z.object({
  patientId: z.string().uuid().optional().nullable(),
  encounterId: z.string().uuid().optional().nullable(),
  diseaseCode: z.string().min(1).max(64),
  diseaseName: z.string().min(1).max(256),
  status: diseaseCaseStatusSchema,
  reportedAt: z.coerce.date().optional(),
  onsetDate: z.coerce.date().optional().nullable(),
  commune: z.string().max(128).optional().nullable(),
  department: z.string().max(128).optional().nullable(),
  /** Lien optionnel vers `GeoCommune` — si fourni, commune/département affichés sont alignés sur le référentiel. */
  geoCommuneId: z.string().uuid().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export type CreateDiseaseCaseReportDto = z.infer<
  typeof createDiseaseCaseReportDtoSchema
>;
