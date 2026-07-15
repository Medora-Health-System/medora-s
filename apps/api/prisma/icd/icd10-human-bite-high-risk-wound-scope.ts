import { type ScopedOfficialCode } from "./icd10-tendon-ligament-scope";

type OfficialRow = { code: string; shortDescription: string; isBillable?: boolean };
const norm = (code: string) => code.replace(/\./g, "").toUpperCase();

/** Human external-cause ownership plus anatomic open-bite codes for routing certification. */
export function selectHumanBiteHighRiskWoundScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return rows.filter((row) => {
    if (opts?.billableOnly && !row.isBillable) return false;
    const code = norm(row.code);
    if (code.startsWith("W54") || code.startsWith("W55")) return false;
    return code.startsWith("W503") || code.startsWith("Y041") || /^open bite\b/i.test(row.shortDescription) || /open bite of/i.test(row.shortDescription);
  }) as ScopedOfficialCode[];
}
