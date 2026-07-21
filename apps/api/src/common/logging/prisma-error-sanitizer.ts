/**
 * Sanitized Prisma error fields for ops logs — no PHI, no raw SQL with clinical data.
 * MEDORA.PROD.TRACKBOARD_PRISMA_500_2026_07_20
 */

export type SanitizedPrismaError = {
  prismaCode: string | null;
  clientVersion: string | null;
  modelName: string | null;
  meta: Record<string, unknown> | null;
  missingDatabaseObject: string | null;
  messageSummary: string | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Extract column/table hints from Prisma meta without dumping query args. */
export function extractMissingDatabaseObject(
  meta: Record<string, unknown> | null | undefined
): string | null {
  if (!meta) return null;
  const column = typeof meta.column === "string" ? meta.column : null;
  const table = typeof meta.table === "string" ? meta.table : null;
  const modelName = typeof meta.modelName === "string" ? meta.modelName : null;
  const fieldName = typeof meta.field_name === "string" ? meta.field_name : null;
  const cause = typeof meta.cause === "string" ? meta.cause : null;

  if (column && table) return `${table}.${column}`;
  if (column) return column;
  if (fieldName && modelName) return `${modelName}.${fieldName}`;
  if (fieldName) return fieldName;
  if (table) return table;
  if (cause && /column|relation|table|enum/i.test(cause)) {
    return cause.slice(0, 200);
  }
  return null;
}

/**
 * Summarize Prisma messages without patient identifiers.
 * Keeps schema object names (e.g. hospitalEpisodeId) for diagnosis.
 */
export function summarizePrismaMessage(message: string | undefined | null): string | null {
  if (!message) return null;
  const firstLine =
    message
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? "";
  return firstLine.slice(0, 300) || null;
}

export function sanitizePrismaException(exception: unknown): SanitizedPrismaError | null {
  if (!exception || typeof exception !== "object") return null;
  const e = exception as {
    name?: string;
    code?: unknown;
    clientVersion?: unknown;
    meta?: unknown;
    message?: string;
  };
  const name = typeof e.name === "string" ? e.name : "";
  const code = typeof e.code === "string" ? e.code : null;
  if (!name.includes("Prisma") && !code?.startsWith("P")) {
    return null;
  }

  const meta = isRecord(e.meta) ? { ...e.meta } : null;
  if (meta) {
    // Never forward argument payloads (may contain clinical filters).
    delete meta.target;
    delete meta.driverAdapterError;
  }

  const modelName =
    (meta && typeof meta.modelName === "string" && meta.modelName) ||
    (meta && typeof meta.model === "string" && meta.model) ||
    null;

  return {
    prismaCode: code,
    clientVersion: typeof e.clientVersion === "string" ? e.clientVersion : null,
    modelName,
    meta,
    missingDatabaseObject: extractMissingDatabaseObject(meta),
    messageSummary: summarizePrismaMessage(e.message),
  };
}

/** Stable alert grouping key for repeated identical schema mismatches. */
export function prismaAlertGroupKey(
  sanitized: SanitizedPrismaError,
  route?: string | null
): string {
  const parts = [
    sanitized.prismaCode ?? "UNKNOWN",
    sanitized.modelName ?? "unknown_model",
    sanitized.missingDatabaseObject ?? "unknown_object",
    route ? route.split("?")[0] : "unknown_route",
  ];
  return parts.join("|");
}
