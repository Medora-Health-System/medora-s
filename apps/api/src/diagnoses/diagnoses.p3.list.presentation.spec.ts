import { BadRequestException } from "@nestjs/common";
import { DiagnosesService } from "./diagnoses.service";
import { Icd10TerminologyService } from "./icd10-terminology.service";

function catalogRow(id: string, code: string, english: string) {
  return {
    id,
    code,
    codeSystem: "ICD-10-CM",
    releaseVersion: "FY2026",
    shortDescription: english,
    longDescription: english,
    isBillable: true,
  };
}

function diagnosisRow(input: {
  id: string;
  code: string;
  description: string;
  catalog: ReturnType<typeof catalogRow> | null;
}) {
  return {
    id: input.id,
    encounterId: "enc-1",
    patientId: "pat-1",
    facilityId: "fac-1",
    code: input.code,
    description: input.description,
    icd10Catalog: input.catalog,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    sortOrder: 0,
    status: "ACTIVE",
  };
}

function mockPrisma(items: unknown[]) {
  return {
    patient: { findFirst: jest.fn().mockResolvedValue({ id: "pat-1", facilityId: "fac-1" }) },
    diagnosis: {
      findMany: jest.fn().mockResolvedValue(items),
      count: jest.fn().mockResolvedValue(items.length),
    },
    auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn() },
    userRole: { findMany: jest.fn() },
  };
}

describe("DiagnosesService P3 list presentation", () => {
  const englishR1085 = "Abdominal pain, unspecified site";
  const englishA42 = "Abdominal actinomycosis";
  const r1085 = diagnosisRow({
    id: "dx-r1085",
    code: "R10.85",
    description: englishR1085,
    catalog: catalogRow("cat-r1085", "R10.85", englishR1085),
  });
  const a42 = diagnosisRow({
    id: "dx-a42",
    code: "A42.1",
    description: englishA42,
    catalog: catalogRow("cat-a42", "A42.1", englishA42),
  });

  it("keeps stored English description and presents exact ES/FR labels when governed terms exist", async () => {
    const resolveDisplaysForCatalogRows = jest.fn().mockResolvedValue(
      new Map([
        [
          "cat-r1085",
          {
            code: "R10.85",
            displayName: "Dolor abdominal en varios sitios",
            exactness: "EXACT_GOVERNED",
            provenance: "MEDORA_GOVERNED",
            localized: true,
          },
        ],
        [
          "cat-a42",
          {
            code: "A42.1",
            displayName: "A42.1",
            exactness: "UNLOCALIZED_CODE",
            provenance: null,
            localized: false,
          },
        ],
      ]),
    );
    const prisma = mockPrisma([r1085, a42]);
    const service = new DiagnosesService(
      prisma as never,
      { log: jest.fn().mockResolvedValue(undefined) } as never,
      { resolveDisplaysForCatalogRows } as unknown as Icd10TerminologyService,
    );
    const result = await service.findByPatient("pat-1", "fac-1", { locale: "es", status: "ACTIVE" });
    expect(prisma.diagnosis.findMany).toHaveBeenCalledTimes(1);
    expect(resolveDisplaysForCatalogRows).toHaveBeenCalledTimes(1);
    expect(resolveDisplaysForCatalogRows.mock.calls[0][0].catalogRows).toHaveLength(2);
    const presentedR1085 = result.items.find((row) => row.id === "dx-r1085")!;
    const presentedA42 = result.items.find((row) => row.id === "dx-a42")!;
    expect(presentedR1085.description).toBe(englishR1085);
    expect(presentedR1085.displayLabel).toBe("Dolor abdominal en varios sitios");
    expect(presentedR1085.displayResolution).toBe("EXACT_GOVERNED_LABEL");
    expect(presentedA42.description).toBe(englishA42);
    expect(presentedA42.displayLabel).toBe("A42.1");
    expect(presentedA42.displayResolution).toBe("UNLOCALIZED_CODE");
    expect(`${presentedA42.displayLabel}`).not.toContain("—");
  });

  it("repeats FR missing/exact behavior without mutating stored descriptions", async () => {
    const resolveDisplaysForCatalogRows = jest.fn().mockResolvedValue(
      new Map([
        [
          "cat-r1085",
          {
            code: "R10.85",
            displayName: "Douleur abdominale à plusieurs sites",
            exactness: "EXACT_GOVERNED",
            provenance: "MEDORA_GOVERNED",
            localized: true,
          },
        ],
        [
          "cat-a42",
          {
            code: "A42.1",
            displayName: "A42.1",
            exactness: "UNLOCALIZED_CODE",
            provenance: null,
            localized: false,
          },
        ],
      ]),
    );
    const service = new DiagnosesService(
      mockPrisma([r1085, a42]) as never,
      { log: jest.fn().mockResolvedValue(undefined) } as never,
      { resolveDisplaysForCatalogRows } as unknown as Icd10TerminologyService,
    );
    const result = await service.findByPatient("pat-1", "fac-1", { locale: "fr" });
    expect(resolveDisplaysForCatalogRows).toHaveBeenCalledTimes(1);
    const presentedR1085 = result.items.find((row) => row.id === "dx-r1085")!;
    const presentedA42 = result.items.find((row) => row.id === "dx-a42")!;
    expect(presentedR1085.description).toBe(englishR1085);
    expect(presentedR1085.displayLabel).toBe("Douleur abdominale à plusieurs sites");
    expect(presentedA42.displayLabel).toBe("A42.1");
    expect(presentedA42.displayResolution).toBe("UNLOCALIZED_CODE");
  });

  it("rejects invalid list locale instead of defaulting to English", async () => {
    const service = new DiagnosesService(
      mockPrisma([r1085]) as never,
      { log: jest.fn().mockResolvedValue(undefined) } as never,
      { resolveDisplaysForCatalogRows: jest.fn() } as unknown as Icd10TerminologyService,
    );
    await expect(service.findByPatient("pat-1", "fac-1", { locale: "ht" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
