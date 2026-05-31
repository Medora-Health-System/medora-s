/** Phase 2C.1 — retirement readiness report generator (read-only). */
import type { PrismaClient } from "@prisma/client";
import { IMAGING_CATALOG_SUCCESSOR_MAP } from "./imaging-catalog-successor-map";
import {
  KNOWN_IMAGING_SEARCH_ALIAS_SHORTCUTS,
  KNOWN_ORDER_SET_IMAGING_PREDECESSOR_REFS,
} from "./imaging-catalog-retirement.constants";
import {
  runImagingRetirementScan,
  scanSearchShortcutCollisions,
} from "./imaging-catalog-retirement.scan";
import type {
  ImagingPairRetirementReadiness,
  ImagingRetirementReadinessInput,
  ImagingRetirementReadinessReport,
  PairReadinessDimension,
  RetirementCatalogRowSnapshot,
} from "./imaging-catalog-retirement.types";
import { validateImagingCatalogSuccessorMap } from "./imaging-catalog-retirement.validation";

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function dimension(ready: boolean, blockers: string[]): PairReadinessDimension {
  return { ready, blockers };
}

function catalogIndex(rows: RetirementCatalogRowSnapshot[]): Map<string, RetirementCatalogRowSnapshot> {
  return new Map(rows.map((r) => [normalizeCode(r.code), { ...r, code: normalizeCode(r.code) }]));
}

export function buildImagingRetirementReadinessReport(
  input: ImagingRetirementReadinessInput
): ImagingRetirementReadinessReport {
  const validationErrors = validateImagingCatalogSuccessorMap().filter((i) => i.severity === "error");
  const scan = runImagingRetirementScan({
    catalogRows: input.catalogRows,
    searchAliasShortcutMap: input.searchAliasShortcutMap,
    orderSetPredecessorRefs: input.orderSetPredecessorRefs,
  });

  const byCode = catalogIndex(input.catalogRows);
  const pairs: ImagingPairRetirementReadiness[] = [];

  for (const entry of IMAGING_CATALOG_SUCCESSOR_MAP) {
    const pred = normalizeCode(entry.predecessorCode);
    const succ = normalizeCode(entry.successorCode);
    const predRow = byCode.get(pred);
    const succRow = byCode.get(succ);

    const billingBlockers: string[] = [];
    if (!input.billingMappedExternalCodes.has(succ)) {
      billingBlockers.push(`successor ${succ} has no BillingCatalog IMAGING mapping`);
    }

    const aliasBlockers: string[] = [];
    const shared = scan.sharedAliasCollisions.filter(
      (c) => c.pairPredecessor === pred && c.pairSuccessor === succ
    );
    if (shared.length > 0 && predRow?.isActive && succRow?.isActive) {
      aliasBlockers.push(
        `shared aliases remain: ${shared.map((s) => s.alias).join(", ")}`
      );
    }

    const orderSetBlockers: string[] = [];
    const refs = input.orderSetPredecessorRefs.filter((r) => normalizeCode(r.predecessorCode) === pred);
    for (const ref of refs) {
      if (ref.role === "primary") {
        orderSetBlockers.push(`${ref.source} uses predecessor as primary catalogCode`);
      }
      if (ref.role === "fallback") {
        orderSetBlockers.push(`${ref.source} lists predecessor in catalogCodes fallback`);
      }
    }

    const searchBlockers: string[] = [];
    const shortcuts = scanSearchShortcutCollisions(input.searchAliasShortcutMap).filter(
      (c) => c.pairPredecessor === pred && c.pairSuccessor === succ
    );
    for (const shortcut of shortcuts) {
      const codes = shortcut.codes.map(normalizeCode);
      if (codes.includes(pred) && codes.includes(succ)) {
        searchBlockers.push(`search shortcut "${shortcut.query}" returns both codes`);
      } else if (codes.includes(pred) && !codes.includes(succ)) {
        searchBlockers.push(`search shortcut "${shortcut.query}" returns predecessor only`);
      }
    }

    const orderCount = input.historicalOrderCountsByPredecessor[pred] ?? 0;
    const historicalBlockers: string[] = [];
    if (orderCount > 0) {
      historicalBlockers.push(
        `${orderCount} historical OrderItem row(s) reference predecessor — verify production cutover plan`
      );
    }

    const manualBlockers: string[] = [];
    if (entry.manualReviewRequired) {
      manualBlockers.push(entry.manualReviewReason ?? "manual review required");
    }

    const billing = dimension(billingBlockers.length === 0, billingBlockers);
    const alias = dimension(aliasBlockers.length === 0, aliasBlockers);
    const orderSet = dimension(orderSetBlockers.length === 0, orderSetBlockers);
    const search = dimension(searchBlockers.length === 0, searchBlockers);
    const historicalOrders = {
      ...dimension(historicalBlockers.length === 0, historicalBlockers),
      orderCount,
    };
    const reporting = dimension(true, []);

    const retirementReady =
      validationErrors.length === 0 &&
      billing.ready &&
      alias.ready &&
      orderSet.ready &&
      search.ready &&
      historicalOrders.ready &&
      reporting.ready &&
      manualBlockers.length === 0 &&
      !(predRow?.isActive && succRow?.isActive);

    const blockers = [
      ...manualBlockers,
      ...billing.blockers,
      ...alias.blockers,
      ...orderSet.blockers,
      ...search.blockers,
      ...historicalOrders.blockers,
    ];
    if (predRow?.isActive && succRow?.isActive) {
      blockers.push("both predecessor and successor are still active");
    }
    if (!predRow) blockers.push(`predecessor ${pred} missing from catalog snapshot`);
    if (!succRow) blockers.push(`successor ${succ} missing from catalog snapshot`);

    pairs.push({
      predecessorCode: pred,
      successorCode: succ,
      manualReviewRequired: entry.manualReviewRequired,
      billing,
      alias,
      orderSet,
      search,
      historicalOrders,
      reporting,
      retirementReady,
      verdict: retirementReady ? "SAFE" : "NOT_SAFE",
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
    globalBlockers,
    overallVerdict: safeCount === pairs.length && globalBlockers.length === 0 ? "SAFE" : "NOT_SAFE",
  };
}

export async function loadImagingRetirementReadinessInputFromPrisma(
  prisma: PrismaClient
): Promise<ImagingRetirementReadinessInput> {
  const predecessorCodes = IMAGING_CATALOG_SUCCESSOR_MAP.map((e) => e.predecessorCode);
  const successorCodes = IMAGING_CATALOG_SUCCESSOR_MAP.map((e) => e.successorCode);
  const allCodes = [...new Set([...predecessorCodes, ...successorCodes])];

  const imagingRows = await prisma.catalogImagingStudy.findMany({
    where: { code: { in: allCodes } },
    select: {
      id: true,
      code: true,
      isActive: true,
      aliases: { select: { alias: true } },
    },
  });

  const billingRows = await prisma.billingCatalog.findMany({
    where: { triggerSource: "IMAGING", externalCode: { in: allCodes } },
    select: { externalCode: true },
  });

  const idByCode = Object.fromEntries(imagingRows.map((r) => [normalizeCode(r.code), r.id]));
  const historicalOrderCountsByPredecessor: Record<string, number> = {};
  for (const pred of predecessorCodes) {
    const id = idByCode[normalizeCode(pred)];
    historicalOrderCountsByPredecessor[normalizeCode(pred)] = id
      ? await prisma.orderItem.count({
          where: { catalogItemId: id, catalogItemType: "IMAGING_STUDY" },
        })
      : 0;
  }

  const catalogRows: RetirementCatalogRowSnapshot[] = imagingRows.map((r) => ({
    code: r.code,
    isActive: r.isActive,
    aliases: r.aliases.map((a) => a.alias),
  }));

  return {
    catalogRows,
    billingMappedExternalCodes: new Set(
      billingRows
        .map((b) => b.externalCode?.trim().toUpperCase())
        .filter((c): c is string => Boolean(c))
    ),
    orderSetPredecessorRefs: [...KNOWN_ORDER_SET_IMAGING_PREDECESSOR_REFS],
    searchAliasShortcutMap: { ...KNOWN_IMAGING_SEARCH_ALIAS_SHORTCUTS } as Record<string, string[]>,
    historicalOrderCountsByPredecessor,
  };
}

export async function generateImagingRetirementReadinessReportFromPrisma(
  prisma: PrismaClient
): Promise<ImagingRetirementReadinessReport> {
  const input = await loadImagingRetirementReadinessInputFromPrisma(prisma);
  return buildImagingRetirementReadinessReport(input);
}
