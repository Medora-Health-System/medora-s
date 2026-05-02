import { z } from "zod";

export const exportMonitoringQuerySchema = z.object({
  /** all | billing | ed_reports | failures */
  filter: z.enum(["all", "billing", "ed_reports", "failures"]).optional().default("all"),
});

export type ExportMonitoringQueryDto = z.infer<typeof exportMonitoringQuerySchema>;
