import { z } from "zod";

export const msppExposureRiskSchema = z.enum(["LOW", "MEDIUM", "HIGH", "UNKNOWN"]);

export const msppCaseClassificationSchema = z.enum([
  "SUSPECT",
  "PROBABLE",
  "CONFIRMED",
  "NOT_A_CASE",
]);

export const msppLabEvidenceTypeSchema = z.enum([
  "NONE",
  "PCR",
  "RAPID_ANTIGEN",
  "CULTURE",
  "SEROLOGY",
  "OTHER",
]);

const optionalDateYmd = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de début des signes invalide (AAAA-MM-JJ).").optional()
);

/** Body requis pour toute décision MSPP (département ou central), approbation ou rejet. */
export const msppReviewActionSchema = z.object({
  /** Commentaire obligatoire du validateur. */
  comment: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z.string().min(1, "Le commentaire est obligatoire.").max(4000)
  ),
  fever: z.boolean({
    required_error: "Indiquez si la fièvre est rapportée (oui/non).",
    invalid_type_error: "Indiquez si la fièvre est rapportée (oui/non).",
  }),
  duration: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z.string().min(1, "La durée est obligatoire.").max(256)
  ),
  labConfirmed: z.boolean({
    required_error: "Indiquez si une confirmation biologique est disponible (oui/non).",
    invalid_type_error: "Indiquez si une confirmation biologique est disponible (oui/non).",
  }),
  exposureRisk: msppExposureRiskSchema,
  caseClassification: msppCaseClassificationSchema,
  inclusionCriteriaSummary: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z.string().min(1, "Les critères d’inclusion sont obligatoires.").max(8000)
  ),
  exclusionCriteriaSummary: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z.string().min(1, "Les critères d’exclusion sont obligatoires.").max(8000)
  ),
  symptomOnsetDate: optionalDateYmd,
  hospitalized: z.boolean({
    required_error: "Indiquez si le patient est ou a été hospitalisé (oui/non).",
    invalid_type_error: "Indiquez si le patient est ou a été hospitalisé (oui/non).",
  }),
  outcomeStatus: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z.string().min(1, "Le statut d’évolution est obligatoire.").max(128)
  ),
  labEvidenceType: msppLabEvidenceTypeSchema,
  epiLinkedCase: z.boolean({
    required_error: "Indiquez s’il existe un lien épidémiologique avec un autre cas (oui/non).",
    invalid_type_error: "Indiquez s’il existe un lien épidémiologique avec un autre cas (oui/non).",
  }),
  travelOrExposureContext: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z.string().min(1, "Le contexte voyage ou d’exposition est obligatoire.").max(4000)
  ),
  finalDecisionRationale: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z.string().min(1, "La justification finale est obligatoire.").max(8000)
  ),
});

export type MsppReviewActionDto = z.infer<typeof msppReviewActionSchema>;
