import * as fs from "node:fs";
import * as path from "node:path";
import { IMAGING_CODE_TO_CPT } from "../../prisma/data/billing-catalog-common";
import { mapImagingToBillingCode } from "../billing/billing-map-from-event.util";
import { buildImagingRetirementReadinessReport } from "./imaging-catalog-retirement.readiness";
import type { ImagingRetirementReadinessInput } from "./imaging-catalog-retirement.types";

const TIER_A_SUCCESSOR_PAIRS = [
  { predecessor: "US_ABD", successor: "US_ABDOMEN", cpt: "76700" },
  { predecessor: "DOPPLER_VEIN", successor: "US_VENOUS_DOPPLER_LE", cpt: "93971" },
  { predecessor: "CT_HEAD", successor: "CT_HEAD_WO_CONTRAST", cpt: "70450" },
] as const;

const MANUAL_REVIEW_BLOCKED = ["CT_ABDOMEN_PELVIS", "CTA_CHEST"] as const;

function mockPrismaWithImagingRows(
  rows: Array<{ externalCode: string; code: string; description: string }>
) {
  return {
    billingCatalog: {
      findFirst: jest.fn(async ({ where }: { where: { externalCode: string } }) => {
        const match = rows.find((r) => r.externalCode === where.externalCode);
        if (!match) return null;
        return {
          code: match.code,
          system: "CPT",
          billClass: "facility",
          description: match.description,
        };
      }),
    },
  };
}

describe("Phase 2C.2 imaging successor billing (Tier A)", () => {
  it("IMAGING_CODE_TO_CPT includes Tier A successors mirroring predecessor CPT", () => {
    for (const { predecessor, successor, cpt } of TIER_A_SUCCESSOR_PAIRS) {
      expect(IMAGING_CODE_TO_CPT[predecessor]?.cpt).toBe(cpt);
      expect(IMAGING_CODE_TO_CPT[successor]?.cpt).toBe(cpt);
      expect(IMAGING_CODE_TO_CPT[successor]?.description).toBe(
        IMAGING_CODE_TO_CPT[predecessor]?.description
      );
      expect(IMAGING_CODE_TO_CPT[successor]?.billClass).toBe(
        IMAGING_CODE_TO_CPT[predecessor]?.billClass
      );
    }
  });

  it("IMAGING_CODE_TO_CPT excludes manual-review-blocked successors", () => {
    for (const code of MANUAL_REVIEW_BLOCKED) {
      expect(IMAGING_CODE_TO_CPT[code]).toBeUndefined();
    }
  });

  it("mapImagingToBillingCode resolves predecessor and successor pairs", async () => {
    const seedRows = [
      ...TIER_A_SUCCESSOR_PAIRS.flatMap(({ predecessor, successor, cpt }) => [
        {
          externalCode: predecessor,
          code: cpt,
          description: `${predecessor} (example)`,
        },
        {
          externalCode: successor,
          code: cpt,
          description: `${successor} (example)`,
        },
      ]),
    ];
    const prisma = mockPrismaWithImagingRows(seedRows);

    for (const { predecessor, successor, cpt } of TIER_A_SUCCESSOR_PAIRS) {
      const pred = await mapImagingToBillingCode(prisma as never, predecessor);
      const succ = await mapImagingToBillingCode(prisma as never, successor);
      expect(pred?.code).toBe(cpt);
      expect(succ?.code).toBe(cpt);
    }
  });

  it("mapImagingToBillingCode returns null for manual-review-blocked successors", async () => {
    const prisma = mockPrismaWithImagingRows([]);
    for (const code of MANUAL_REVIEW_BLOCKED) {
      const result = await mapImagingToBillingCode(prisma as never, code);
      expect(result).toBeNull();
    }
  });

  it("mapImagingToBillingCode source uses externalCode only (no classifier billing)", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../billing/billing-map-from-event.util.ts"),
      "utf8"
    );
    expect(src).toContain('findMapping(prisma, "IMAGING", studyCode)');
    expect(src).not.toContain("Classifier");
    expect(src).not.toContain("bodyRegionClassifier");
    expect(src).not.toContain("contrastTypeClassifier");
  });

  it("readiness report marks Tier A billing ready when successors are mapped", () => {
    const input: ImagingRetirementReadinessInput = {
      catalogRows: TIER_A_SUCCESSOR_PAIRS.flatMap(({ predecessor, successor }) => [
        { code: predecessor, isActive: true, aliases: [] },
        { code: successor, isActive: true, aliases: [] },
      ]),
      billingMappedExternalCodes: new Set(
        TIER_A_SUCCESSOR_PAIRS.flatMap(({ successor }) => [successor])
      ),
      orderSetPredecessorRefs: [],
      searchAliasShortcutMap: {},
      historicalOrderCountsByPredecessor: Object.fromEntries(
        TIER_A_SUCCESSOR_PAIRS.map(({ predecessor }) => [predecessor, 0])
      ),
    };

    const report = buildImagingRetirementReadinessReport(input);
    for (const { predecessor } of TIER_A_SUCCESSOR_PAIRS) {
      const pair = report.pairs.find((p) => p.predecessorCode === predecessor);
      expect(pair?.billing.ready).toBe(true);
    }
  });

  it("readiness report keeps manual-review-blocked successors billing not ready", () => {
    const input: ImagingRetirementReadinessInput = {
      catalogRows: [
        { code: "CT_ABD", isActive: true, aliases: [] },
        { code: "CT_ABDOMEN_PELVIS", isActive: true, aliases: [] },
        { code: "CT_CHEST_CTA", isActive: true, aliases: [] },
        { code: "CTA_CHEST", isActive: true, aliases: [] },
      ],
      billingMappedExternalCodes: new Set(["CT_ABD"]),
      orderSetPredecessorRefs: [],
      searchAliasShortcutMap: {},
      historicalOrderCountsByPredecessor: { CT_ABD: 0, CT_CHEST_CTA: 0 },
    };

    const report = buildImagingRetirementReadinessReport(input);
    expect(report.pairs.find((p) => p.successorCode === "CT_ABDOMEN_PELVIS")?.billing.ready).toBe(
      false
    );
    expect(report.pairs.find((p) => p.successorCode === "CTA_CHEST")?.billing.ready).toBe(false);
  });
});
