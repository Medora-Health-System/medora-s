import { z } from "zod";

export const msppExposureRiskSchema = z.enum(["LOW", "MEDIUM", "HIGH", "UNKNOWN"]);

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
});

export type MsppReviewActionDto = z.infer<typeof msppReviewActionSchema>;
