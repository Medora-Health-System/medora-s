/** Phase 2C.1 — duplicate and collision scanners (read-only). */
import { IMAGING_CATALOG_SUCCESSOR_MAP } from "./imaging-catalog-successor-map";
import {
  KNOWN_IMAGING_SEARCH_ALIAS_SHORTCUTS,
  KNOWN_ORDER_SET_IMAGING_PREDECESSOR_REFS,
} from "./imaging-catalog-retirement.constants";
import type {
  ActiveDuplicateGroup,
  ImagingRetirementReadinessInput,
  ImagingRetirementScanResult,
  OrderSetPredecessorReference,
  RetirementCatalogRowSnapshot,
  RetirementValidationIssue,
  SearchShortcutCollision,
  SharedAliasCollision,
} from "./imaging-catalog-retirement.types";
import { validateImagingCatalogSuccessorMap } from "./imaging-catalog-retirement.validation";

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function normalizeAlias(alias: string): string {
  return alias.trim().toLowerCase();
}

function catalogByCode(rows: RetirementCatalogRowSnapshot[]): Map<string, RetirementCatalogRowSnapshot> {
  const map = new Map<string, RetirementCatalogRowSnapshot>();
  for (const row of rows) {
    map.set(normalizeCode(row.code), {
      ...row,
      code: normalizeCode(row.code),
      aliases: row.aliases.map(normalizeAlias),
    });
  }
  return map;
}

export function scanActiveDuplicateGroups(
  catalogRows: RetirementCatalogRowSnapshot[]
): ActiveDuplicateGroup[] {
  const byCode = catalogByCode(catalogRows);
  const groups: ActiveDuplicateGroup[] = [];

  for (const entry of IMAGING_CATALOG_SUCCESSOR_MAP) {
    const pred = byCode.get(normalizeCode(entry.predecessorCode));
    const succ = byCode.get(normalizeCode(entry.successorCode));
    groups.push({
      predecessorCode: entry.predecessorCode,
      successorCode: entry.successorCode,
      predecessorActive: pred?.isActive ?? false,
      successorActive: succ?.isActive ?? false,
    });
  }

  return groups;
}

export function scanSharedAliasCollisions(
  catalogRows: RetirementCatalogRowSnapshot[]
): SharedAliasCollision[] {
  const byCode = catalogByCode(catalogRows);
  const collisions: SharedAliasCollision[] = [];

  for (const entry of IMAGING_CATALOG_SUCCESSOR_MAP) {
    const pred = byCode.get(normalizeCode(entry.predecessorCode));
    const succ = byCode.get(normalizeCode(entry.successorCode));
    if (!pred || !succ) continue;

    const succAliases = new Set(succ.aliases);
    for (const alias of pred.aliases) {
      if (succAliases.has(alias)) {
        collisions.push({
          alias,
          codes: [pred.code, succ.code],
          pairPredecessor: pred.code,
          pairSuccessor: succ.code,
        });
      }
    }
  }

  return collisions;
}

export function scanSearchShortcutCollisions(
  searchAliasShortcutMap: Record<string, string[]> = KNOWN_IMAGING_SEARCH_ALIAS_SHORTCUTS as Record<
    string,
    string[]
  >
): SearchShortcutCollision[] {
  const collisions: SearchShortcutCollision[] = [];

  for (const entry of IMAGING_CATALOG_SUCCESSOR_MAP) {
    const pred = normalizeCode(entry.predecessorCode);
    const succ = normalizeCode(entry.successorCode);

    for (const [query, codes] of Object.entries(searchAliasShortcutMap)) {
      const normalized = codes.map(normalizeCode);
      const hasPred = normalized.includes(pred);
      if (hasPred) {
        collisions.push({
          query: query.trim().toLowerCase(),
          codes: normalized,
          pairPredecessor: pred,
          pairSuccessor: succ,
        });
      }
    }
  }

  return collisions;
}

export function scanOrderSetPredecessorReferences(
  refs: readonly OrderSetPredecessorReference[] = KNOWN_ORDER_SET_IMAGING_PREDECESSOR_REFS
): OrderSetPredecessorReference[] {
  const knownPredecessors = new Set(
    IMAGING_CATALOG_SUCCESSOR_MAP.map((e) => normalizeCode(e.predecessorCode))
  );
  return refs.filter((ref) => knownPredecessors.has(normalizeCode(ref.predecessorCode)));
}

export function runImagingRetirementScan(
  input: Pick<ImagingRetirementReadinessInput, "catalogRows"> & {
    searchAliasShortcutMap?: Record<string, string[]>;
    orderSetPredecessorRefs?: readonly OrderSetPredecessorReference[];
  }
): ImagingRetirementScanResult {
  const validationIssues = validateImagingCatalogSuccessorMap();
  const activeDuplicateGroups = scanActiveDuplicateGroups(input.catalogRows);
  const sharedAliasCollisions = scanSharedAliasCollisions(input.catalogRows);
  const searchShortcutCollisions = scanSearchShortcutCollisions(input.searchAliasShortcutMap);
  const orderSetPredecessorRefs = scanOrderSetPredecessorReferences(input.orderSetPredecessorRefs);

  return {
    validationIssues,
    activeDuplicateGroups,
    sharedAliasCollisions,
    searchShortcutCollisions,
    orderSetPredecessorRefs,
  };
}

export function countActiveDuplicatePairs(scan: ImagingRetirementScanResult): number {
  return scan.activeDuplicateGroups.filter((g) => g.predecessorActive && g.successorActive).length;
}
