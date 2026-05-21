import { apiFetchResponse, parseApiResponse } from "./apiClient";

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

export type MedicationCommitResult = {
  dryRun: false;
  committed: number;
  skipped: number;
  orderSearchEnabled: number;
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

async function uploadFile(path: string, file: File, query?: Record<string, string>): Promise<unknown> {
  const form = new FormData();
  form.append("file", file);
  const qs = query ? `?${new URLSearchParams(query).toString()}` : "";
  const response = await apiFetchResponse(`${API_BASE}${path}${qs}`, {
    method: "POST",
    body: form,
  });
  return parseApiResponse(response);
}

export async function dryRunMedicationCatalog(file: File): Promise<MedicationDryRunResult> {
  const data = await uploadFile("/medications/dry-run", file);
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
    enableProviderOrderSearch: String(params.enableProviderOrderSearch),
    confirmOrderSearchEnablement: String(params.confirmOrderSearchEnablement),
    confirmMarRemainsOff: String(params.confirmMarRemainsOff),
    confirmBillingRemainsOff: String(params.confirmBillingRemainsOff),
    note: params.note,
  });
  return data as MedicationCommitResult;
}

export async function dryRunProcedureCatalog(file: File): Promise<ProcedureDryRunResult> {
  const data = await uploadFile("/procedures/dry-run", file);
  return data as ProcedureDryRunResult;
}

export async function commitProcedureCatalog(
  file: File,
  params: { facilityId?: string; note?: string }
): Promise<ProcedureCommitResult> {
  const query: Record<string, string> = {};
  if (params.facilityId) query.facilityId = params.facilityId;
  if (params.note) query.note = params.note;
  const data = await uploadFile("/procedures/commit", file, query);
  return data as ProcedureCommitResult;
}
