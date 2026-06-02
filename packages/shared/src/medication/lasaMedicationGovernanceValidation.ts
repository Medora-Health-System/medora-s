import { lasaRiskLevelSchema, type LasaRiskLevel } from "./medicationSafetyClassifiers.js";

export type LasaGovernanceApplyStatus = "APPLY" | "MANUAL_REVIEW" | "MISSING_CATALOG";

/** Persisted under `highAlertCategories.lasa` when no dedicated LASA JSON column exists. */
export type LasaGovernanceCategoriesPayload = {
  lasaGroupCode: string;
  lasaGroupLabel: string;
  lasaSeverity: LasaRiskLevel;
  sourcePhase: string;
};

export type LasaMedicationGovernanceEntry = {
  lasaGroupCode: string;
  lasaGroupLabel: string;
  lasaSeverity: LasaRiskLevel;
  catalogCode?: string;
  genericName: string;
  displayNameEn?: string;
  strengthPattern?: string;
  dosageFormPattern?: string;
  governanceStatus: LasaGovernanceApplyStatus;
  rationale: string;
  sourcePhase: string;
  manualReview: boolean;
};

export type LasaMedicationGovernanceManifestIssue = {
  kind:
    | "DUPLICATE_MATCHER"
    | "DUPLICATE_GROUP_MEMBER"
    | "INVALID_CLASSIFIER"
    | "INVALID_STATUS"
    | "MISSING_MATCHER"
    | "MANUAL_REVIEW_MISMATCH"
    | "APPLY_NONE_CLASS"
    | "APPLY_GROUP_TOO_SMALL"
    | "CATALOG_CODE_MULTI_GROUP";
  message: string;
};

function norm(value: string): string {
  return value.trim().toLowerCase();
}

export function manifestEntryMatchKey(entry: LasaMedicationGovernanceEntry): string {
  if (entry.catalogCode?.trim()) {
    return `${entry.lasaGroupCode}|code:${entry.catalogCode.trim().toUpperCase()}`;
  }
  const parts = [
    entry.lasaGroupCode,
    `generic:${norm(entry.genericName)}`,
    entry.strengthPattern ? `strength:${norm(entry.strengthPattern)}` : "",
    entry.dosageFormPattern ? `form:${norm(entry.dosageFormPattern)}` : "",
  ].filter(Boolean);
  return parts.join("|");
}

export function catalogMedicationMatchKey(entry: LasaMedicationGovernanceEntry): string {
  if (entry.catalogCode?.trim()) {
    return `code:${entry.catalogCode.trim().toUpperCase()}`;
  }
  return [
    `generic:${norm(entry.genericName)}`,
    entry.strengthPattern ? `strength:${norm(entry.strengthPattern)}` : "",
    entry.dosageFormPattern ? `form:${norm(entry.dosageFormPattern)}` : "",
  ]
    .filter(Boolean)
    .join("|");
}

export function assertLasaMedicationGovernanceManifest(manifest: LasaMedicationGovernanceEntry[]): void {
  const issues = validateLasaMedicationGovernanceManifest(manifest);
  if (issues.length > 0) {
    throw new Error(
      `[lasa-governance] manifest invalid: ${issues.map((i) => i.message).join("; ")}`
    );
  }
}

export function validateLasaMedicationGovernanceManifest(
  manifest: LasaMedicationGovernanceEntry[]
): LasaMedicationGovernanceManifestIssue[] {
  const issues: LasaMedicationGovernanceManifestIssue[] = [];
  const seenMatchers = new Map<string, number>();
  const catalogCodeToGroup = new Map<string, string>();
  const applyCountByGroup = new Map<string, number>();

  for (const entry of manifest) {
    if (!entry.genericName?.trim()) {
      issues.push({ kind: "MISSING_MATCHER", message: "genericName is required" });
      continue;
    }

    if (!lasaRiskLevelSchema.safeParse(entry.lasaSeverity).success) {
      issues.push({
        kind: "INVALID_CLASSIFIER",
        message: `invalid lasaSeverity: ${entry.lasaSeverity}`,
      });
    }

    if (entry.lasaSeverity === "LASA_NONE" && entry.governanceStatus === "APPLY") {
      issues.push({
        kind: "APPLY_NONE_CLASS",
        message: `APPLY row cannot use LASA_NONE (${manifestEntryMatchKey(entry)})`,
      });
    }

    if (!["APPLY", "MANUAL_REVIEW", "MISSING_CATALOG"].includes(entry.governanceStatus)) {
      issues.push({
        kind: "INVALID_STATUS",
        message: `invalid governanceStatus: ${entry.governanceStatus}`,
      });
    }

    if (entry.governanceStatus === "APPLY") {
      if (entry.manualReview) {
        issues.push({
          kind: "MANUAL_REVIEW_MISMATCH",
          message: `APPLY row must not have manualReview=true (${manifestEntryMatchKey(entry)})`,
        });
      }
      if (!entry.catalogCode?.trim() && !entry.strengthPattern?.trim() && !entry.dosageFormPattern?.trim()) {
        issues.push({
          kind: "MISSING_MATCHER",
          message: `APPLY row needs catalogCode or strengthPattern/dosageFormPattern (${entry.genericName})`,
        });
      }
      applyCountByGroup.set(entry.lasaGroupCode, (applyCountByGroup.get(entry.lasaGroupCode) ?? 0) + 1);
    }

    if (entry.governanceStatus === "MANUAL_REVIEW" && !entry.manualReview) {
      issues.push({
        kind: "MANUAL_REVIEW_MISMATCH",
        message: `MANUAL_REVIEW row must have manualReview=true (${manifestEntryMatchKey(entry)})`,
      });
    }

    if (entry.governanceStatus === "MISSING_CATALOG" && !entry.manualReview) {
      issues.push({
        kind: "MANUAL_REVIEW_MISMATCH",
        message: `MISSING_CATALOG row must have manualReview=true (${entry.genericName})`,
      });
    }

    const key = manifestEntryMatchKey(entry);
    const count = (seenMatchers.get(key) ?? 0) + 1;
    seenMatchers.set(key, count);
    if (count === 2) {
      issues.push({ kind: "DUPLICATE_MATCHER", message: `duplicate manifest matcher ${key}` });
    }

    if (entry.catalogCode?.trim() && entry.governanceStatus === "APPLY") {
      const code = entry.catalogCode.trim().toUpperCase();
      const existingGroup = catalogCodeToGroup.get(code);
      if (existingGroup && existingGroup !== entry.lasaGroupCode) {
        issues.push({
          kind: "CATALOG_CODE_MULTI_GROUP",
          message: `catalogCode ${code} in groups ${existingGroup} and ${entry.lasaGroupCode}`,
        });
      } else {
        catalogCodeToGroup.set(code, entry.lasaGroupCode);
      }
    }
  }

  for (const [groupCode, count] of applyCountByGroup) {
    if (count < 2) {
      issues.push({
        kind: "APPLY_GROUP_TOO_SMALL",
        message: `APPLY group ${groupCode} has ${count} member(s); need at least 2`,
      });
    }
  }

  const applyCatalogKeys = new Map<string, number>();
  for (const entry of manifest.filter((e) => e.governanceStatus === "APPLY")) {
    const medKey = catalogMedicationMatchKey(entry);
    const n = (applyCatalogKeys.get(medKey) ?? 0) + 1;
    applyCatalogKeys.set(medKey, n);
    if (n === 2) {
      issues.push({
        kind: "DUPLICATE_GROUP_MEMBER",
        message: `duplicate medication target ${medKey} in APPLY rows`,
      });
    }
  }

  return issues;
}

export type CatalogRowForLasaMatch = {
  id: string;
  code: string;
  genericName: string | null;
  strength: string | null;
  dosageForm: string | null;
  displayNameEn: string | null;
};

export function catalogRowMatchesLasaGovernanceEntry(
  catalog: CatalogRowForLasaMatch,
  entry: LasaMedicationGovernanceEntry
): boolean {
  if (entry.catalogCode?.trim()) {
    return catalog.code.trim().toUpperCase() === entry.catalogCode.trim().toUpperCase();
  }
  if (norm(catalog.genericName ?? "") !== norm(entry.genericName)) {
    return false;
  }
  if (entry.strengthPattern?.trim()) {
    const pattern = norm(entry.strengthPattern);
    const strength = norm(catalog.strength ?? "");
    if (strength !== pattern && !strength.includes(pattern)) {
      return false;
    }
  }
  if (entry.dosageFormPattern?.trim()) {
    const pattern = norm(entry.dosageFormPattern);
    const form = norm(catalog.dosageForm ?? "");
    if (form !== pattern && !form.includes(pattern)) {
      return false;
    }
  }
  return true;
}

export function lasaCategoriesPayloadFromEntry(
  entry: LasaMedicationGovernanceEntry
): LasaGovernanceCategoriesPayload {
  return {
    lasaGroupCode: entry.lasaGroupCode,
    lasaGroupLabel: entry.lasaGroupLabel,
    lasaSeverity: entry.lasaSeverity,
    sourcePhase: entry.sourcePhase,
  };
}

export function mergeLasaIntoHighAlertCategories(
  current: unknown,
  lasa: LasaGovernanceCategoriesPayload
): Record<string, unknown> {
  if (current == null || typeof current !== "object" || Array.isArray(current)) {
    return { lasa };
  }
  return { ...(current as Record<string, unknown>), lasa };
}

export function lasaProfileCompliant(
  profile: { lasaGroupId: string | null; highAlertCategories: unknown },
  lasaGroupCode: string,
  lasaPayload: LasaGovernanceCategoriesPayload
): boolean {
  if ((profile.lasaGroupId ?? null) !== lasaGroupCode) {
    return false;
  }
  if (profile.highAlertCategories == null || typeof profile.highAlertCategories !== "object") {
    return false;
  }
  const lasa = (profile.highAlertCategories as { lasa?: LasaGovernanceCategoriesPayload }).lasa;
  if (!lasa) {
    return false;
  }
  return (
    lasa.lasaGroupCode === lasaPayload.lasaGroupCode &&
    lasa.lasaGroupLabel === lasaPayload.lasaGroupLabel &&
    lasa.lasaSeverity === lasaPayload.lasaSeverity &&
    lasa.sourcePhase === lasaPayload.sourcePhase
  );
}

export function countLasaGovernanceGroups(manifest: LasaMedicationGovernanceEntry[]): number {
  return new Set(manifest.map((e) => e.lasaGroupCode)).size;
}
