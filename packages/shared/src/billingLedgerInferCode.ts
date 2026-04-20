/**
 * Infer primary billable code string and code type from ledger-style fields (Phase 4 structured edits).
 */

export type InferredBillingCodeType = "UNKNOWN" | "INTERNAL" | "CPT" | "HCPCS" | "ICD10_CM";

export function inferPrimaryCodeAndType(input: {
  procedureCode?: string | null;
  hcpcsCode?: string | null;
  diagnosisCodes?: string | null;
}): { code: string | null; codeType: InferredBillingCodeType } {
  const p = input.procedureCode?.trim();
  if (p) return { code: p.slice(0, 32), codeType: "CPT" };
  const h = input.hcpcsCode?.trim();
  if (h) return { code: h.slice(0, 32), codeType: "HCPCS" };
  const dx = input.diagnosisCodes?.trim();
  if (dx) {
    const first = dx.split(";").map((s) => s.trim()).find(Boolean);
    if (first) return { code: first.slice(0, 32), codeType: "ICD10_CM" };
  }
  return { code: null, codeType: "UNKNOWN" };
}
