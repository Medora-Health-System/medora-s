/** Phase 2C.3.1 — alias governance readiness report generator (read-only). */
import type { PrismaClient } from "@prisma/client";
import { IMAGING_CATALOG_SUCCESSOR_MAP } from "./imaging-catalog-successor-map";
import { KNOWN_IMAGING_SEARCH_ALIAS_SHORTCUTS } from "./imaging-catalog-retirement.constants";
import type { RetirementCatalogRowSnapshot } from "./imaging-catalog-retirement.types";
import {
  getAliasOwnershipEntryForPredecessor,
  IMAGING_ALIAS_SUCCESSOR_OWNERSHIP_MAP,
} from "./imaging-alias-successor-ownership-map";
import {
  runImagingAliasGovernanceScan,
  scanManualReviewAliasPlans,
} from "./imaging-alias-governance.scan";
import type {
  AliasPairGovernanceReadiness,
  ImagingAliasGovernanceInput,
  ImagingAliasGovernanceReport,
} from "./imaging-alias-governance.types";
import { validateImagingAliasSuccessorOwnershipMap } from "./imaging-alias-governance.validation";

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function dimension(ready: boolean, blockers: string[]): { ready: boolean; blockers: string[] } {
  return { ready, blockers };
}

function catalogIndex(rows: RetirementCatalogRowSnapshot[]): Map<string, RetirementCatalogRowSnapshot> {
  return new Map(rows.map((r) => [normalizeCode(r.code), { ...r, code: normalizeCode(r.code) }]));
}

export function buildImagingAliasGovernanceReport(
  input: ImagingAliasGovernanceInput
): ImagingAliasGovernanceReport {
  const scan = runImagingAliasGovernanceScan({
    catalogRows: input.catalogRows,
    searchAliasShortcutMap: input.searchAliasShortcutMap,
  });
  const validationErrors = scan.validationIssues.filter((i) => i.severity === "error");
  const byCode = catalogIndex(input.catalogRows);
  const manualReviewPlans = scanManualReviewAliasPlans();
  const pairs: AliasPairGovernanceReadiness[] = [];

  for (const entry of IMAGING_ALIAS_SUCCESSOR_OWNERSHIP_MAP) {
    const pred = normalizeCode(entry.predecessorCode);
    const succ = normalizeCode(entry.successorCode);
    const predRow = byCode.get(pred);
    const succRow = byCode.get(succ);
    const retirement = IMAGING_CATALOG_SUCCESSOR_MAP.find(
      (e) => normalizeCode(e.predecessorCode) === pred
    );

    const ownershipBlockers: string[] = [];
    const ownershipEntry = getAliasOwnershipEntryForPredecessor(pred);
    if (!ownershipEntry) {
      ownershipBlockers.push(`no IMAGING_ALIAS_SUCCESSOR_OWNERSHIP_MAP entry for ${pred}`);
    } else if (ownershipEntry.aliases.length === 0) {
      ownershipBlockers.push("ownership plan has no aliases");
    }

    const pairOwnershipGaps = scan.ownershipGaps.filter(
      (g) => normalizeCode(g.predecessorCode) === pred && normalizeCode(g.successorCode) === succ
    );
    for (const gap of pairOwnershipGaps) {
      ownershipBlockers.push(`${gap.alias}: ${gap.message}`);
    }

    const localizationBlockers: string[] = [];
    if (entry.manualReviewRequired) {
      localizationBlockers.push(
        "mixed EN/FR alias sets require language tagging policy before migration execution"
      );
    }

    const searchBlockers: string[] = [];
    const pairShortcutGaps = scan.searchShortcutGaps.filter(
      (g) => normalizeCode(g.predecessorCode) === pred
    );
    for (const gap of pairShortcutGaps) {
      searchBlockers.push(`"${gap.query}": ${gap.message}`);
    }
    const dualShortcuts = scan.searchShortcutCollisions.filter(
      (c) =>
        normalizeCode(c.pairPredecessor) === pred &&
        c.codes.includes(pred) &&
        c.codes.includes(succ)
    );
    if (dualShortcuts.length > 0 && predRow?.isActive && succRow?.isActive) {
      searchBlockers.push(
        `dual-active shortcuts: ${dualShortcuts.map((s) => s.query).join(", ")}`
      );
    }
    const predOnlyShortcuts = scan.searchShortcutCollisions.filter(
      (c) =>
        normalizeCode(c.pairPredecessor) === pred &&
        c.codes.includes(pred) &&
        !c.codes.includes(succ)
    );
    for (const shortcut of predOnlyShortcuts) {
      searchBlockers.push(`shortcut "${shortcut.query}" returns predecessor only`);
    }

    const historicalBlockers: string[] = [];
    // Alias migration is safe for historical orders when predecessor rows remain (deactivate-not-delete).
    if (!predRow) {
      historicalBlockers.push(`predecessor ${pred} missing from catalog snapshot`);
    }

    const dualActiveBlockers: string[] = [];
    const shared = scan.sharedAliasCollisions.filter(
      (c) => normalizeCode(c.pairPredecessor) === pred && normalizeCode(c.pairSuccessor) === succ
    );
    if (shared.length > 0 && predRow?.isActive && succRow?.isActive) {
      dualActiveBlockers.push(
        `shared aliases during dual-active: ${shared.map((s) => s.alias).join(", ")}`
      );
    }

    const pairManualReview = manualReviewPlans.filter(
      (p) => normalizeCode(p.predecessorCode) === pred
    );
    if (entry.manualReviewRequired) {
      dualActiveBlockers.push(
        entry.manualReviewReason ?? "manual review required before alias migration execution"
      );
    }
    for (const plan of pairManualReview) {
      dualActiveBlockers.push(`manual_review alias: ${plan.alias}`);
    }

    const ownershipDefined = dimension(ownershipBlockers.length === 0, ownershipBlockers);
    const localizationSafe = dimension(localizationBlockers.length === 0, localizationBlockers);
    const searchSafe = dimension(searchBlockers.length === 0, searchBlockers);
    const historicalOrderSafe = dimension(historicalBlockers.length === 0, historicalBlockers);
    const dualActiveSafe = dimension(dualActiveBlockers.length === 0, dualActiveBlockers);

    const migrationReady =
      validationErrors.length === 0 &&
      ownershipDefined.ready &&
      searchSafe.ready &&
      dualActiveSafe.ready &&
      !(predRow?.isActive && succRow?.isActive && shared.length > 0) &&
      !entry.manualReviewRequired &&
      !(retirement?.manualReviewRequired ?? false);

    const blockers = [
      ...ownershipDefined.blockers,
      ...localizationSafe.blockers,
      ...searchSafe.blockers,
      ...historicalOrderSafe.blockers,
      ...dualActiveSafe.blockers,
    ];
    if (entry.manualReviewRequired) {
      blockers.push(entry.manualReviewReason ?? "manual review required");
    }

    pairs.push({
      predecessorCode: pred,
      successorCode: succ,
      manualReviewRequired: entry.manualReviewRequired || (retirement?.manualReviewRequired ?? false),
      ownershipDefined,
      localizationSafe,
      searchSafe,
      historicalOrderSafe,
      dualActiveSafe,
      migrationReady,
      verdict: migrationReady ? "SAFE" : "NOT_SAFE",
    });
  }

  const safeCount = pairs.filter((p) => p.verdict === "SAFE").length;
  const globalBlockers = validationErrors.map((e) => `${e.code}: ${e.message}`);

  return {
    generatedAt: new Date().toISOString(),
    pairCount: pairs.length,
    safeCount,
    notSafeCount: pairs.length - safeCount,
    pairs,
    scan,
    globalBlockers,
    overallVerdict: safeCount === pairs.length && globalBlockers.length === 0 ? "SAFE" : "NOT_SAFE",
  };
}

export async function loadImagingAliasGovernanceInputFromPrisma(
  prisma: PrismaClient
): Promise<ImagingAliasGovernanceInput> {
  const allCodes = [
    ...new Set(
      IMAGING_ALIAS_SUCCESSOR_OWNERSHIP_MAP.flatMap((e) => [e.predecessorCode, e.successorCode])
    ),
  ];

  const imagingRows = await prisma.catalogImagingStudy.findMany({
    where: { code: { in: allCodes } },
    select: {
      code: true,
      isActive: true,
      aliases: { select: { alias: true } },
    },
  });

  const catalogRows: RetirementCatalogRowSnapshot[] = imagingRows.map((r) => ({
    code: r.code,
    isActive: r.isActive,
    aliases: r.aliases.map((a) => a.alias),
  }));

  return {
    catalogRows,
    searchAliasShortcutMap: { ...KNOWN_IMAGING_SEARCH_ALIAS_SHORTCUTS } as Record<string, string[]>,
  };
}

export async function generateImagingAliasGovernanceReportFromPrisma(
  prisma: PrismaClient
): Promise<ImagingAliasGovernanceReport> {
  const input = await loadImagingAliasGovernanceInputFromPrisma(prisma);
  return buildImagingAliasGovernanceReport(input);
}
