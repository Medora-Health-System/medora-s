import {
  getPredecessorCodeForSuccessor,
  getSuccessorEntryForPredecessor,
  IMAGING_CATALOG_SUCCESSOR_MAP,
  IMAGING_RETIREMENT_PREDECESSOR_CODES,
  isImagingRetirementPredecessorCode,
} from "./imaging-catalog-successor-map";
import {
  KNOWN_IMAGING_SEARCH_ALIAS_SHORTCUTS,
  KNOWN_ORDER_SET_IMAGING_PREDECESSOR_REFS,
} from "./imaging-catalog-retirement.constants";
import {
  buildImagingRetirementReadinessReport,
  loadImagingRetirementReadinessInputFromPrisma,
} from "./imaging-catalog-retirement.readiness";
import {
  countActiveDuplicatePairs,
  runImagingRetirementScan,
  scanActiveDuplicateGroups,
  scanOrderSetPredecessorReferences,
  scanSearchShortcutCollisions,
  scanSharedAliasCollisions,
} from "./imaging-catalog-retirement.scan";
import type { ImagingRetirementReadinessInput } from "./imaging-catalog-retirement.types";
import {
  assertValidImagingCatalogSuccessorMap,
  listKnownRetirementCodes,
  validateImagingCatalogSuccessorMap,
} from "./imaging-catalog-retirement.validation";

function localDbLikeSnapshot(): ImagingRetirementReadinessInput {
  return {
    catalogRows: [
      {
        code: "US_ABD",
        isActive: true,
        aliases: ["echo abdomen"],
      },
      {
        code: "US_ABDOMEN",
        isActive: true,
        aliases: ["ultrasound abdomen", "us abdomen", "echo abdomen"],
      },
      {
        code: "DOPPLER_VEIN",
        isActive: true,
        aliases: ["doppler"],
      },
      {
        code: "US_VENOUS_DOPPLER_LE",
        isActive: true,
        aliases: ["doppler leg", "venous doppler leg", "dvt ultrasound"],
      },
      {
        code: "CT_HEAD",
        isActive: true,
        aliases: ["ct head"],
      },
      {
        code: "CT_HEAD_WO_CONTRAST",
        isActive: true,
        aliases: ["head ct non contrast", "ct brain without contrast", "stroke bleed"],
      },
      {
        code: "CT_ABD",
        isActive: true,
        aliases: ["ct abdomen"],
      },
      {
        code: "CT_ABDOMEN_PELVIS",
        isActive: true,
        aliases: ["ct abdomen", "ct abdomen pelvis", "ct abd pelvis"],
      },
      {
        code: "CT_CHEST_CTA",
        isActive: true,
        aliases: ["cta thorax", "ct angio chest", "pe protocol"],
      },
      {
        code: "CTA_CHEST",
        isActive: true,
        aliases: ["cta chest", "ct angio chest", "pe protocol"],
      },
    ],
    billingMappedExternalCodes: new Set(["US_ABD", "DOPPLER_VEIN", "CT_HEAD", "CT_ABD"]),
    orderSetPredecessorRefs: [...KNOWN_ORDER_SET_IMAGING_PREDECESSOR_REFS],
    searchAliasShortcutMap: { ...KNOWN_IMAGING_SEARCH_ALIAS_SHORTCUTS } as Record<string, string[]>,
    historicalOrderCountsByPredecessor: {
      US_ABD: 0,
      DOPPLER_VEIN: 0,
      CT_HEAD: 0,
      CT_ABD: 0,
      CT_CHEST_CTA: 0,
    },
  };
}

describe("IMAGING_CATALOG_SUCCESSOR_MAP", () => {
  it("defines exactly five Phase 2C duplicate pairs", () => {
    expect(IMAGING_CATALOG_SUCCESSOR_MAP).toHaveLength(5);
    expect(IMAGING_RETIREMENT_PREDECESSOR_CODES).toEqual([
      "US_ABD",
      "DOPPLER_VEIN",
      "CT_HEAD",
      "CT_ABD",
      "CT_CHEST_CTA",
    ]);
  });

  it("resolves successor and predecessor lookups", () => {
    expect(getSuccessorEntryForPredecessor("CT_HEAD")?.successorCode).toBe("CT_HEAD_WO_CONTRAST");
    expect(getPredecessorCodeForSuccessor("CTA_CHEST")).toBe("CT_CHEST_CTA");
    expect(isImagingRetirementPredecessorCode("us_abd")).toBe(true);
    expect(isImagingRetirementPredecessorCode("US_ABDOMEN")).toBe(false);
  });

  it("passes crosswalk validation", () => {
    expect(() => assertValidImagingCatalogSuccessorMap()).not.toThrow();
    expect(validateImagingCatalogSuccessorMap().filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("lists known retirement codes", () => {
    const { predecessors, successors } = listKnownRetirementCodes();
    expect(predecessors).toHaveLength(5);
    expect(successors).toContain("US_ABDOMEN");
    expect(successors).toContain("CTA_CHEST");
  });
});

describe("imaging-catalog-retirement scanners", () => {
  const input = localDbLikeSnapshot();

  it("detects five active duplicate groups in local snapshot", () => {
    const groups = scanActiveDuplicateGroups(input.catalogRows);
    expect(groups).toHaveLength(5);
    expect(groups.every((g) => g.predecessorActive && g.successorActive)).toBe(true);
  });

  it("detects shared alias collisions for duplicate pairs", () => {
    const collisions = scanSharedAliasCollisions(input.catalogRows);
    const aliases = collisions.map((c) => c.alias).sort();
    expect(aliases).toEqual(
      expect.arrayContaining(["ct abdomen", "ct angio chest", "echo abdomen", "pe protocol"])
    );
  });

  it("detects search shortcut collisions including ct head predecessor-only", () => {
    const collisions = scanSearchShortcutCollisions();
    expect(collisions.some((c) => c.query === "ct head" && c.pairPredecessor === "CT_HEAD")).toBe(true);
    expect(collisions.some((c) => c.query === "cta chest")).toBe(true);
  });

  it("finds documented order-set predecessor references", () => {
    const refs = scanOrderSetPredecessorReferences();
    expect(refs).toHaveLength(2);
    expect(refs.map((r) => r.predecessorCode).sort()).toEqual(["CT_ABD", "CT_HEAD"]);
  });

  it("runImagingRetirementScan aggregates scan results", () => {
    const scan = runImagingRetirementScan({ catalogRows: input.catalogRows });
    expect(scan.validationIssues.filter((i) => i.severity === "error")).toHaveLength(0);
    expect(countActiveDuplicatePairs(scan)).toBe(5);
    expect(scan.orderSetPredecessorRefs.length).toBe(2);
  });
});

describe("imaging-catalog-retirement readiness report", () => {
  it("reports NOT_SAFE for current local-db-like state", () => {
    const report = buildImagingRetirementReadinessReport(localDbLikeSnapshot());
    expect(report.pairCount).toBe(5);
    expect(report.overallVerdict).toBe("NOT_SAFE");
    expect(report.notSafeCount).toBe(5);
    expect(report.safeCount).toBe(0);

    const ctHead = report.pairs.find((p) => p.predecessorCode === "CT_HEAD");
    expect(ctHead?.manualReviewRequired).toBe(true);
    expect(ctHead?.billing.ready).toBe(false);
    expect(ctHead?.orderSet.ready).toBe(false);
    expect(ctHead?.search.ready).toBe(false);
    expect(ctHead?.retirementReady).toBe(false);
  });

  it("can report SAFE when all gates pass and predecessor is inactive", () => {
    const input = localDbLikeSnapshot();
    input.billingMappedExternalCodes = new Set([
      "US_ABDOMEN",
      "US_VENOUS_DOPPLER_LE",
      "CT_HEAD_WO_CONTRAST",
      "CT_ABDOMEN_PELVIS",
      "CTA_CHEST",
    ]);
    input.orderSetPredecessorRefs = [];
    input.searchAliasShortcutMap = {
      "ultrasound abdomen": ["US_ABDOMEN"],
    };
    input.catalogRows = input.catalogRows.map((row) =>
      row.code === "US_ABD" ? { ...row, isActive: false, aliases: [] } : row
    );

    const report = buildImagingRetirementReadinessReport(input);
    const usPair = report.pairs.find((p) => p.predecessorCode === "US_ABD");
    expect(usPair?.billing.ready).toBe(true);
    expect(usPair?.orderSet.ready).toBe(true);
    expect(usPair?.alias.ready).toBe(true);
    expect(usPair?.search.ready).toBe(true);
    expect(usPair?.retirementReady).toBe(true);
    expect(usPair?.verdict).toBe("SAFE");
  });

  it("loadImagingRetirementReadinessInputFromPrisma queries catalog, billing, and orders", async () => {
    const catalogFindMany = jest.fn().mockResolvedValue([
      { id: "id-us-abd", code: "US_ABD", isActive: true, aliases: [{ alias: "echo abdomen" }] },
      { id: "id-us-abdomen", code: "US_ABDOMEN", isActive: true, aliases: [{ alias: "echo abdomen" }] },
    ]);
    const billingFindMany = jest.fn().mockResolvedValue([{ externalCode: "US_ABD" }]);
    const orderItemCount = jest.fn().mockResolvedValue(0);
    const prisma = {
      catalogImagingStudy: { findMany: catalogFindMany },
      billingCatalog: { findMany: billingFindMany },
      orderItem: { count: orderItemCount },
    };

    const input = await loadImagingRetirementReadinessInputFromPrisma(prisma as never);
    expect(input.catalogRows.length).toBeGreaterThan(0);
    expect(input.billingMappedExternalCodes.has("US_ABD")).toBe(true);
    expect(input.orderSetPredecessorRefs.length).toBe(2);
    expect(orderItemCount).toHaveBeenCalled();
  });
});
