import { z } from "zod";
import { EncounterType } from "@prisma/client";

/**
 * Nest/Express envoie les query en chaînes ; `type=` ou `limit=` vides ne sont pas `undefined`
 * et faisaient échouer `z.optional()` / `coerce.number()` (400 « Bad Request »).
 * Dupliquer une clé peut produire un tableau — on prend la première valeur scalaire.
 */
function normalizePatientEncountersQuery(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (k !== "type" && k !== "limit") continue;
    const first = Array.isArray(v) ? v[0] : v;
    if (first === "" || first === null || first === undefined) continue;
    out[k] = first;
  }
  return out;
}

export const listPatientEncountersQuerySchema = z.preprocess(
  normalizePatientEncountersQuery,
  z.object({
    type: z.nativeEnum(EncounterType).optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
);

export type ListPatientEncountersQuery = z.infer<
  typeof listPatientEncountersQuerySchema
>;
