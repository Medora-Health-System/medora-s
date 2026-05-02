import { z } from "zod";

export const exportMonitoringRetryBodySchema = z.object({
  exportType: z.literal("external_billing_daily"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  format: z.enum(["json", "csv"]),
});

export type ExportMonitoringRetryBodyDto = z.infer<typeof exportMonitoringRetryBodySchema>;
