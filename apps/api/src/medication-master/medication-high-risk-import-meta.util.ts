/** Phase 19K.1 — High-risk controlled import metadata (stored in governanceNotes, no migration). */

export const HIGH_RISK_IMPORT_MARKER_START = "<!--MEDORA_HIGH_RISK_IMPORT:v1-->";
export const HIGH_RISK_IMPORT_MARKER_END = "<!--/MEDORA_HIGH_RISK_IMPORT-->";

export type HighRiskImportApprovalStatus =
  | "PENDING"
  | "CATALOG_APPROVED"
  | "PROVIDER_ORDER_APPROVED"
  | "REJECTED";

export type HighRiskImportMeta = {
  version: 1;
  status: HighRiskImportApprovalStatus;
  sourceFilename: string;
  sourceFingerprint: string;
  sourceRowNumber: number;
  sourceRowKey: string;
  classificationReasonCodes: string[];
  importedAt: string;
  duplicateWarning: string | null;
  approvedAt: string | null;
  approvedByUserId: string | null;
  rejectedAt: string | null;
  rejectedByUserId: string | null;
  rejectionNote: string | null;
};

export function defaultHighRiskImportMeta(
  partial: Omit<
    HighRiskImportMeta,
    | "version"
    | "status"
    | "approvedAt"
    | "approvedByUserId"
    | "rejectedAt"
    | "rejectedByUserId"
    | "rejectionNote"
    | "duplicateWarning"
  > & { duplicateWarning?: string | null }
): HighRiskImportMeta {
  return {
    version: 1,
    status: "PENDING",
    duplicateWarning: partial.duplicateWarning ?? null,
    approvedAt: null,
    approvedByUserId: null,
    rejectedAt: null,
    rejectedByUserId: null,
    rejectionNote: null,
    ...partial,
  };
}

function parseMetaJson(raw: string): HighRiskImportMeta | null {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (o.version !== 1) return null;
    const codes = Array.isArray(o.classificationReasonCodes)
      ? o.classificationReasonCodes.filter((c): c is string => typeof c === "string")
      : [];
    const status = o.status;
    const validStatus =
      status === "PENDING" ||
      status === "CATALOG_APPROVED" ||
      status === "PROVIDER_ORDER_APPROVED" ||
      status === "REJECTED"
        ? status
        : "PENDING";
    return {
      version: 1,
      status: validStatus,
      sourceFilename: typeof o.sourceFilename === "string" ? o.sourceFilename : "",
      sourceFingerprint: typeof o.sourceFingerprint === "string" ? o.sourceFingerprint : "",
      sourceRowNumber: typeof o.sourceRowNumber === "number" ? o.sourceRowNumber : 0,
      sourceRowKey: typeof o.sourceRowKey === "string" ? o.sourceRowKey : "",
      classificationReasonCodes: codes,
      importedAt: typeof o.importedAt === "string" ? o.importedAt : "",
      duplicateWarning: typeof o.duplicateWarning === "string" ? o.duplicateWarning : null,
      approvedAt: typeof o.approvedAt === "string" ? o.approvedAt : null,
      approvedByUserId: typeof o.approvedByUserId === "string" ? o.approvedByUserId : null,
      rejectedAt: typeof o.rejectedAt === "string" ? o.rejectedAt : null,
      rejectedByUserId: typeof o.rejectedByUserId === "string" ? o.rejectedByUserId : null,
      rejectionNote: typeof o.rejectionNote === "string" ? o.rejectionNote : null,
    };
  } catch {
    return null;
  }
}

export function stripHighRiskImportBlock(notes: string): string {
  const start = notes.indexOf(HIGH_RISK_IMPORT_MARKER_START);
  if (start < 0) return notes;
  const end = notes.indexOf(HIGH_RISK_IMPORT_MARKER_END);
  if (end < 0) return notes.slice(0, start).trim();
  return (notes.slice(0, start) + notes.slice(end + HIGH_RISK_IMPORT_MARKER_END.length)).trim();
}

export function parseHighRiskImportMeta(
  governanceNotes: string | null | undefined
): HighRiskImportMeta | null {
  const notes = governanceNotes?.trim() ?? "";
  if (!notes.includes(HIGH_RISK_IMPORT_MARKER_START)) return null;
  const start = notes.indexOf(HIGH_RISK_IMPORT_MARKER_START) + HIGH_RISK_IMPORT_MARKER_START.length;
  const end = notes.indexOf(HIGH_RISK_IMPORT_MARKER_END);
  if (end < start) return null;
  return parseMetaJson(notes.slice(start, end).trim());
}

export function mergeHighRiskImportMeta(
  governanceNotes: string | null | undefined,
  patch: Partial<HighRiskImportMeta>
): string {
  const notes = governanceNotes?.trim() ?? "";
  const human = stripHighRiskImportBlock(notes).trim();
  const current =
    parseHighRiskImportMeta(notes) ??
    defaultHighRiskImportMeta({
      sourceFilename: "",
      sourceFingerprint: "",
      sourceRowNumber: 0,
      sourceRowKey: "",
      classificationReasonCodes: [],
      importedAt: new Date().toISOString(),
    });
  const next: HighRiskImportMeta = { ...current, ...patch, version: 1 };
  const block = `${HIGH_RISK_IMPORT_MARKER_START}\n${JSON.stringify(next)}\n${HIGH_RISK_IMPORT_MARKER_END}`;
  if (!human) return block;
  return `${human}\n\n${block}`;
}
