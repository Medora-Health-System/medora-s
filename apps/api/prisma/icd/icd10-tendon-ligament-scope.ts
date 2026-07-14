/**
 * Official ICD-10-CM prefix scopes for tendon and ligament production certification.
 * Scopes are derived from CMS chapter structure (S/T/M families), not hand-picked sample rows.
 */

export type IcdScopeFamily = {
  id: string;
  label: string;
  /** Inclusive CMS prefixes (dotted or undotted; matched on normalized code). */
  prefixes: string[];
  /** Optional description keywords (normalized lowercase) to include when prefix alone is too broad. */
  includeDescriptionKeywords?: string[];
  /** Optional description keywords to exclude (e.g. pure dislocation within S83). */
  excludeDescriptionKeywords?: string[];
};

function n(prefix: string): string {
  return prefix.toUpperCase().replace(/\./g, "");
}

export const TENDON_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "tendon_shoulder_rotator", label: "Shoulder / rotator cuff tendon", prefixes: ["S46.0", "M75.1"] },
  { id: "tendon_biceps", label: "Biceps tendon", prefixes: ["S46.1", "S46.2"] },
  { id: "tendon_triceps", label: "Triceps tendon", prefixes: ["S46.3"] },
  { id: "tendon_forearm_wrist_hand", label: "Forearm / wrist / hand tendon", prefixes: ["S56", "S66"] },
  { id: "tendon_hip_thigh", label: "Hip / thigh tendon", prefixes: ["S76"] },
  { id: "tendon_lower_leg_achilles", label: "Lower leg / Achilles tendon", prefixes: ["S86"] },
  { id: "tendon_ankle_foot", label: "Ankle / foot tendon", prefixes: ["S96"] },
  { id: "tendon_spontaneous_m66", label: "Spontaneous tendon rupture", prefixes: ["M66"] },
];

export const LIGAMENT_SCOPE_FAMILIES: IcdScopeFamily[] = [
  {
    id: "ligament_knee",
    label: "Knee ligament",
    prefixes: ["S83.4", "S83.5", "S83.6"],
    includeDescriptionKeywords: ["ligament", "cruciate", "collateral"],
  },
  {
    id: "ligament_ankle",
    label: "Ankle / syndesmosis ligament",
    prefixes: ["S93.4"],
    includeDescriptionKeywords: ["ligament", "tibiofibular", "syndesm"],
  },
  {
    id: "ligament_wrist_hand",
    label: "Wrist / hand / thumb ligament",
    prefixes: ["S63.3", "S63.4", "S63.5", "S63.6"],
    includeDescriptionKeywords: ["ligament", "sprain"],
  },
  {
    id: "ligament_elbow",
    label: "Elbow collateral ligament",
    prefixes: ["S53.3", "S53.4"],
    includeDescriptionKeywords: ["ligament", "sprain"],
  },
  {
    id: "ligament_shoulder_ac",
    label: "Shoulder / AC ligament",
    prefixes: ["S43.4", "S43.5"],
    includeDescriptionKeywords: ["ligament", "sprain"],
  },
  {
    id: "ligament_spine_pelvis",
    label: "Spine / pelvis ligament",
    prefixes: ["S13.1", "S23.1", "S33.4", "S33.5"],
    includeDescriptionKeywords: ["ligament"],
  },
];

export type ScopedOfficialCode = {
  code: string;
  normalizedCode: string;
  shortDescription: string;
  longDescription: string;
  isBillable: boolean;
  familyId: string;
};

export function codeMatchesPrefix(normalizedCode: string, prefix: string): boolean {
  return normalizedCode.startsWith(n(prefix));
}

export function rowInFamily(
  row: {
    code: string;
    normalizedCode: string;
    shortDescription: string;
    longDescription: string;
    isBillable: boolean;
  },
  family: IcdScopeFamily,
): boolean {
  if (!family.prefixes.some((p) => codeMatchesPrefix(row.normalizedCode, p))) return false;
  const text = `${row.shortDescription} ${row.longDescription}`.toLowerCase();
  if (family.excludeDescriptionKeywords?.some((k) => text.includes(k))) return false;
  if (family.includeDescriptionKeywords?.length) {
    return family.includeDescriptionKeywords.some((k) => text.includes(k));
  }
  return true;
}

export function selectScopedCodes(
  rows: Array<{
    code: string;
    normalizedCode: string;
    shortDescription: string;
    longDescription: string;
    isBillable: boolean;
  }>,
  families: IcdScopeFamily[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  const billableOnly = opts?.billableOnly ?? true;
  const out: ScopedOfficialCode[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (billableOnly && !row.isBillable) continue;
    for (const family of families) {
      if (!rowInFamily(row, family)) continue;
      if (seen.has(row.code)) break;
      seen.add(row.code);
      out.push({
        code: row.code,
        normalizedCode: row.normalizedCode,
        shortDescription: row.shortDescription,
        longDescription: row.longDescription,
        isBillable: row.isBillable,
        familyId: family.id,
      });
      break;
    }
  }
  return out;
}
