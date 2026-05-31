/** Phase 2C.1 — crosswalk validation utilities (no catalog mutation). */
import {
  IMAGING_CATALOG_SUCCESSOR_MAP,
  IMAGING_RETIREMENT_PREDECESSOR_CODES,
  IMAGING_RETIREMENT_SUCCESSOR_CODES,
} from "./imaging-catalog-successor-map";
import type { ImagingCatalogSuccessorEntry, RetirementValidationIssue } from "./imaging-catalog-retirement.types";

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function validateSuccessorMapEntry(entry: ImagingCatalogSuccessorEntry): RetirementValidationIssue[] {
  const issues: RetirementValidationIssue[] = [];
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
  return issues;
}

export function validateImagingCatalogSuccessorMap(
  entries: readonly ImagingCatalogSuccessorEntry[] = IMAGING_CATALOG_SUCCESSOR_MAP
): RetirementValidationIssue[] {
  const issues: RetirementValidationIssue[] = [];
  const predecessors = new Set<string>();
  const successors = new Set<string>();

  for (const entry of entries) {
    issues.push(...validateSuccessorMapEntry(entry));

    const pred = normalizeCode(entry.predecessorCode);
    const succ = normalizeCode(entry.successorCode);

    if (predecessors.has(pred)) {
      issues.push({
        code: pred,
        message: "duplicate predecessorCode in crosswalk",
        severity: "error",
      });
    }
    predecessors.add(pred);

    if (successors.has(succ)) {
      issues.push({
        code: succ,
        message: "duplicate successorCode in crosswalk (successor claimed by multiple predecessors)",
        severity: "error",
      });
    }
    successors.add(succ);

    if (successors.has(pred)) {
      issues.push({
        code: pred,
        message: "predecessorCode is also a successorCode elsewhere (chain/cycle risk)",
        severity: "error",
      });
    }
    if (predecessors.has(succ)) {
      issues.push({
        code: succ,
        message: "successorCode is also a predecessorCode elsewhere (chain/cycle risk)",
        severity: "error",
      });
    }
  }

  return issues;
}

export function assertValidImagingCatalogSuccessorMap(
  entries: readonly ImagingCatalogSuccessorEntry[] = IMAGING_CATALOG_SUCCESSOR_MAP
): void {
  const errors = validateImagingCatalogSuccessorMap(entries).filter((i) => i.severity === "error");
  if (errors.length > 0) {
    throw new Error(
      `Invalid IMAGING_CATALOG_SUCCESSOR_MAP: ${errors.map((e) => `${e.code}: ${e.message}`).join("; ")}`
    );
  }
}

export function listKnownRetirementCodes(): {
  predecessors: readonly string[];
  successors: readonly string[];
} {
  return {
    predecessors: IMAGING_RETIREMENT_PREDECESSOR_CODES,
    successors: IMAGING_RETIREMENT_SUCCESSOR_CODES,
  };
}
