/**
 * ER-1.1 groundwork — ordered 1-based indices for future CPT/HCPCS → diagnosis pointer mapping.
 * Not consumed by X12 or claim assembly in this phase; safe additive utility.
 */

export type DiagnosisPointerRow = {
  /** 1 = primary / first-listed in encounter order. */
  pointerIndex: number;
  diagnosisId: string;
  code: string;
};

/**
 * @param activeOrdered Active encounter diagnoses sorted by `sortOrder` then `createdAt`
 *        (same order as claim export clinical prefix).
 */
export function buildDiagnosisPointerIndex(
  activeOrdered: ReadonlyArray<{ id: string; code: string }>
): readonly DiagnosisPointerRow[] {
  return activeOrdered.map((row, i) => ({
    pointerIndex: i + 1,
    diagnosisId: row.id,
    code: row.code.trim(),
  }));
}
