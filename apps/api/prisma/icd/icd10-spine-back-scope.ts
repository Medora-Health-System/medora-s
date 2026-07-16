import type { ScopedOfficialCode } from "./icd10-tendon-ligament-scope";

type OfficialRow = { code: string; shortDescription: string; isBillable?: boolean };

const norm = (code: string) => code.replace(/\./g, "").toUpperCase();
const starts = (code: string, prefix: string) => norm(code).startsWith(norm(prefix));

const SPINE_PAIN_PREFIXES = ["M54"] as const;
const DISC_RADICULOPATHY_PREFIXES = ["M50", "M51", "M47", "M48", "M43"] as const;
const SPINAL_INFECTION_PREFIXES = ["M46", "G061", "G062"] as const;
const CORD_EMERGENCY_PREFIXES = ["G834", "G95", "G992"] as const;
const VERTEBRAL_FRACTURE_PREFIXES = ["S12", "S220", "S221", "S320", "S321", "S322", "M80", "M84"] as const;
const CORD_INJURY_PREFIXES = ["S14", "S24", "S34"] as const;
const SPINAL_DISLOCATION_PREFIXES = ["S13", "S23", "S33"] as const;

/** Official billable ICD-10-CM spine/back scope. Excludes non-spine abdominal/renal symptom families. */
export function selectSpineBackScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return rows.filter((row) => {
    if (opts?.billableOnly && !row.isBillable) return false;
    const code = row.code;
    const description = row.shortDescription.toLowerCase();
    const prefixHit = [
      ...SPINE_PAIN_PREFIXES,
      ...DISC_RADICULOPATHY_PREFIXES,
      ...SPINAL_INFECTION_PREFIXES,
      ...CORD_EMERGENCY_PREFIXES,
      ...VERTEBRAL_FRACTURE_PREFIXES,
      ...CORD_INJURY_PREFIXES,
      ...SPINAL_DISLOCATION_PREFIXES,
    ].some((prefix) => starts(code, prefix));
    if (!prefixHit) return false;
    // Keep pathologic/osteoporotic vertebral fracture families that landed via M80/M84 only when vertebral.
    if (starts(code, "M80") || starts(code, "M84")) {
      return /vertebra|spine|spinal|lumbar|thoracic|cervical|sacrum|coccyx/.test(description);
    }
    return true;
  }) as ScopedOfficialCode[];
}

export function selectSpinePainScopedCodes(rows: OfficialRow[], opts?: { billableOnly?: boolean }) {
  return selectSpineBackScopedCodes(rows, opts).filter((row) => starts(row.code, "M54") || starts(row.code, "S16.1") || starts(row.code, "S39.012"));
}

export function selectSpineEmergencyScopedCodes(rows: OfficialRow[], opts?: { billableOnly?: boolean }) {
  return selectSpineBackScopedCodes(rows, opts).filter((row) =>
    [...CORD_EMERGENCY_PREFIXES, ...SPINAL_INFECTION_PREFIXES, ...CORD_INJURY_PREFIXES].some((prefix) =>
      starts(row.code, prefix),
    ),
  );
}

export function selectVertebralFractureScopedCodes(rows: OfficialRow[], opts?: { billableOnly?: boolean }) {
  return selectSpineBackScopedCodes(rows, opts).filter((row) =>
    [...VERTEBRAL_FRACTURE_PREFIXES, ...SPINAL_DISLOCATION_PREFIXES].some((prefix) => starts(row.code, prefix)),
  );
}
