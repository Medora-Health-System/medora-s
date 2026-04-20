/**
 * Helpers for Phase 2 billing ledger: whether a row has enough coding metadata
 * to avoid counting as “uncoded” in queues and summaries.
 */

export function billingLedgerDiagnosisStringHasCode(diagnosisCodes: string | null | undefined): boolean {
  if (!diagnosisCodes?.trim()) return false;
  return diagnosisCodes.split(";").some((p) => p.trim().length > 0);
}

/** True when the line is a placeholder from missing BillingCatalog mapping (Phase 4.6+). */
export function billingLedgerRowIsUnmapped(r: {
  procedureCode?: string | null;
  hcpcsCode?: string | null;
  code?: string | null;
}): boolean {
  if (r.procedureCode?.trim().toUpperCase() === "UNMAPPED") return true;
  if (r.hcpcsCode?.trim().toUpperCase() === "UNMAPPED") return true;
  if (r.code?.trim().toUpperCase() === "UNMAPPED") return true;
  return false;
}

export function billingLedgerRowHasUsableCode(r: {
  procedureCode?: string | null;
  hcpcsCode?: string | null;
  code?: string | null;
  diagnosisCodes?: string | null;
}): boolean {
  if (billingLedgerRowIsUnmapped(r)) return false;
  if (r.procedureCode?.trim() || r.hcpcsCode?.trim() || r.code?.trim()) return true;
  return billingLedgerDiagnosisStringHasCode(r.diagnosisCodes);
}
