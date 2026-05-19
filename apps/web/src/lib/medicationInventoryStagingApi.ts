/**
 * Phase 19E.1 — Priority ER inventory staging (upload + review queue).
 */

import enMessages from "@/i18n/messages/en";
import frMessages from "@/i18n/messages/fr";
import type { SupportedLanguage } from "@/i18n/config";
import { apiFetchResponse, asApiObject, parseApiResponse } from "./apiClient";
import { normalizeUserFacingError } from "./userFacingError";

const INVENTORY_IMPORT_ERROR_CODES = [
  "MISSING_REQUIRED_COLUMNS",
  "NO_DATA_ROWS",
  "MISSING_WORKSHEET",
  "EMPTY_FILE",
  "PARSER_FAILURE",
] as const;

type InventoryImportErrorCode = (typeof INVENTORY_IMPORT_ERROR_CODES)[number];

function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function inventoryImportErrorForCode(
  code: InventoryImportErrorCode,
  language: SupportedLanguage
): string | undefined {
  const root = language === "en" ? enMessages : frMessages;
  const v = getByPath(root, `medicationInventoryStaging.errors.${code}`);
  return typeof v === "string" ? v : undefined;
}

function extractInventoryImportErrorCode(message: string): InventoryImportErrorCode | null {
  for (const code of INVENTORY_IMPORT_ERROR_CODES) {
    if (message.includes(code)) return code;
  }
  return null;
}

/** Matches medicationMasterApi — apiFetchResponse prefixes `/api/backend`. */
const API_BASE = "/medication-master";

export type PriorityErInventoryImportErrorBody = {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
  statusCode?: number;
};

export type PriorityErInventoryImportSummary = {
  batchId: string;
  dryRun: boolean;
  workbookFilename: string;
  sheetNames: string[];
  totalRows: number;
  stagedRows: number;
  skippedRows: number;
  exactMatches: number;
  possibleDuplicates: number;
  reviewRequired: number;
  newCandidates: number;
  missingMedicationName: number;
  missingDose: number;
  missingForm: number;
  billingReviewRequired: number;
  safetyReviewRequired: number;
  ndcReviewRequired: number;
  duplicateWarnings: number;
  headerlessDetected: boolean;
};

export type PriorityErInventoryRowOutcome = {
  sourceRowId: string;
  sourceInventoryDescription: string;
  medication: string;
  dose: string;
  form: string;
  reconciliationStatus: string;
  importGateStatus: string;
  overallStatus: string;
  reviewFlags: string[];
  duplicateWarnings: string[];
  validationErrorCount: number;
  matchedConceptIds: string[];
  matchedProductIds: string[];
  matchedCatalogMedicationIds: string[];
};

export type PriorityErInventoryImportResult = {
  summary: PriorityErInventoryImportSummary;
  rowOutcomes: PriorityErInventoryRowOutcome[];
};

export type StagingBatchListItem = {
  batchId: string;
  rowCount: number;
  lastImportedAt: string | Date | null;
  workbookFilename: string | null;
};

export type StagingRowListItem = {
  id: string;
  batchId: string;
  sourceRowId: string;
  exactSourceText: string;
  medication: string;
  dose: string;
  form: string;
  reconciliationStatus: string;
  importGateStatus: string;
  overallStatus: string;
  reviewFlags: string[];
  duplicateWarnings: string[];
  validationErrors: unknown[];
  matchedConceptIds: string[];
  matchedProductIds: string[];
  matchedCatalogMedicationIds: string[];
  workbookFilename: string;
  sheetName: string;
  rowNumber: number | null;
  importedAt: string | Date | null;
  proposedConceptCode: string | null;
  proposedProductCode: string | null;
  reviewConceptUrl: string | null;
  promotionEligible: boolean;
  promotionBlockReasons: Array<{ code: string; message: string }>;
  promoted: boolean;
  canonicalConceptId: string | null;
  canonicalProductId: string | null;
  proposedPackageCode: string | null;
};

export type PromotePriorityErStagingResult = {
  status: "promoted" | "blocked";
  result?: {
    conceptId: string;
    productId: string;
    packageId: string;
    exactSourceText: string;
    sourceNameExact: string;
    runtimeOrderable: false;
  };
  reasons?: Array<{ code: string; message: string }>;
};

export async function uploadPriorityErInventory(params: {
  file: File;
  dryRun: boolean;
  facilityId?: string;
  batchId?: string;
}): Promise<PriorityErInventoryImportResult> {
  const form = new FormData();
  form.append("workbook", params.file, params.file.name);

  const qs = new URLSearchParams();
  qs.set("dryRun", params.dryRun ? "true" : "false");
  if (params.facilityId) qs.set("facilityId", params.facilityId);
  if (params.batchId) qs.set("batchId", params.batchId);

  const response = await apiFetchResponse(
    `${API_BASE}/import-priority-er-inventory?${qs.toString()}`,
    {
      method: "POST",
      body: form,
      headers: {},
      facilityId: params.facilityId,
    }
  );

  const data = await parseApiResponse(response);
  const obj = asApiObject<PriorityErInventoryImportResult>(data);
  if (!obj?.summary || !Array.isArray(obj.rowOutcomes)) {
    throw new Error("INVALID_INVENTORY_IMPORT_RESPONSE");
  }
  return obj;
}

export async function fetchStagingBatches(limit = 50): Promise<StagingBatchListItem[]> {
  const response = await apiFetchResponse(`${API_BASE}/import-staging/batches?limit=${limit}`, {
    method: "GET",
  });
  const data = await parseApiResponse(response);
  const obj = asApiObject<{ batches: StagingBatchListItem[] }>(data);
  return obj?.batches ?? [];
}

export async function promotePriorityErStagingRow(
  stagingRowId: string,
  body: {
    duplicateResolution?: string;
    existingConceptId?: string;
    existingProductId?: string;
    confirmCreateDespiteDuplicate?: boolean;
  } = {},
  facilityId?: string
): Promise<PromotePriorityErStagingResult> {
  const response = await apiFetchResponse(
    `${API_BASE}/import-staging/promote-priority-er/${stagingRowId}`,
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      facilityId,
    }
  );
  const data = await parseApiResponse(response);
  return data as PromotePriorityErStagingResult;
}

export async function fetchStagingRows(params: {
  batchId?: string;
  reconciliationStatus?: string;
  importGateStatus?: string;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<{ total: number; rows: StagingRowListItem[] }> {
  const qs = new URLSearchParams();
  if (params.batchId) qs.set("batchId", params.batchId);
  if (params.reconciliationStatus) qs.set("reconciliationStatus", params.reconciliationStatus);
  if (params.importGateStatus) qs.set("importGateStatus", params.importGateStatus);
  if (params.q) qs.set("q", params.q);
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.offset != null) qs.set("offset", String(params.offset));

  const response = await apiFetchResponse(`${API_BASE}/import-staging/rows?${qs.toString()}`, {
    method: "GET",
  });
  const data = await parseApiResponse(response);
  const obj = asApiObject<{ total: number; rows: StagingRowListItem[] }>(data);
  return { total: obj?.total ?? 0, rows: obj?.rows ?? [] };
}

export function parseInventoryImportErrorPayload(text: string): PriorityErInventoryImportErrorBody | null {
  try {
    const json = JSON.parse(text) as PriorityErInventoryImportErrorBody & { error?: string };
    if (json?.code && json?.message) return json;
    if (typeof json?.message === "string") return { message: json.message, code: json.code };
    if (typeof json?.error === "string") return { message: json.error };
  } catch {
    /* not json */
  }
  return null;
}

export function stagingImportErrorMessage(err: unknown, language: SupportedLanguage): string {
  if (err instanceof Error && err.message) {
    if (err.message === "INVALID_INVENTORY_IMPORT_RESPONSE") {
      const v = getByPath(enMessages, "medicationInventoryStaging.invalidImportResponse");
      const fr = getByPath(frMessages, "medicationInventoryStaging.invalidImportResponse");
      return language === "en"
        ? (typeof v === "string" ? v : "Invalid inventory import response.")
        : (typeof fr === "string" ? fr : "Réponse import inventaire invalide.");
    }
    const code = extractInventoryImportErrorCode(err.message);
    if (code) {
      const localized = inventoryImportErrorForCode(code, language);
      if (localized) return localized;
    }
    return normalizeUserFacingError(err.message, language) || err.message;
  }
  return language === "en" ? "Import failed." : "Échec de l'import.";
}
