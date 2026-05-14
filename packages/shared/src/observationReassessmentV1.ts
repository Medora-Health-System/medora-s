import { z } from "zod";

/** Discriminator on `EncounterClinicalEvent.payloadJson` (append-only observation reassessment). */
export const OBSERVATION_REASSESSMENT_EVENT_SOURCE = "OBSERVATION_REASSESSMENT_V1" as const;

export const observationReassessmentRoleSchema = z.enum(["PROVIDER", "RN"]);

export const observationReassessmentPatientStatusSchema = z.enum(["improved", "unchanged", "worsening"]);

export const observationReassessmentV1BodySchema = z.object({
  role: observationReassessmentRoleSchema,
  patientStatus: observationReassessmentPatientStatusSchema,
  symptomsReviewed: z.boolean(),
  vitalsReviewed: z.boolean(),
  resultsReviewed: z.boolean(),
  painControlled: z.boolean(),
  continueObservation: z.boolean(),
  readyForDischarge: z.boolean(),
  transferConsidered: z.boolean(),
  note: z
    .string()
    .max(2000)
    .optional()
    .transform((s) => {
      const t = typeof s === "string" ? s.trim() : "";
      return t === "" ? undefined : t;
    }),
});

export type ObservationReassessmentV1Body = z.infer<typeof observationReassessmentV1BodySchema>;
