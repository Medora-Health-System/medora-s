import { z } from "zod";
import { ChartRoiDeliveryMethod, ChartRoiRequestType } from "@prisma/client";

const requestTypeSchema = z.nativeEnum(ChartRoiRequestType);
const deliveryMethodSchema = z.nativeEnum(ChartRoiDeliveryMethod);

export const createChartRoiRequestDtoSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid().optional().nullable(),
  requestType: requestTypeSchema,
  purpose: z.string().trim().min(1, "purpose required").max(8000),
  recipientName: z.string().trim().max(500).optional().nullable(),
  recipientOrganization: z.string().trim().max(500).optional().nullable(),
  deliveryMethod: deliveryMethodSchema.optional().nullable(),
  authorizationReference: z.string().trim().max(500).optional().nullable(),
});

export type CreateChartRoiRequestDto = z.infer<typeof createChartRoiRequestDtoSchema>;

export const denyChartRoiRequestDtoSchema = z.object({
  denialReason: z.string().trim().max(4000).optional().nullable(),
});

export const cancelChartRoiRequestDtoSchema = z.object({
  cancelledReason: z.string().trim().max(4000).optional().nullable(),
});

export const fulfillChartRoiRequestDtoSchema = z
  .object({
    snapshotId: z.string().uuid().optional().nullable(),
    createSnapshotIfMissing: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    const create = val.createSnapshotIfMissing === true;
    const hasSnap = !!val.snapshotId?.trim();
    if (create && hasSnap) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either snapshotId or createSnapshotIfMissing, not both",
      });
    }
    if (!create && !hasSnap) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either snapshotId or createSnapshotIfMissing: true is required",
      });
    }
  });

export type FulfillChartRoiRequestDto = z.infer<typeof fulfillChartRoiRequestDtoSchema>;
