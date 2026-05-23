import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { classifyErProcedureRow } from "./er-procedure-subset-rules.util";
import { parseErProcedureCatalogCsv } from "./er-procedure-catalog-parse.util";
import { ErProcedureCatalogImportService } from "./er-procedure-catalog-import.service";

const FIXTURE = resolve(__dirname, "../../prisma/data/er-procedure-subset-fixture.csv");

describe("er-procedure-subset-rules", () => {
  it("includes ER visit and excludes home DME / PT / drug J-codes", () => {
    expect(
      classifyErProcedureRow({
        code: "99283",
        codeSystem: "CPT",
        shortDescription: "Emergency department visit",
      }).classification
    ).toBe("ER_INCLUDED");

    expect(
      classifyErProcedureRow({
        code: "E0601",
        codeSystem: "HCPCS",
        shortDescription: "Continuous positive airway pressure device",
      }).classification
    ).toBe("NON_ER_EXCLUDED");

    expect(
      classifyErProcedureRow({
        code: "97110",
        codeSystem: "CPT",
        shortDescription: "Therapeutic exercises physical therapy",
      }).classification
    ).toBe("NON_ER_EXCLUDED");

    expect(
      classifyErProcedureRow({
        code: "J0690",
        codeSystem: "HCPCS",
        shortDescription: "Injection ceftriaxone",
      }).classification
    ).toBe("NON_ER_EXCLUDED");
  });

  it("routes high-complexity procedures to manual review", () => {
    expect(
      classifyErProcedureRow({
        code: "99152",
        codeSystem: "CPT",
        shortDescription: "Moderate sedation",
      }).classification
    ).toBe("HIGH_COMPLEXITY_MANUAL_REVIEW");

    expect(
      classifyErProcedureRow({
        code: "31500",
        codeSystem: "CPT",
        shortDescription: "Endotracheal intubation",
      }).classification
    ).toBe("HIGH_COMPLEXITY_MANUAL_REVIEW");
  });
});

describe("ErProcedureCatalogImportService fixture", () => {
  const buffer = readFileSync(FIXTURE);

  it("dry-run classifies fixture subset without importing full catalog", async () => {
    const prisma = {
      billingProcedureCode: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
      },
    };
    const service = new ErProcedureCatalogImportService(
      prisma as never,
      { log: jest.fn() } as never,
      { assertFacilityScope: jest.fn() } as never
    );
    const result = await service.dryRun(buffer, "er-procedure-subset-fixture.csv");
    expect(result.totalParsed).toBeGreaterThan(10);
    expect(result.counts.ER_INCLUDED).toBeGreaterThan(5);
    expect(result.counts.NON_ER_EXCLUDED).toBeGreaterThan(2);
    expect(result.counts.HIGH_COMPLEXITY_MANUAL_REVIEW).toBeGreaterThan(1);
  });

  it("commit stores ER included active and complexity pending inactive", async () => {
    const prisma = {
      billingProcedureCode: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
      },
    };
    const service = new ErProcedureCatalogImportService(
      prisma as never,
      { log: jest.fn() } as never,
      { assertFacilityScope: jest.fn() } as never
    );
    const result = await service.commit(
      buffer,
      "er-procedure-subset-fixture.csv",
      {
        facilityId: "00000000-0000-4000-8000-000000000001",
        note: "ER subset rollout",
        confirmOrderingOnly: true,
        confirmBillingOff: true,
        confirmInventoryOff: true,
      },
      "user-1",
      "00000000-0000-4000-8000-000000000001"
    );
    expect(result.committed).toBeGreaterThan(0);
    expect(result.complexityQueued).toBeGreaterThan(0);
    expect(prisma.billingProcedureCode.upsert).toHaveBeenCalled();
    const calls = prisma.billingProcedureCode.upsert.mock.calls as Array<
      [{ create: { isActive: boolean; codeSetVersion: string }; update: { isActive: boolean } }]
    >;
    expect(calls.some((c) => c[0].create.isActive === true || c[0].update?.isActive === true)).toBe(true);
    expect(calls.some((c) => c[0].create.isActive === false)).toBe(true);
  });

  it("parse fixture csv infers code systems", () => {
    const rows = parseErProcedureCatalogCsv(buffer);
    expect(rows.some((r) => r.code === "99283" && r.codeSystem === "CPT")).toBe(true);
    expect(rows.some((r) => r.code === "G0378" && r.codeSystem === "HCPCS")).toBe(true);
  });
});

describe("controlled catalog procedure import medication separation", () => {
  it("ER import service only touches billingProcedureCode", async () => {
    const prisma = {
      billingProcedureCode: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
      },
      medicationProduct: { create: jest.fn() },
      medicationConcept: { create: jest.fn() },
    };
    const service = new ErProcedureCatalogImportService(
      prisma as never,
      { log: jest.fn() } as never,
      { assertFacilityScope: jest.fn() } as never
    );
    await service.commit(
      readFileSync(FIXTURE),
      "fixture.csv",
      {
        facilityId: "00000000-0000-4000-8000-000000000001",
        note: "",
        confirmOrderingOnly: true,
        confirmBillingOff: true,
        confirmInventoryOff: true,
      },
      "u",
      "00000000-0000-4000-8000-000000000001"
    );
    expect(prisma.medicationProduct.create).not.toHaveBeenCalled();
    expect(prisma.medicationConcept.create).not.toHaveBeenCalled();
  });
});
