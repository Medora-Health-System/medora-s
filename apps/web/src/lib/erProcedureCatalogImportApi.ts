import { apiFetch, apiFetchResponse, parseApiResponse } from "./apiClient";

const IMPORT_BASE = "/medication-master/er-procedure-catalog";
const REVIEW_BASE = "/medication-master/er-procedure-complexity-review";

export type ErProcedureImportRow = {
  rowKey: string;
  rowNumber: number;
  code: string;
  codeSystem: string;
  shortDescription: string;
  classification: string;
  category: string | null;
  reasonCodes: string[];
};

export type ErProcedureDryRunResult = {
  dryRun: true;
  fingerprint: string;
  filename: string;
  totalParsed: number;
  counts: Record<string, number>;
  categoryCounts: Record<string, number>;
  rows: ErProcedureImportRow[];
};

export type ErProcedureCommitResult = {
  dryRun: false;
  committed: number;
  complexityQueued: number;
  skipped: number;
  counts: Record<string, number>;
};

async function uploadFile(
  path: string,
  file: File,
  options?: { fields?: Record<string, string>; facilityId?: string }
): Promise<unknown> {
  const form = new FormData();
  form.append("file", file, file.name);
  if (options?.fields) {
    for (const [key, value] of Object.entries(options.fields)) {
      form.append(key, value);
    }
  }
  const response = await apiFetchResponse(`${IMPORT_BASE}${path}`, {
    method: "POST",
    body: form,
    facilityId: options?.facilityId,
  });
  return parseApiResponse(response);
}

export async function dryRunErProcedureCatalog(
  file: File,
  facilityId?: string
): Promise<ErProcedureDryRunResult> {
  const data = await uploadFile("/dry-run", file, { facilityId });
  return data as ErProcedureDryRunResult;
}

export async function commitErProcedureCatalog(
  file: File,
  params: {
    facilityId: string;
    note?: string;
    confirmOrderingOnly: boolean;
    confirmBillingOff: boolean;
    confirmInventoryOff: boolean;
  }
): Promise<ErProcedureCommitResult> {
  const data = await uploadFile("/commit", file, {
    facilityId: params.facilityId,
    fields: {
      facilityId: params.facilityId,
      note: params.note ?? "",
      confirmOrderingOnly: String(params.confirmOrderingOnly),
      confirmBillingOff: String(params.confirmBillingOff),
      confirmInventoryOff: String(params.confirmInventoryOff),
    },
  });
  return data as ErProcedureCommitResult;
}

export type ErProcedureComplexityRow = {
  id: string;
  code: string;
  codeSystem: string;
  shortDescription: string;
  longDescription: string | null;
  categoryHint: string | null;
};

export async function fetchErProcedureComplexityQueue(
  facilityId: string
): Promise<{ rows: ErProcedureComplexityRow[]; total: number }> {
  const data = await apiFetch(`${REVIEW_BASE}?facilityId=${encodeURIComponent(facilityId)}`, {
    facilityId,
  });
  return data as { rows: ErProcedureComplexityRow[]; total: number };
}

export async function approveErProcedureComplexity(
  id: string,
  params: {
    facilityId: string;
    note: string;
    confirmOrderingOnly: true;
    confirmBillingOff: true;
  }
) {
  return apiFetch(`${REVIEW_BASE}/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(params),
    facilityId: params.facilityId,
  });
}

export async function rejectErProcedureComplexity(
  id: string,
  params: { facilityId: string; note: string }
) {
  return apiFetch(`${REVIEW_BASE}/${id}/reject`, {
    method: "POST",
    body: JSON.stringify(params),
    facilityId: params.facilityId,
  });
}
