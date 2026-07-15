/**
 * Official ICD-10-CM scope for Phase 8 bites / high-risk contaminated wounds.
 * Combines animal external-cause ownership, human-bite ownership, and selected infection families.
 */
import { type ScopedOfficialCode } from "./icd10-tendon-ligament-scope";
import { selectHumanBiteHighRiskWoundScopedCodes } from "./icd10-human-bite-high-risk-wound-scope";

type OfficialRow = { code: string; shortDescription: string; isBillable?: boolean };
const norm = (code: string) => code.replace(/\./g, "").toUpperCase();

/** Animal bite / sting external-cause families (non-human). */
export function selectAnimalBiteScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return rows.filter((row) => {
    if (opts?.billableOnly && !row.isBillable) return false;
    const code = norm(row.code);
    // Dog, other mammal, rodent, reptile, nonvenomous marine, nonvenomous arthropod (selected chapters).
    return (
      code.startsWith("W54") ||
      code.startsWith("W55") ||
      code.startsWith("W53") ||
      code.startsWith("W56") ||
      code.startsWith("W57")
    );
  }) as ScopedOfficialCode[];
}

/** Cellulitis / local soft-tissue infection billable rows used in bite composite guidance. */
export function selectBiteInfectionComplicationScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return rows.filter((row) => {
    if (opts?.billableOnly && !row.isBillable) return false;
    const code = norm(row.code);
    const desc = row.shortDescription.toLowerCase();
    if (code.startsWith("L03")) return true;
    if (code.startsWith("L08") && /wound|bite|local|skin/.test(desc)) return true;
    if (code.startsWith("M65") && /synovitis|tenosynovitis|infect/.test(desc)) return true;
    return false;
  }) as ScopedOfficialCode[];
}

export function selectBitesContaminatedWoundsScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  const byCode = new Map<string, ScopedOfficialCode>();
  for (const row of [
    ...selectAnimalBiteScopedCodes(rows, opts),
    ...selectHumanBiteHighRiskWoundScopedCodes(rows, opts),
    ...selectBiteInfectionComplicationScopedCodes(rows, opts),
  ]) {
    byCode.set(row.code, row);
  }
  return [...byCode.values()];
}
