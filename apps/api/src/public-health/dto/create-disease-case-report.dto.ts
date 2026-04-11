import { z } from "zod";

export const diseaseCaseStatusSchema = z.enum([
  "SUSPECTED",
  "CONFIRMED",
  "RULED_OUT",
]);

export const createDiseaseCaseReportDtoSchema = z
  .object({
    patientId: z.string().uuid().optional().nullable(),
    encounterId: z.string().uuid().optional().nullable(),
    diseaseCode: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() : v),
      z.string().min(1).max(64)
    ),
    diseaseName: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() : v),
      z.string().min(1).max(256)
    ),
    status: diseaseCaseStatusSchema,
    /** Date de déclaration (obligatoire pour la traçabilité épidémiologique). */
    reportedAt: z.coerce.date(),
    onsetDate: z.coerce.date().optional().nullable(),
    /** Référentiel national département → commune (obligatoire pour la chaîne MSPP). */
    geoCommuneId: z.string().uuid(),
    /** Justification clinique / épidémiologique minimale (obligatoire). */
    notes: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() : ""),
      z.string().min(1, "Les notes cliniques sont obligatoires.").max(4000)
    ),
  });

export type CreateDiseaseCaseReportDto = z.infer<
  typeof createDiseaseCaseReportDtoSchema
>;
