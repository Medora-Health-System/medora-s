/** Phase 2C.3.1 — alias ownership crosswalk validation (no catalog mutation). */
import {
  IMAGING_CATALOG_SUCCESSOR_MAP,
  IMAGING_RETIREMENT_PREDECESSOR_CODES,
  IMAGING_RETIREMENT_SUCCESSOR_CODES,
} from "./imaging-catalog-successor-map";
import {
  IMAGING_ALIAS_OWNERSHIP_PREDECESSOR_CODES,
  IMAGING_ALIAS_OWNERSHIP_SUCCESSOR_CODES,
  IMAGING_ALIAS_SUCCESSOR_OWNERSHIP_MAP,
} from "./imaging-alias-successor-ownership-map";
import type {
  AliasGovernanceValidationIssue,
  ImagingAliasSuccessorOwnershipEntry,
  PlannedAliasOwnership,
} from "./imaging-alias-governance.types";

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function normalizeAlias(alias: string): string {
  return alias.trim().toLowerCase();
}

const VALID_OWNERSHIP_ACTIONS = new Set<PlannedAliasOwnership["action"]>([
  "transfer",
  "retain_dual",
  "deprecate",
  "successor_canonical",
  "manual_review",
]);

export function validateAliasOwnershipEntry(
  entry: ImagingAliasSuccessorOwnershipEntry
): AliasGovernanceValidationIssue[] {
  const issues: AliasGovernanceValidationIssue[] = [];
  const pred = normalizeCode(entry.predecessorCode);
  const succ = normalizeCode(entry.successorCode);

  if (!pred) {
    issues.push({ code: "predecessorCode", message: "predecessorCode is required", severity: "error" });
  }
  if (!succ) {
    issues.push({ code: "successorCode", message: "successorCode is required", severity: "error" });
  }
  if (pred && succ && pred === succ) {
    issues.push({
      code: pred,
      message: "predecessorCode must differ from successorCode",
      severity: "error",
    });
  }
  if (entry.phase !== "2C") {
    issues.push({
      code: pred || "unknown",
      message: `unexpected phase ${entry.phase}`,
      severity: "error",
    });
  }
  if (entry.status !== "planned" && entry.status !== "rolled_back") {
    issues.push({
      code: pred || "unknown",
      message: `unexpected status ${entry.status}`,
      severity: "error",
    });
  }
  if (entry.manualReviewRequired && !entry.manualReviewReason?.trim()) {
    issues.push({
      code: pred || "unknown",
      message: "manualReviewRequired entries must include manualReviewReason",
      severity: "warning",
    });
  }
  if (entry.aliases.length === 0) {
    issues.push({
      code: pred || "unknown",
      message: "aliases plan must not be empty",
      severity: "error",
    });
  }
  if (entry.postCutoverShortcutCodes.length === 0) {
    issues.push({
      code: pred || "unknown",
      message: "postCutoverShortcutCodes must not be empty",
      severity: "error",
    });
  }
  for (const postCode of entry.postCutoverShortcutCodes) {
    if (normalizeCode(postCode) !== succ) {
      issues.push({
        code: pred || "unknown",
        message: `postCutoverShortcutCodes must reference successor ${succ}, found ${postCode}`,
        severity: "error",
      });
    }
  }

  const seenAliases = new Set<string>();
  for (const plan of entry.aliases) {
    const alias = normalizeAlias(plan.alias);
    if (!alias) {
      issues.push({
        code: pred || "unknown",
        message: "planned alias must not be empty",
        severity: "error",
      });
      continue;
    }
    if (seenAliases.has(alias)) {
      issues.push({
        code: pred || "unknown",
        message: `duplicate alias plan "${alias}"`,
        severity: "error",
      });
    }
    seenAliases.add(alias);
    if (!VALID_OWNERSHIP_ACTIONS.has(plan.action)) {
      issues.push({
        code: pred || "unknown",
        message: `invalid alias action for "${alias}"`,
        severity: "error",
      });
    }
  }

  return issues;
}

export function validateImagingAliasSuccessorOwnershipMap(
  entries: readonly ImagingAliasSuccessorOwnershipEntry[] = IMAGING_ALIAS_SUCCESSOR_OWNERSHIP_MAP
): AliasGovernanceValidationIssue[] {
  const issues: AliasGovernanceValidationIssue[] = [];
  const predecessors = new Set<string>();
  const successors = new Set<string>();

  for (const entry of entries) {
    issues.push(...validateAliasOwnershipEntry(entry));

    const pred = normalizeCode(entry.predecessorCode);
    const succ = normalizeCode(entry.successorCode);

    if (predecessors.has(pred)) {
      issues.push({
        code: pred,
        message: "duplicate predecessorCode in ownership map",
        severity: "error",
      });
    }
    predecessors.add(pred);

    if (successors.has(succ)) {
      issues.push({
        code: succ,
        message: "duplicate successorCode in ownership map",
        severity: "error",
      });
    }
    successors.add(succ);
  }

  return issues;
}

/** Ownership map must cover the same pairs as IMAGING_CATALOG_SUCCESSOR_MAP. */
export function validateOwnershipMapAlignsWithSuccessorMap(): AliasGovernanceValidationIssue[] {
  const issues: AliasGovernanceValidationIssue[] = [];

  const retirementPred = new Set(IMAGING_RETIREMENT_PREDECESSOR_CODES.map(normalizeCode));
  const retirementSucc = new Set(IMAGING_RETIREMENT_SUCCESSOR_CODES.map(normalizeCode));
  const ownershipPred = new Set(IMAGING_ALIAS_OWNERSHIP_PREDECESSOR_CODES.map(normalizeCode));
  const ownershipSucc = new Set(IMAGING_ALIAS_OWNERSHIP_SUCCESSOR_CODES.map(normalizeCode));

  for (const pred of retirementPred) {
    if (!ownershipPred.has(pred)) {
      issues.push({
        code: pred,
        message: "IMAGING_CATALOG_SUCCESSOR_MAP predecessor missing from alias ownership map",
        severity: "error",
      });
    }
  }
  for (const succ of retirementSucc) {
    if (!ownershipSucc.has(succ)) {
      issues.push({
        code: succ,
        message: "IMAGING_CATALOG_SUCCESSOR_MAP successor missing from alias ownership map",
        severity: "error",
      });
    }
  }

  for (const entry of IMAGING_ALIAS_SUCCESSOR_OWNERSHIP_MAP) {
    const retirement = IMAGING_CATALOG_SUCCESSOR_MAP.find(
      (e) => normalizeCode(e.predecessorCode) === normalizeCode(entry.predecessorCode)
    );
    if (!retirement) continue;
    if (normalizeCode(retirement.successorCode) !== normalizeCode(entry.successorCode)) {
      issues.push({
        code: entry.predecessorCode,
        message: "ownership map successorCode differs from IMAGING_CATALOG_SUCCESSOR_MAP",
        severity: "error",
      });
    }
  }

  return issues;
}

export function assertValidImagingAliasSuccessorOwnershipMap(
  entries: readonly ImagingAliasSuccessorOwnershipEntry[] = IMAGING_ALIAS_SUCCESSOR_OWNERSHIP_MAP
): void {
  const errors = [
    ...validateImagingAliasSuccessorOwnershipMap(entries),
    ...validateOwnershipMapAlignsWithSuccessorMap(),
  ].filter((i) => i.severity === "error");
  if (errors.length > 0) {
    throw new Error(
      `Invalid IMAGING_ALIAS_SUCCESSOR_OWNERSHIP_MAP: ${errors.map((e) => `${e.code}: ${e.message}`).join("; ")}`
    );
  }
}

export function listKnownAliasOwnershipCodes(): {
  predecessors: readonly string[];
  successors: readonly string[];
} {
  return {
    predecessors: IMAGING_ALIAS_OWNERSHIP_PREDECESSOR_CODES,
    successors: IMAGING_ALIAS_OWNERSHIP_SUCCESSOR_CODES,
  };
}
