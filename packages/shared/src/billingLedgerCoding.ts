/**
 * Helpers for Phase 2 billing ledger: whether a row has enough coding metadata
 * to avoid counting as “uncoded” in queues and summaries.
 *
 * Phase 4.9.1 — Readiness blockers ignore documentation-only lines (disposition, diagnosis CPT gap)
 * and MAR rows with no drug mapping when they are not UNMAPPED placeholders.
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

export type BillingLedgerRowWithModule = {
  sourceModule?: string | null;
  procedureCode?: string | null;
  hcpcsCode?: string | null;
  code?: string | null;
  diagnosisCodes?: string | null;
};

/** Disposition / close documentation — never blocks claim-prep readiness for missing CPT/HCPCS. */
export function billingLedgerRowIsNonBillableDocumentationSource(sourceModule: string | null | undefined): boolean {
  return sourceModule?.trim() === "ENCOUNTER_DISPOSITION";
}

/** Diagnosis ledger lines use ICD workflows; do not block on CPT/HCPCS here. */
export function billingLedgerRowIsDiagnosisLedgerLine(sourceModule: string | null | undefined): boolean {
  return sourceModule?.trim() === "DIAGNOSIS";
}

/**
 * True when this row should contribute to encounter readiness “uncoded billable lines” blockers.
 * MAR without any mapped code (and not UNMAPPED) is treated as documentation-only — does not block.
 */
export function billingLedgerRowMissingBillableCodeBlocksReadiness(r: BillingLedgerRowWithModule): boolean {
  if (billingLedgerRowIsNonBillableDocumentationSource(r.sourceModule)) return false;
  if (billingLedgerRowIsDiagnosisLedgerLine(r.sourceModule)) return false;

  const sm = r.sourceModule?.trim() ?? "";
  if (sm === "MED_ADMIN" || sm === "MEDICATION_ADMINISTRATION") {
    if (billingLedgerRowIsUnmapped(r)) return true;
    const hasAny = !!(r.procedureCode?.trim() || r.hcpcsCode?.trim() || r.code?.trim());
    if (hasAny) return false;
    return false;
  }

  return !billingLedgerRowHasUsableCode(r);
}

/** True when the row is informational only for fee-for-service CPT/HCPCS (UI: not an error). */
export function billingLedgerRowIsInformationalNonBillable(r: BillingLedgerRowWithModule): boolean {
  if (billingLedgerRowIsNonBillableDocumentationSource(r.sourceModule)) return true;
  if (billingLedgerRowIsDiagnosisLedgerLine(r.sourceModule)) return true;
  const sm = r.sourceModule?.trim() ?? "";
  if (sm === "MED_ADMIN" || sm === "MEDICATION_ADMINISTRATION") {
    if (billingLedgerRowIsUnmapped(r)) return false;
    return !(r.procedureCode?.trim() || r.hcpcsCode?.trim() || r.code?.trim());
  }
  return false;
}

/** MAR line with drug/supply HCPCS but no separate admin procedure CPT (route was insufficient). */
export function billingLedgerRowIsMedAdminDrugOnlyWithoutProcedureCpt(r: BillingLedgerRowWithModule): boolean {
  const sm = r.sourceModule?.trim() ?? "";
  if (sm !== "MED_ADMIN" && sm !== "MEDICATION_ADMINISTRATION") return false;
  if (billingLedgerRowIsUnmapped(r)) return false;
  return !!(r.hcpcsCode?.trim()) && !r.procedureCode?.trim();
}
