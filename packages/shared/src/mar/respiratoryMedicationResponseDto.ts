/** MEDUI.MEDICATION.PULMONARY_RUNTIME_UI_AND_INFUSION_COMPLETION.1 */

import { z } from "zod";
import { RESPIRATORY_MEDICATION_RESPONSE_CODES } from "./respiratoryMedicationResponseGovernance.js";

const emptyStrToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const respiratoryMedicationResponseDocumentDtoSchema = z.object({
  responseCode: z.enum(RESPIRATORY_MEDICATION_RESPONSE_CODES),
  responseDetail: z.preprocess(emptyStrToUndefined, z.string().trim().max(2000).optional()),
  responseTime: z.coerce.date().optional(),
  respiratoryRateBefore: z.number().int().min(0).max(80).optional().nullable(),
  respiratoryRateAfter: z.number().int().min(0).max(80).optional().nullable(),
  oxygenSaturationBefore: z.number().int().min(0).max(100).optional().nullable(),
  oxygenSaturationAfter: z.number().int().min(0).max(100).optional().nullable(),
  wheezingBefore: z.boolean().optional().nullable(),
  wheezingAfter: z.boolean().optional().nullable(),
  workOfBreathing: z.preprocess(emptyStrToUndefined, z.string().trim().max(500).optional()),
  nebulizerCompletion: z.boolean().optional().nullable(),
  mdiSpacerUsed: z.boolean().optional().nullable(),
  treatmentRefused: z.boolean().optional().nullable(),
  treatmentInterrupted: z.boolean().optional().nullable(),
  noAdverseReaction: z.boolean().optional().nullable(),
  patientTolerated: z.boolean().optional().nullable(),
});

export type RespiratoryMedicationResponseDocumentDto = z.infer<
  typeof respiratoryMedicationResponseDocumentDtoSchema
>;
