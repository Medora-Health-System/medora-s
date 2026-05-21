import enMessages from "@/i18n/messages/en";
import frMessages from "@/i18n/messages/fr";
import type { SupportedLanguage } from "@/i18n/config";
import { apiFetchResponse, parseApiResponse } from "./apiClient";
import { normalizeUserFacingError } from "./userFacingError";

const API_BASE = "/medication-master/controlled-catalog";

export type MedicationImportRow = {
  rowKey: string;
  rowNumber: number;
  medication: string;
  dose: string;
  form: string;
  classification: string;
};

export type MedicationDryRunResult = {
  dryRun: true;
  fingerprint: string;
  filename: string;
  counts: Record<string, number>;
  rows: MedicationImportRow[];
};

export type MedicationOrderSearchBlocked = {
  rowKey: string;
  rowNumber: number;
  medication: string;
  productId: string;
  reason: string;
  blockers?: string[];
};

export type MedicationCommitResult = {
  dryRun: false;
  committed: number;
  skipped: number;
  orderSearchEnabled: number;
  orderSearchBlocked?: MedicationOrderSearchBlocked[];
  counts: Record<string, number>;
};

export type ProcedureImportRow = {
  rowKey: string;
  rowNumber: number;
  code: string;
  codeSystem: string;
  shortDescription: string;
  classification: string;
};

export type ProcedureDryRunResult = {
  dryRun: true;
  fingerprint: string;
  filename: string;
  counts: Record<string, number>;
  rows: ProcedureImportRow[];
};

export type ProcedureCommitResult = {
  dryRun: false;
  committed: number;
  skipped: number;
  counts: Record<string, number>;
};

function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

const CATALOG_IMPORT_ERROR_CODES = [
  "INVALID_COMMIT_PARAMS",
  "MISSING_FILE",
  "MISSING_REQUIRED_COLUMNS",
] as const;

type CatalogImportErrorCode = (typeof CATALOG_IMPORT_ERROR_CODES)[number];

function catalogImportErrorForCode(
  code: CatalogImportErrorCode,
  language: SupportedLanguage
): string | undefined {
  const root = language === "en" ? enMessages : frMessages;
  const v = getByPath(root, `catalogImport.errors.${code}`);
  return typeof v === "string" ? v : undefined;
}

function extractCatalogImportErrorCode(message: string): CatalogImportErrorCode | null {
  for (const code of CATALOG_IMPORT_ERROR_CODES) {
    if (message.includes(code)) return code;
  }
  return null;
}

/** Surfaces Nest/proxy JSON errors for catalog import (avoids generic "Something went wrong."). */
export function catalogImportErrorMessage(err: unknown, language: SupportedLanguage): string {
  if (!(err instanceof Error) || !err.message) {
    return language === "en" ? "Import failed." : "Échec de l'import.";
  }

  const code = extractCatalogImportErrorCode(err.message);
  if (code) {
    const localized = catalogImportErrorForCode(code, language);
    if (localized) return localized;
  }

  const stripped = err.message.replace(/\s*\([A-Z0-9_]+\)\s*$/, "").trim();
  const normalized = normalizeUserFacingError(stripped, language);
  if (normalized && normalized !== (language === "en" ? "Something went wrong." : "Une erreur est survenue.")) {
    return normalized;
  }
  if (/[àâäéèêëïîôùûçœæ]/i.test(stripped)) return stripped;
  if (stripped.length >= 3 && stripped.length <= 500) return stripped;
  return language === "en" ? "Import failed." : "Échec de l'import.";
}

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
  const response = await apiFetchResponse(`${API_BASE}${path}`, {
    method: "POST",
    body: form,
    facilityId: options?.facilityId,
  });
  return parseApiResponse(response);
}

export async function dryRunMedicationCatalog(file: File, facilityId?: string): Promise<MedicationDryRunResult> {
  const data = await uploadFile("/medications/dry-run", file, { facilityId });
  return data as MedicationDryRunResult;
}

export async function commitMedicationCatalog(
  file: File,
  params: {
    facilityId: string;
    enableProviderOrderSearch: boolean;
    confirmOrderSearchEnablement: boolean;
    confirmMarRemainsOff: boolean;
    confirmBillingRemainsOff: boolean;
    note: string;
  }
): Promise<MedicationCommitResult> {
  const data = await uploadFile("/medications/commit", file, {
    facilityId: params.facilityId,
    fields: {
      facilityId: params.facilityId,
      enableProviderOrderSearch: String(params.enableProviderOrderSearch),
      confirmOrderSearchEnablement: String(params.confirmOrderSearchEnablement),
      confirmMarRemainsOff: String(params.confirmMarRemainsOff),
      confirmBillingRemainsOff: String(params.confirmBillingRemainsOff),
      note: params.note,
    },
  });
  return data as MedicationCommitResult;
}

export async function dryRunProcedureCatalog(file: File, facilityId?: string): Promise<ProcedureDryRunResult> {
  const data = await uploadFile("/procedures/dry-run", file, { facilityId });
  return data as ProcedureDryRunResult;
}

export async function commitProcedureCatalog(
  file: File,
  params: { facilityId?: string; note?: string }
): Promise<ProcedureCommitResult> {
  const fields: Record<string, string> = {};
  if (params.facilityId) fields.facilityId = params.facilityId;
  if (params.note) fields.note = params.note;
  const data = await uploadFile("/procedures/commit", file, {
    facilityId: params.facilityId,
    fields,
  });
  return data as ProcedureCommitResult;
}
