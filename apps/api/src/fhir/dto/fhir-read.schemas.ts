import { BadRequestException } from "@nestjs/common";
import { z } from "zod";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const fhirResourceIdParamSchema = z.string().refine((s) => UUID_RE.test(s), {
  message: "id must be a UUID",
});

/** Observation instance ids are opaque (e.g. `{encounterUuid}-{LOINC}` or `{patientUuid}-latest-{LOINC}`). */
export const fhirObservationInstanceIdParamSchema = z
  .string()
  .trim()
  .min(12)
  .max(512)
  .regex(/^[A-Za-z0-9._~-]+$/, "Observation id contains invalid characters");

/** FHIR R4 search params for Observation (read-only subset). */
export const fhirObservationSearchQuerySchema = z
  .object({
    subject: z.string().optional(),
    encounter: z.string().optional(),
  })
  .superRefine((q, ctx) => {
    const hasSubject = typeof q.subject === "string" && q.subject.trim().length > 0;
    const hasEncounter = typeof q.encounter === "string" && q.encounter.trim().length > 0;
    if (!hasSubject && !hasEncounter) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide subject (Patient/id) and/or encounter (Encounter/id).",
      });
    }
  });

export type FhirObservationSearchQuery = z.infer<typeof fhirObservationSearchQuerySchema>;

export type ParsedFhirObservationSearch = {
  patientId?: string;
  encounterId?: string;
};

/** Parses FHIR reference query values after Zod structural validation. */
export function parseFhirObservationSearchRefs(q: FhirObservationSearchQuery): ParsedFhirObservationSearch {
  const out: ParsedFhirObservationSearch = {};
  if (q.subject != null && q.subject.trim()) {
    const m = /^Patient\/([^/]+)$/.exec(q.subject.trim());
    if (!m) {
      throw new BadRequestException("subject must be Patient/{uuid}");
    }
    if (!UUID_RE.test(m[1])) {
      throw new BadRequestException("subject Patient id must be a UUID");
    }
    out.patientId = m[1];
  }
  if (q.encounter != null && q.encounter.trim()) {
    const m = /^Encounter\/([^/]+)$/.exec(q.encounter.trim());
    if (!m) {
      throw new BadRequestException("encounter must be Encounter/{uuid}");
    }
    if (!UUID_RE.test(m[1])) {
      throw new BadRequestException("encounter id must be a UUID");
    }
    out.encounterId = m[1];
  }
  return out;
}
