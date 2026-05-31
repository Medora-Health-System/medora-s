import {
  getAliasOwnershipEntryForPredecessor,
  getAliasOwnershipEntryForSuccessor,
  IMAGING_ALIAS_OWNERSHIP_PREDECESSOR_CODES,
  IMAGING_ALIAS_SUCCESSOR_OWNERSHIP_MAP,
  isAliasOwnershipPredecessorCode,
} from "./imaging-alias-successor-ownership-map";
import {
  buildImagingAliasGovernanceReport,
  loadImagingAliasGovernanceInputFromPrisma,
} from "./imaging-alias-governance.readiness";
import {
  countSearchShortcutDualReturns,
  countSharedAliasCollisions,
  runImagingAliasGovernanceScan,
  scanAliasOwnershipGaps,
  scanManualReviewAliasPlans,
  scanSearchShortcutOwnershipGaps,
} from "./imaging-alias-governance.scan";
import type { ImagingAliasGovernanceInput } from "./imaging-alias-governance.types";
import {
  assertValidImagingAliasSuccessorOwnershipMap,
  listKnownAliasOwnershipCodes,
  validateImagingAliasSuccessorOwnershipMap,
  validateOwnershipMapAlignsWithSuccessorMap,
} from "./imaging-alias-governance.validation";
import { KNOWN_IMAGING_SEARCH_ALIAS_SHORTCUTS } from "./imaging-catalog-retirement.constants";
import {
  scanSearchShortcutCollisions,
  scanSharedAliasCollisions,
} from "./imaging-catalog-retirement.scan";

function localDbLikeSnapshot(): ImagingAliasGovernanceInput {
  return {
    catalogRows: [
      { code: "US_ABD", isActive: true, aliases: ["echo abdomen"] },
      {
        code: "US_ABDOMEN",
        isActive: true,
        aliases: ["ultrasound abdomen", "us abdomen", "echo abdomen"],
      },
      { code: "DOPPLER_VEIN", isActive: true, aliases: ["doppler"] },
      {
        code: "US_VENOUS_DOPPLER_LE",
        isActive: true,
        aliases: ["doppler leg", "venous doppler leg", "dvt ultrasound"],
      },
      { code: "CT_HEAD", isActive: true, aliases: ["ct head"] },
      {
        code: "CT_HEAD_WO_CONTRAST",
        isActive: true,
        aliases: ["head ct non contrast", "ct brain without contrast", "stroke bleed"],
      },
      { code: "CT_ABD", isActive: true, aliases: ["ct abdomen"] },
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
    searchAliasShortcutMap: { ...KNOWN_IMAGING_SEARCH_ALIAS_SHORTCUTS } as Record<string, string[]>,
  };
}

describe("IMAGING_ALIAS_SUCCESSOR_OWNERSHIP_MAP", () => {
  it("defines exactly five Phase 2C alias ownership pairs", () => {
    expect(IMAGING_ALIAS_SUCCESSOR_OWNERSHIP_MAP).toHaveLength(5);
    expect(IMAGING_ALIAS_OWNERSHIP_PREDECESSOR_CODES).toEqual([
      "US_ABD",
      "DOPPLER_VEIN",
      "CT_HEAD",
      "CT_ABD",
      "CT_CHEST_CTA",
    ]);
  });

  it("resolves ownership lookups by predecessor and successor", () => {
    expect(getAliasOwnershipEntryForPredecessor("CT_HEAD")?.successorCode).toBe("CT_HEAD_WO_CONTRAST");
    expect(getAliasOwnershipEntryForSuccessor("CTA_CHEST")?.predecessorCode).toBe("CT_CHEST_CTA");
    expect(isAliasOwnershipPredecessorCode("us_abd")).toBe(true);
    expect(isAliasOwnershipPredecessorCode("US_ABDOMEN")).toBe(false);
  });

  it("passes ownership crosswalk validation and aligns with successor map", () => {
    expect(() => assertValidImagingAliasSuccessorOwnershipMap()).not.toThrow();
    expect(validateImagingAliasSuccessorOwnershipMap().filter((i) => i.severity === "error")).toHaveLength(
      0
    );
    expect(validateOwnershipMapAlignsWithSuccessorMap().filter((i) => i.severity === "error")).toHaveLength(
      0
    );
  });

  it("lists known alias ownership codes", () => {
    const { predecessors, successors } = listKnownAliasOwnershipCodes();
    expect(predecessors).toHaveLength(5);
    expect(successors).toContain("US_ABDOMEN");
    expect(successors).toContain("CTA_CHEST");
  });

  it("documents post-cutover shortcut targets as successor-only", () => {
    for (const entry of IMAGING_ALIAS_SUCCESSOR_OWNERSHIP_MAP) {
      expect(entry.postCutoverShortcutCodes).toHaveLength(1);
      expect(entry.postCutoverShortcutCodes[0]).toBe(entry.successorCode);
    }
  });
});

describe("imaging-alias-governance scanners", () => {
  const input = localDbLikeSnapshot();

  it("detects shared alias collisions in local snapshot", () => {
    const collisions = scanSharedAliasCollisions(input.catalogRows);
    expect(collisions.map((c) => c.alias).sort()).toEqual(
      expect.arrayContaining(["ct abdomen", "ct angio chest", "echo abdomen", "pe protocol"])
    );
  });

  it("finds no ownership plan gaps for documented shared aliases", () => {
    const gaps = scanAliasOwnershipGaps(input.catalogRows);
    expect(gaps).toHaveLength(0);
  });

  it("detects search shortcut dual-returns and predecessor-only gaps", () => {
    const dual = scanSearchShortcutCollisions(input.searchAliasShortcutMap).filter(
      (c) => c.codes.includes(c.pairPredecessor) && c.codes.includes(c.pairSuccessor)
    );
    expect(dual.length).toBeGreaterThanOrEqual(4);

    const shortcutGaps = scanSearchShortcutOwnershipGaps(input.searchAliasShortcutMap);
    expect(shortcutGaps.some((g) => g.query === "ct head" && g.message.includes("predecessor only"))).toBe(
      true
    );
  });

  it("lists manual_review alias plans", () => {
    const plans = scanManualReviewAliasPlans();
    expect(plans.some((p) => p.alias === "doppler")).toBe(true);
  });

  it("runImagingAliasGovernanceScan aggregates results", () => {
    const scan = runImagingAliasGovernanceScan(input);
    expect(scan.validationIssues.filter((i) => i.severity === "error")).toHaveLength(0);
    expect(countSharedAliasCollisions(scan)).toBe(4);
    expect(countSearchShortcutDualReturns(scan)).toBeGreaterThanOrEqual(4);
  });
});

describe("imaging-alias-governance readiness report", () => {
  it("reports NOT_SAFE for current local-db-like dual-active state", () => {
    const report = buildImagingAliasGovernanceReport(localDbLikeSnapshot());
    expect(report.pairCount).toBe(5);
    expect(report.overallVerdict).toBe("NOT_SAFE");
    expect(report.notSafeCount).toBe(5);
    expect(report.safeCount).toBe(0);

    const usPair = report.pairs.find((p) => p.predecessorCode === "US_ABD");
    expect(usPair?.ownershipDefined.ready).toBe(true);
    expect(usPair?.historicalOrderSafe.ready).toBe(true);
    expect(usPair?.dualActiveSafe.ready).toBe(false);
    expect(usPair?.migrationReady).toBe(false);

    const ctHead = report.pairs.find((p) => p.predecessorCode === "CT_HEAD");
    expect(ctHead?.manualReviewRequired).toBe(true);
    expect(ctHead?.searchSafe.ready).toBe(false);
  });

  it("can report ownershipDefined ready for all pairs", () => {
    const report = buildImagingAliasGovernanceReport(localDbLikeSnapshot());
    expect(report.pairs.every((p) => p.ownershipDefined.ready)).toBe(true);
  });

  it("loadImagingAliasGovernanceInputFromPrisma queries catalog aliases", async () => {
    const catalogFindMany = jest.fn().mockResolvedValue([
      { code: "US_ABD", isActive: true, aliases: [{ alias: "echo abdomen" }] },
      { code: "US_ABDOMEN", isActive: true, aliases: [{ alias: "echo abdomen" }] },
    ]);
    const prisma = { catalogImagingStudy: { findMany: catalogFindMany } };

    const loaded = await loadImagingAliasGovernanceInputFromPrisma(prisma as never);
    expect(loaded.catalogRows.length).toBe(2);
    expect(loaded.searchAliasShortcutMap["ultrasound abdomen"]).toEqual(["US_ABDOMEN", "US_ABD"]);
    expect(catalogFindMany).toHaveBeenCalled();
  });
});
