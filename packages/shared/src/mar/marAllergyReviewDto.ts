import { z } from "zod";

export const marAllergyReviewDismissDtoSchema = z.object({
  candidateId: z.string().min(1),
});

export type MarAllergyReviewDismissDto = z.infer<typeof marAllergyReviewDismissDtoSchema>;
