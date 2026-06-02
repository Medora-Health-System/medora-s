import {
  highAlertClassSchema,
  safetyRequirementCodeSchema,
  type HighAlertClass,
  type SafetyRequirementCode,
} from "./medicationSafetyClassifiers.js";

export type HighAlertGovernanceApplyStatus = "APPLY" | "MANUAL_REVIEW" | "MISSING_CATALOG";

/** Persisted on MedicationSafetyProfile.highAlertCategories when schema has no dedicated column. */
export type HighAlertGovernanceCategoriesPayload = {
  highAlertClass: HighAlertClass;
  safetyRequirements: SafetyRequirementCode[];
  sourcePhase: string;
};

export type HighAlertMedicationGovernanceEntry = {
  catalogCode?: string;
  genericName: string;
  displayNameEn?: string;
  strengthPattern?: string;
  dosageFormPattern?: string;
  highAlertClass: HighAlertClass;
  safetyRequirementCodes: SafetyRequirementCode[];
  governanceStatus: HighAlertGovernanceApplyStatus;
  rationale: string;
  sourcePhase: string;
  manualReview: boolean;
};

export type HighAlertMedicationGovernanceManifestIssue = {
  kind:
    | "DUPLICATE_MATCHER"
    | "INVALID_CLASSIFIER"
    | "INVALID_SAFETY_REQUIREMENT"
    | "INVALID_STATUS"
    | "MISSING_MATCHER"
    | "MANUAL_REVIEW_MISMATCH"
    | "APPLY_NONE_CLASS"
    | "EMPTY_SAFETY_REQUIREMENTS";
  message: string;
};

function norm(value: string): string {
  return value.trim().toLowerCase();
}

export function manifestEntryMatchKey(entry: HighAlertMedicationGovernanceEntry): string {
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

export function assertHighAlertMedicationGovernanceManifest(
  manifest: HighAlertMedicationGovernanceEntry[]
): void {
  const issues = validateHighAlertMedicationGovernanceManifest(manifest);
  if (issues.length > 0) {
    throw new Error(
      `[high-alert-governance] manifest invalid: ${issues.map((i) => i.message).join("; ")}`
    );
  }
}

export function validateHighAlertMedicationGovernanceManifest(
  manifest: HighAlertMedicationGovernanceEntry[]
): HighAlertMedicationGovernanceManifestIssue[] {
  const issues: HighAlertMedicationGovernanceManifestIssue[] = [];
  const seenMatchers = new Map<string, number>();
  const seenCatalogCodes = new Map<string, number>();

  for (const entry of manifest) {
    if (!entry.genericName?.trim()) {
      issues.push({ kind: "MISSING_MATCHER", message: "genericName is required" });
      continue;
    }

    if (!highAlertClassSchema.safeParse(entry.highAlertClass).success) {
      issues.push({
        kind: "INVALID_CLASSIFIER",
        message: `invalid highAlertClass: ${entry.highAlertClass}`,
      });
    }

    if (!Array.isArray(entry.safetyRequirementCodes) || entry.safetyRequirementCodes.length === 0) {
      if (entry.governanceStatus === "APPLY" && entry.highAlertClass !== "HIGH_ALERT_NONE") {
        issues.push({
          kind: "EMPTY_SAFETY_REQUIREMENTS",
          message: `APPLY row missing safetyRequirementCodes (${manifestEntryMatchKey(entry)})`,
        });
      }
    } else {
      for (const code of entry.safetyRequirementCodes) {
        if (!safetyRequirementCodeSchema.safeParse(code).success) {
          issues.push({
            kind: "INVALID_SAFETY_REQUIREMENT",
            message: `invalid safetyRequirementCode ${code} (${manifestEntryMatchKey(entry)})`,
          });
        }
      }
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
      if (entry.highAlertClass === "HIGH_ALERT_NONE") {
        issues.push({
          kind: "APPLY_NONE_CLASS",
          message: `APPLY row cannot use HIGH_ALERT_NONE (${manifestEntryMatchKey(entry)})`,
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

export type CatalogRowForHighAlertMatch = {
  id: string;
  code: string;
  genericName: string | null;
  strength: string | null;
  dosageForm: string | null;
  displayNameEn: string | null;
};

export function catalogRowMatchesHighAlertGovernanceEntry(
  catalog: CatalogRowForHighAlertMatch,
  entry: HighAlertMedicationGovernanceEntry
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

export function catalogWitnessFlagsFromHighAlertEntry(entry: HighAlertMedicationGovernanceEntry): {
  requiresWitness: boolean;
  requiresDoubleSign: boolean;
} {
  const codes = new Set(entry.safetyRequirementCodes);
  return {
    requiresWitness: codes.has("REQUIRES_WITNESS"),
    requiresDoubleSign:
      codes.has("REQUIRES_INDEPENDENT_DOUBLE_CHECK") || codes.has("REQUIRES_DUAL_VERIFICATION"),
  };
}

export function safetyProfilePayloadFromHighAlertEntry(
  entry: HighAlertMedicationGovernanceEntry
): {
  isHighAlert: boolean;
  highAlertCategories: HighAlertGovernanceCategoriesPayload;
  requiresWitness: boolean;
  requiresDoubleSign: boolean;
} {
  const witnessFlags = catalogWitnessFlagsFromHighAlertEntry(entry);
  return {
    isHighAlert: entry.highAlertClass !== "HIGH_ALERT_NONE",
    highAlertCategories: {
      highAlertClass: entry.highAlertClass,
      safetyRequirements: [...entry.safetyRequirementCodes],
      sourcePhase: entry.sourcePhase,
    },
    ...witnessFlags,
  };
}

export function countUniqueSafetyRequirementCodesInManifest(
  manifest: HighAlertMedicationGovernanceEntry[]
): number {
  const codes = new Set<SafetyRequirementCode>();
  for (const entry of manifest) {
    for (const code of entry.safetyRequirementCodes) {
      codes.add(code);
    }
  }
  return codes.size;
}

export function countSafetyRequirementAssignmentsInManifest(
  manifest: HighAlertMedicationGovernanceEntry[]
): number {
  return manifest.reduce((sum, entry) => sum + entry.safetyRequirementCodes.length, 0);
}
