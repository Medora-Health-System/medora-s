import { z } from "zod";

const billingClassEnum = z.enum(["HYDRATION", "THERAPEUTIC", "UNKNOWN"]);

export const patchInfusionBillingReviewBodySchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED", "ADJUSTED"]),
    billingClassFinal: billingClassEnum.optional(),
    approvedInitialHour: z.number().int().min(0).max(48).optional(),
    approvedAdditionalHoursOrIntervals: z.number().int().min(0).max(48).optional(),
    reviewerNote: z
      .string()
      .max(500)
      .optional()
      .transform((s) => (s === undefined ? undefined : s.trim() || undefined)),
  })
  .strict()
  .refine(
    (d) => {
      if (d.status === "REJECTED" || d.status === "ADJUSTED") return Boolean(d.reviewerNote?.trim());
      return true;
    },
    { message: "Une note de revue est requise pour REJECTED ou ADJUSTED." }
  )
  .refine(
    (d) => {
      if (d.status !== "ADJUSTED") return true;
      return (
        d.billingClassFinal !== undefined ||
        d.approvedInitialHour !== undefined ||
        d.approvedAdditionalHoursOrIntervals !== undefined
      );
    },
    { message: "ADJUSTED requiert billingClassFinal et/ou des unités approuvées." }
  );

export type PatchInfusionBillingReviewBody = z.infer<typeof patchInfusionBillingReviewBodySchema>;
