import type { ScopedOfficialCode } from "./icd10-tendon-ligament-scope";

type OfficialRow = {
  code: string;
  shortDescription: string;
  longDescription?: string;
  isBillable?: boolean;
};

const norm = (code: string) => code.replace(/\./g, "").toUpperCase();
const starts = (code: string, prefix: string) => norm(code).startsWith(norm(prefix));
const text = (row: OfficialRow) => `${row.shortDescription} ${row.longDescription ?? ""}`.toLowerCase();

const INTRACRANIAL_INJURY_PREFIXES = ["S06"] as const;
const SKULL_FACIAL_FRACTURE_PREFIXES = ["S02"] as const;
const JAW_DISLOCATION_PREFIXES = ["S03.0"] as const;
/** Tooth fracture (S02.5) and tooth dislocation/avulsion (S03.2) — official "tooth injury" codes. */
const DENTAL_TRAUMA_PREFIXES = ["S02.5", "S03.2"] as const;
const OPEN_WOUND_HEAD_PREFIXES = ["S01"] as const;
const SUPERFICIAL_HEAD_PREFIXES = ["S00"] as const;
const EYE_INJURY_PREFIXES = ["S05"] as const;
const HEAD_AMPUTATION_PREFIXES = ["S08"] as const;
const UNSPECIFIED_HEAD_INJURY_PREFIXES = ["S09"] as const;

const CONCUSSION_PREFIXES = ["S06.0"] as const;
/** Traumatic ICH header families with "hemorrhage" in every official description. */
const ICH_HEMORRHAGE_HEADER_PREFIXES = ["S06.4", "S06.5", "S06.6"] as const;
/** S06.3 (focal TBI) mixes non-hemorrhagic "unspecified focal TBI" (S06.30) rows with
 * contusion/laceration/hemorrhage-of-cerebrum rows (S06.31-S06.36) — filter by description. */
const ICH_FOCAL_PREFIX = "S06.3";
const ICH_FOCAL_DESCRIPTION_PATTERN = /hemorrhage|hemor|contusion|contus|laceration|\blac\b/;

/**
 * Official billable ICD-10-CM head/facial trauma scope. Covers traumatic brain injury /
 * intracranial hemorrhage (S06), skull and facial fractures (S02), jaw dislocation (S03.0),
 * tooth fracture/dislocation (S02.5, S03.2), open wounds of head (S01), superficial head
 * injuries (S00), eye/orbit injuries (S05, kept for ownership audit — eye-owned), traumatic
 * amputation of ear/head parts (S08), and other/unspecified head injuries (S09).
 * Does not invent codes — every prefix below is an official FY2026 ICD-10-CM category.
 */
export function selectHeadFacialTraumaScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return rows.filter((row) => {
    if (opts?.billableOnly && !row.isBillable) return false;
    const code = row.code;
    return [
      ...INTRACRANIAL_INJURY_PREFIXES,
      ...SKULL_FACIAL_FRACTURE_PREFIXES,
      ...JAW_DISLOCATION_PREFIXES,
      ...DENTAL_TRAUMA_PREFIXES,
      ...OPEN_WOUND_HEAD_PREFIXES,
      ...SUPERFICIAL_HEAD_PREFIXES,
      ...EYE_INJURY_PREFIXES,
      ...HEAD_AMPUTATION_PREFIXES,
      ...UNSPECIFIED_HEAD_INJURY_PREFIXES,
    ].some((prefix) => starts(code, prefix));
  }) as ScopedOfficialCode[];
}

/** Traumatic intracranial injury: concussion, cerebral edema, diffuse/focal TBI, hemorrhage, other/unspecified (S06). */
export function selectIntracranialInjuryScopedCodes(rows: OfficialRow[], opts?: { billableOnly?: boolean }) {
  return selectHeadFacialTraumaScopedCodes(rows, opts).filter((row) => starts(row.code, "S06"));
}

/** Skull and facial fractures: vault, base, nasal, orbital, zygoma/maxilla, tooth, mandible, Le Fort, alveolar (S02). */
export function selectSkullFacialFractureScopedCodes(rows: OfficialRow[], opts?: { billableOnly?: boolean }) {
  return selectHeadFacialTraumaScopedCodes(rows, opts).filter((row) => starts(row.code, "S02"));
}

/** Concussion / mild TBI (S06.0). */
export function selectConcussionScopedCodes(rows: OfficialRow[], opts?: { billableOnly?: boolean }) {
  return selectHeadFacialTraumaScopedCodes(rows, opts).filter((row) => starts(row.code, "S06.0"));
}

/**
 * Traumatic intracranial hemorrhage: epidural (S06.4), traumatic subdural (S06.5),
 * traumatic subarachnoid (S06.6), and the hemorrhage/contusion/laceration-of-cerebrum
 * rows within focal TBI (S06.3). Excludes non-hemorrhagic "unspecified focal TBI" (S06.30).
 */
export function selectIchScopedCodes(rows: OfficialRow[], opts?: { billableOnly?: boolean }) {
  return selectHeadFacialTraumaScopedCodes(rows, opts).filter((row) => {
    if (ICH_HEMORRHAGE_HEADER_PREFIXES.some((prefix) => starts(row.code, prefix))) return true;
    if (starts(row.code, ICH_FOCAL_PREFIX)) return ICH_FOCAL_DESCRIPTION_PATTERN.test(text(row));
    return false;
  });
}

export { CONCUSSION_PREFIXES, ICH_HEMORRHAGE_HEADER_PREFIXES, ICH_FOCAL_PREFIX, ICH_FOCAL_DESCRIPTION_PATTERN };
