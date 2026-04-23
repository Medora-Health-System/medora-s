import {
  billingLedgerDiagnosisStringHasCode,
  billingLedgerRowIsDiagnosisLedgerLine,
} from "./billingLedgerCoding.js";

/** @see buildDiagnosisPointerIndex — future CPT/HCPCS line → diagnosis pointer (ER-1.1 groundwork). */

type DxRow = { code: string };
type EvRow = {
  sourceModule: string;
  diagnosisCodes: string | null;
  code: string | null;
};

/**
 * Build ordered diagnosis code list for claim export.
 * - When active encounter diagnoses exist: use their order (sortOrder + stable tie-break), then append
 *   any extra tokens from billing events not already present (procedure-line dx pointers, legacy gaps).
 * - When none: derive from billing events in encounter query order (no alphabetical resort).
 */
export function buildOrderedDiagnosisCodesForClaimExport(
  activeDiagnosesOrdered: readonly DxRow[],
  billingEventsInDbOrder: readonly EvRow[]
): string[] {
  const pushToken = (into: string[], seen: Set<string>, token: string) => {
    const t = token.trim();
    if (!t) return;
    const key = t.toUpperCase().replace(/\./g, "");
    if (seen.has(key)) return;
    seen.add(key);
    into.push(t);
  };

  const seen = new Set<string>();
  const out: string[] = [];

  if (activeDiagnosesOrdered.length > 0) {
    for (const d of activeDiagnosesOrdered) {
      pushToken(out, seen, d.code);
    }
    for (const ev of billingEventsInDbOrder) {
      const raw = ev.diagnosisCodes?.trim();
      if (raw && billingLedgerDiagnosisStringHasCode(raw)) {
        for (const part of raw.split(";")) {
          pushToken(out, seen, part);
        }
      }
    }
    return out;
  }

  for (const ev of billingEventsInDbOrder) {
    const raw = ev.diagnosisCodes?.trim();
    if (raw && billingLedgerDiagnosisStringHasCode(raw)) {
      for (const part of raw.split(";")) {
        pushToken(out, seen, part);
      }
    }
    if (billingLedgerRowIsDiagnosisLedgerLine(ev.sourceModule) && ev.code?.trim()) {
      pushToken(out, seen, ev.code.trim());
    }
  }
  return out;
}
