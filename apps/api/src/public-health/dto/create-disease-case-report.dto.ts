import { z } from "zod";
import {
  MsppCaseClassification,
  MsppLabEvidenceType,
} from "@prisma/client";

export const diseaseCaseStatusSchema = z.enum([
  "SUSPECTED",
  "CONFIRMED",
  "RULED_OUT",
]);

const trim = (v: unknown) => (typeof v === "string" ? v.trim() : v);

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
    /** Notes libres (optionnel si un résumé clinique est fourni). */
    notes: z.preprocess(
      trim,
      z.union([z.string().max(4000), z.literal("")]).optional()
    ),
    /** Résumé clinique dossier initial (optionnel si des notes sont fournies). */
    clinicalSummary: z.preprocess(
      trim,
      z.union([z.string().max(8000), z.literal("")]).optional()
    ),
    feverReported: z.boolean().optional(),
    symptomDuration: z.preprocess((v) => {
      if (typeof v !== "string") return undefined;
      const t = v.trim();
      return t === "" ? undefined : t;
    }, z.string().max(256).optional()),
    hospitalized: z.boolean().optional(),
    outcomeStatus: z.preprocess((v) => {
      if (typeof v !== "string") return undefined;
      const t = v.trim();
      return t === "" ? undefined : t;
    }, z.string().max(128).optional()),
    labConfirmed: z.boolean().optional(),
    labEvidenceType: z.nativeEnum(MsppLabEvidenceType).optional(),
    epiLinkedCase: z.boolean().optional(),
    travelOrExposureContext: z.preprocess((v) => {
      if (typeof v !== "string") return undefined;
      const t = v.trim();
      return t === "" ? undefined : t;
    }, z.string().max(8000).optional()),
    provisionalCaseClassification: z.nativeEnum(MsppCaseClassification).nullish(),
  })
  .superRefine((data, ctx) => {
    const n = data.notes?.trim();
    const c = data.clinicalSummary?.trim();
    if (!n && !c) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "notes_or_clinical_summary_required",
        path: ["clinicalSummary"],
      });
    }
    if (data.labConfirmed === true) {
      if (
        !data.labEvidenceType ||
        data.labEvidenceType === MsppLabEvidenceType.NONE
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "lab_evidence_required_when_confirmed",
          path: ["labEvidenceType"],
        });
      }
    }
  });

export type CreateDiseaseCaseReportDto = z.infer<
  typeof createDiseaseCaseReportDtoSchema
>;
