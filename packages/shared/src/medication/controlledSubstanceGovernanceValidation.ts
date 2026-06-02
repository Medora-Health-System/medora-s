import {
  controlledSubstanceClassSchema,
  type ControlledSubstanceClass,
} from "./medicationSafetyClassifiers.js";

export type ControlledGovernanceApplyStatus = "APPLY" | "MANUAL_REVIEW" | "MISSING_CATALOG";

export type ControlledDeaSchedule = "II" | "III" | "IV" | "V" | "OTHER";

export type ControlledSubstanceGovernanceEntry = {
  /** Preferred stable matcher when Haiti seed defines a code. */
  catalogCode?: string;
  /** Required generic (INN) matcher. */
  genericName: string;
  displayNameEn?: string;
  /** Optional disambiguation when multiple SKUs share genericName. */
  strengthPattern?: string;
  dosageFormPattern?: string;
  controlledSubstanceClass: ControlledSubstanceClass;
  deaSchedule: ControlledDeaSchedule | null;
  governanceStatus: ControlledGovernanceApplyStatus;
  rationale: string;
  sourcePhase: string;
  manualReview: boolean;
  requiresDoubleSign?: boolean;
  requiresWitness?: boolean;
};

export type ControlledSubstanceGovernanceManifestIssue = {
  kind:
    | "DUPLICATE_MATCHER"
    | "INVALID_CLASSIFIER"
    | "INVALID_STATUS"
    | "MISSING_SCHEDULE"
    | "MISSING_MATCHER"
    | "MANUAL_REVIEW_MISMATCH"
    | "APPLY_NONE_CLASS";
  message: string;
};

function norm(value: string): string {
  return value.trim().toLowerCase();
}

export function manifestEntryMatchKey(entry: ControlledSubstanceGovernanceEntry): string {
  if (entry.catalogCode?.trim()) {
    return `code:${entry.catalogCode.trim().toUpperCase()}`;
  }
  const parts = [
    `generic:${norm(entry.genericName)}`,
    entry.strengthPattern ? `strength:${norm(entry.strengthPattern)}` : "",
    entry.dosageFormPattern ? `form:${norm(entry.dosageFormPattern)}` : "",
  ].filter(Boolean);
  return parts.join("|");
}

export function assertControlledSubstanceGovernanceManifest(
  manifest: ControlledSubstanceGovernanceEntry[]
): void {
  const issues = validateControlledSubstanceGovernanceManifest(manifest);
  if (issues.length > 0) {
    throw new Error(
      `[controlled-substance-governance] manifest invalid: ${issues.map((i) => i.message).join("; ")}`
    );
  }
}

export function validateControlledSubstanceGovernanceManifest(
  manifest: ControlledSubstanceGovernanceEntry[]
): ControlledSubstanceGovernanceManifestIssue[] {
  const issues: ControlledSubstanceGovernanceManifestIssue[] = [];
  const seenMatchers = new Map<string, number>();
  const seenCatalogCodes = new Map<string, number>();

  for (const entry of manifest) {
    if (!entry.genericName?.trim()) {
      issues.push({ kind: "MISSING_MATCHER", message: "genericName is required" });
      continue;
    }

    const classResult = controlledSubstanceClassSchema.safeParse(entry.controlledSubstanceClass);
    if (!classResult.success) {
      issues.push({
        kind: "INVALID_CLASSIFIER",
        message: `invalid controlledSubstanceClass: ${entry.controlledSubstanceClass}`,
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
      if (entry.controlledSubstanceClass === "CONTROLLED_NONE") {
        issues.push({
          kind: "APPLY_NONE_CLASS",
          message: `APPLY row cannot use CONTROLLED_NONE (${manifestEntryMatchKey(entry)})`,
        });
      }
      if (!entry.deaSchedule) {
        issues.push({
          kind: "MISSING_SCHEDULE",
          message: `APPLY row missing deaSchedule (${manifestEntryMatchKey(entry)})`,
        });
      }
      if (!entry.catalogCode?.trim() && !entry.strengthPattern?.trim() && !entry.dosageFormPattern?.trim()) {
        issues.push({
          kind: "MISSING_MATCHER",
          message: `APPLY row needs catalogCode or strengthPattern/dosageFormPattern (${entry.genericName})`,
        });
      }
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

    if (entry.catalogCode?.trim()) {
      const code = entry.catalogCode.trim().toUpperCase();
      const codeCount = (seenCatalogCodes.get(code) ?? 0) + 1;
      seenCatalogCodes.set(code, codeCount);
      if (codeCount === 2) {
        issues.push({ kind: "DUPLICATE_MATCHER", message: `duplicate catalogCode ${code}` });
      }
    }
  }

  return issues;
}

export type CatalogRowForControlledMatch = {
  id: string;
  code: string;
  genericName: string | null;
  strength: string | null;
  dosageForm: string | null;
  displayNameEn: string | null;
};

/** Returns true when a catalog row matches a manifest APPLY/MANUAL_REVIEW entry (for tests and seed). */
export function catalogRowMatchesGovernanceEntry(
  catalog: CatalogRowForControlledMatch,
  entry: ControlledSubstanceGovernanceEntry
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

export function legacyControlledFlagsFromManifestEntry(entry: ControlledSubstanceGovernanceEntry): {
  isControlled: boolean;
  controlledSchedule: string | null;
  requiresWitness: boolean;
  requiresDoubleSign: boolean;
} {
  const isControlled = entry.controlledSubstanceClass !== "CONTROLLED_NONE";
  return {
    isControlled,
    controlledSchedule: entry.deaSchedule ?? null,
    requiresWitness: entry.requiresWitness ?? false,
    requiresDoubleSign: entry.requiresDoubleSign ?? false,
  };
}
