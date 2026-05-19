import { z } from "zod";

export const importStagingBodySchema = z.object({
  /** UTF-8 CSV workbook payload (Phase 19B.0 template headers). */
  csv: z.string().min(1).max(5_000_000),
  dryRun: z.boolean().optional().default(false),
  facilityId: z.string().uuid().optional(),
  /** When omitted, server generates `pri-er-{timestamp}-{random}`. */
  batchId: z.string().min(1).max(128).optional(),
});

export type ImportStagingBody = z.infer<typeof importStagingBodySchema>;
