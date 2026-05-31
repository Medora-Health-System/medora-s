/** Phase 2C.3.1 — alias collision and ownership gap scanners (read-only). */
import { KNOWN_IMAGING_SEARCH_ALIAS_SHORTCUTS } from "./imaging-catalog-retirement.constants";
import {
  scanSearchShortcutCollisions,
  scanSharedAliasCollisions,
} from "./imaging-catalog-retirement.scan";
import type { RetirementCatalogRowSnapshot } from "./imaging-catalog-retirement.types";
import {
  IMAGING_ALIAS_SUCCESSOR_OWNERSHIP_MAP,
  getAliasOwnershipEntryForPredecessor,
} from "./imaging-alias-successor-ownership-map";
import type {
  AliasGovernanceValidationIssue,
  AliasOwnershipGap,
  ImagingAliasGovernanceScanResult,
  SearchShortcutOwnershipGap,
} from "./imaging-alias-governance.types";
import {
  validateImagingAliasSuccessorOwnershipMap,
  validateOwnershipMapAlignsWithSuccessorMap,
} from "./imaging-alias-governance.validation";

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function normalizeAlias(alias: string): string {
  return alias.trim().toLowerCase();
}

function ownershipPlanByAlias(
  entry: (typeof IMAGING_ALIAS_SUCCESSOR_OWNERSHIP_MAP)[number]
): Map<string, (typeof entry.aliases)[number]> {
  return new Map(entry.aliases.map((a) => [normalizeAlias(a.alias), a]));
}

/** Shared DB aliases without a transfer / retain_dual / manual_review plan. */
export function scanAliasOwnershipGaps(
  catalogRows: RetirementCatalogRowSnapshot[]
): AliasOwnershipGap[] {
  const gaps: AliasOwnershipGap[] = [];
  const collisions = scanSharedAliasCollisions(catalogRows);

  for (const collision of collisions) {
    const entry = getAliasOwnershipEntryForPredecessor(collision.pairPredecessor);
    if (!entry) {
      gaps.push({
        predecessorCode: collision.pairPredecessor,
        successorCode: collision.pairSuccessor,
        alias: collision.alias,
        message: "no ownership map entry for duplicate pair",
      });
      continue;
    }

    const plan = ownershipPlanByAlias(entry).get(normalizeAlias(collision.alias));
    if (!plan) {
      gaps.push({
        predecessorCode: collision.pairPredecessor,
        successorCode: collision.pairSuccessor,
        alias: collision.alias,
        message: "shared alias missing from ownership plan",
      });
      continue;
    }

    const allowedDuringDual = new Set<typeof plan.action>([
      "transfer",
      "retain_dual",
      "manual_review",
    ]);
    if (!allowedDuringDual.has(plan.action)) {
      gaps.push({
        predecessorCode: collision.pairPredecessor,
        successorCode: collision.pairSuccessor,
        alias: collision.alias,
        message: `ownership action "${plan.action}" does not cover active shared alias collision`,
      });
    }
  }

  return gaps;
}

/**
 * Search shortcuts that still include predecessor after cutover design,
 * or omit successor when shortcut should resolve to successor only.
 */
export function scanSearchShortcutOwnershipGaps(
  searchAliasShortcutMap: Record<string, string[]> = KNOWN_IMAGING_SEARCH_ALIAS_SHORTCUTS as Record<
    string,
    string[]
  >
): SearchShortcutOwnershipGap[] {
  const gaps: SearchShortcutOwnershipGap[] = [];

  for (const entry of IMAGING_ALIAS_SUCCESSOR_OWNERSHIP_MAP) {
    const pred = normalizeCode(entry.predecessorCode);
    const succ = normalizeCode(entry.successorCode);
    const expected = entry.postCutoverShortcutCodes.map(normalizeCode);

    for (const query of entry.searchShortcutQueries) {
      const q = query.trim().toLowerCase();
      const current = (searchAliasShortcutMap[q] ?? []).map(normalizeCode);

      if (current.length === 0) {
        gaps.push({
          predecessorCode: pred,
          successorCode: succ,
          query: q,
          currentCodes: current,
          expectedPostCutoverCodes: expected,
          message: "search shortcut query missing from shortcut map",
        });
        continue;
      }

      const includesPred = current.includes(pred);
      const includesSucc = current.includes(succ);

      if (includesPred && !includesSucc) {
        gaps.push({
          predecessorCode: pred,
          successorCode: succ,
          query: q,
          currentCodes: current,
          expectedPostCutoverCodes: expected,
          message: "search shortcut returns predecessor only — successor gap before cutover design complete",
        });
      }

      if (current.length > 1 && current.includes(pred) && current.includes(succ)) {
        // Expected during dual-active; post-cutover must be successor-only (documented in ownership map).
        const postCutoverOk = expected.length === 1 && expected[0] === succ;
        if (!postCutoverOk) {
          gaps.push({
            predecessorCode: pred,
            successorCode: succ,
            query: q,
            currentCodes: current,
            expectedPostCutoverCodes: expected,
            message: "postCutoverShortcutCodes must name successor only",
          });
        }
      }
    }
  }

  return gaps;
}

export function scanManualReviewAliasPlans(): AliasOwnershipGap[] {
  const gaps: AliasOwnershipGap[] = [];

  for (const entry of IMAGING_ALIAS_SUCCESSOR_OWNERSHIP_MAP) {
    for (const plan of entry.aliases) {
      if (plan.action === "manual_review") {
        gaps.push({
          predecessorCode: entry.predecessorCode,
          successorCode: entry.successorCode,
          alias: normalizeAlias(plan.alias),
          message: plan.notes ?? "manual_review alias requires governance sign-off before migration",
        });
      }
    }
  }

  return gaps;
}

export function runImagingAliasGovernanceScan(
  input: Pick<{ catalogRows: RetirementCatalogRowSnapshot[] }, "catalogRows"> & {
    searchAliasShortcutMap?: Record<string, string[]>;
  }
): ImagingAliasGovernanceScanResult {
  const validationIssues: AliasGovernanceValidationIssue[] = [
    ...validateImagingAliasSuccessorOwnershipMap(),
    ...validateOwnershipMapAlignsWithSuccessorMap(),
  ];

  const searchAliasShortcutMap =
    input.searchAliasShortcutMap ??
    (KNOWN_IMAGING_SEARCH_ALIAS_SHORTCUTS as Record<string, string[]>);

  return {
    validationIssues,
    sharedAliasCollisions: scanSharedAliasCollisions(input.catalogRows),
    searchShortcutCollisions: scanSearchShortcutCollisions(searchAliasShortcutMap),
    ownershipGaps: scanAliasOwnershipGaps(input.catalogRows),
    searchShortcutGaps: scanSearchShortcutOwnershipGaps(searchAliasShortcutMap),
  };
}

export function countSharedAliasCollisions(scan: ImagingAliasGovernanceScanResult): number {
  return scan.sharedAliasCollisions.length;
}

export function countSearchShortcutDualReturns(scan: ImagingAliasGovernanceScanResult): number {
  return scan.searchShortcutCollisions.filter(
    (c) => c.codes.includes(c.pairPredecessor) && c.codes.includes(c.pairSuccessor)
  ).length;
}
