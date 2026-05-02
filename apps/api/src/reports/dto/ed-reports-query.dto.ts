import { z } from "zod";
import { JSON_PAGE_DEFAULT_LIMIT, JSON_PAGE_MAX_LIMIT } from "../ed-report-range.util";

const preprocessQuery = (val: unknown) => {
  if (!val || typeof val !== "object" || Array.isArray(val)) return val;
  const o = { ...(val as Record<string, unknown>) };
  const ex = o.export;
  if (o.format == null && (ex === "csv" || ex === "json")) {
    o.format = ex;
  }
  return o;
};

export const edReportsQuerySchema = z.preprocess(
  preprocessQuery,
  z.object({
    from: z.string().trim().min(8).max(40),
    to: z.string().trim().min(8).max(40),
    providerId: z.string().uuid().optional(),
    format: z.enum(["json", "csv"]).default("json"),
    limit: z.coerce.number().int().min(1).max(JSON_PAGE_MAX_LIMIT).optional(),
    cursor: z.string().trim().min(1).max(512).optional(),
  })
);

export type EdReportsQueryDto = z.infer<typeof edReportsQuerySchema>;

export function jsonPageLimit(query: EdReportsQueryDto): number {
  return query.limit ?? JSON_PAGE_DEFAULT_LIMIT;
}
