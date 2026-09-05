import { Icd10TerminologyService } from "./icd10-terminology.service";

describe("Icd10TerminologyService", () => {
  it("resolves FR/ES through shared exact-key logic and never queries search aliases", async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: "cat-1",
      code: "R10.85",
      codeSystem: "ICD-10-CM",
      releaseVersion: "FY2026",
      shortDescription: "Abdominal pain, unspecified site",
      longDescription: null,
    });
    const findMany = jest.fn().mockResolvedValue([
      {
        icd10CatalogId: "cat-1",
        codeSystem: "ICD-10-CM",
        releaseVersion: "FY2026",
        code: "R10.85",
        locale: "es",
        preferredLabel: "Dolor abdominal en varios sitios",
        labelRegister: "CLINICIAN_PREFERRED",
        provenance: "MEDORA_GOVERNED",
        exactness: "EXACT_GOVERNED",
        sourceId: "MEDORA_DX_GOVERNED",
        terminologyVersion: "MEDORA.TRILANG.DX.P2.GOVERNED.89",
        status: "APPROVED",
        isEffective: true,
      },
    ]);
    const prisma = {
      icd10DiagnosisCode: { findFirst },
      icd10DiagnosisTerminology: { findMany },
      icd10DiagnosisSearchAlias: { findMany: jest.fn() },
    };
    const service = new Icd10TerminologyService(prisma as never);
    const result = await service.resolveIcd10DiagnosisDisplay({
      codeSystem: "ICD-10-CM",
      releaseVersion: "FY2026",
      code: "R10.85",
      locale: "es",
    });
    expect(result).toEqual({
      code: "R10.85",
      displayName: "Dolor abdominal en varios sitios",
      exactness: "EXACT_GOVERNED",
      provenance: "MEDORA_GOVERNED",
      localized: true,
      sourceKind: "TERMINOLOGY_ROW",
    });
    expect(prisma.icd10DiagnosisSearchAlias.findMany).not.toHaveBeenCalled();
  });

  it("returns UNLOCALIZED_CODE for screenshot codes without governed labels", async () => {
    const prisma = {
      icd10DiagnosisCode: {
        findFirst: jest.fn().mockResolvedValue({
          id: "cat-a42",
          code: "A42.1",
          codeSystem: "ICD-10-CM",
          releaseVersion: "FY2026",
          shortDescription: "Abdominal actinomycosis",
          longDescription: null,
        }),
      },
      icd10DiagnosisTerminology: { findMany: jest.fn().mockResolvedValue([]) },
      icd10DiagnosisSearchAlias: { findMany: jest.fn() },
    };
    const service = new Icd10TerminologyService(prisma as never);
    const result = await service.resolveIcd10DiagnosisDisplay({
      codeSystem: "ICD-10-CM",
      releaseVersion: "FY2026",
      code: "A42.1",
      locale: "fr",
    });
    expect(result.displayName).toBe("A42.1");
    expect(result.exactness).toBe("UNLOCALIZED_CODE");
    expect(prisma.icd10DiagnosisSearchAlias.findMany).not.toHaveBeenCalled();
  });

  it("batches terminology for multiple catalog rows in one findMany", async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        icd10CatalogId: "cat-r1085",
        codeSystem: "ICD-10-CM",
        releaseVersion: "FY2026",
        code: "R10.85",
        locale: "es",
        preferredLabel: "Dolor abdominal en varios sitios",
        labelRegister: "CLINICIAN_PREFERRED",
        provenance: "MEDORA_GOVERNED",
        exactness: "EXACT_GOVERNED",
        sourceId: "MEDORA_DX_GOVERNED",
        terminologyVersion: "MEDORA.TRILANG.DX.P2.GOVERNED.89",
        status: "APPROVED",
        isEffective: true,
      },
    ]);
    const prisma = {
      icd10DiagnosisCode: { findFirst: jest.fn() },
      icd10DiagnosisTerminology: { findMany },
      icd10DiagnosisSearchAlias: { findMany: jest.fn() },
    };
    const service = new Icd10TerminologyService(prisma as never);
    const result = await service.resolveDisplaysForCatalogRows({
      locale: "es",
      catalogRows: [
        {
          id: "cat-r1085",
          code: "R10.85",
          codeSystem: "ICD-10-CM",
          releaseVersion: "FY2026",
          shortDescription: "Abdominal pain, unspecified site",
        },
        {
          id: "cat-a42",
          code: "A42.1",
          codeSystem: "ICD-10-CM",
          releaseVersion: "FY2026",
          shortDescription: "Abdominal actinomycosis",
        },
      ],
    });
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0].where.icd10CatalogId.in).toEqual(["cat-r1085", "cat-a42"]);
    expect(findMany.mock.calls[0][0].where.locale).toBe("es");
    expect(result.get("cat-r1085")?.displayName).toBe("Dolor abdominal en varios sitios");
    expect(result.get("cat-a42")?.exactness).toBe("UNLOCALIZED_CODE");
    expect(result.get("cat-a42")?.displayName).toBe("A42.1");
    expect(prisma.icd10DiagnosisSearchAlias.findMany).not.toHaveBeenCalled();
  });

  it("skips terminology queries for EN (official source only)", async () => {
    const findMany = jest.fn();
    const prisma = {
      icd10DiagnosisCode: { findFirst: jest.fn() },
      icd10DiagnosisTerminology: { findMany },
      icd10DiagnosisSearchAlias: { findMany: jest.fn() },
    };
    const service = new Icd10TerminologyService(prisma as never);
    const result = await service.resolveDisplaysForCatalogRows({
      locale: "en",
      catalogRows: [
        {
          id: "cat-r1085",
          code: "R10.85",
          codeSystem: "ICD-10-CM",
          releaseVersion: "FY2026",
          shortDescription: "Abdominal pain, unspecified site",
        },
      ],
    });
    expect(findMany).not.toHaveBeenCalled();
    expect(result.get("cat-r1085")).toMatchObject({
      displayName: "Abdominal pain, unspecified site",
      exactness: "EXACT_SOURCE",
    });
  });

  it("uses one terminology findMany for 50 FR/ES rows and none per row", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new Icd10TerminologyService({
      icd10DiagnosisCode: { findFirst: jest.fn() },
      icd10DiagnosisTerminology: { findMany },
      icd10DiagnosisSearchAlias: { findMany: jest.fn() },
    } as never);
    const catalogRows = Array.from({ length: 50 }, (_, index) => ({
      id: `cat-${index}`,
      code: `A00.${String(index).padStart(2, "0")}`,
      codeSystem: "ICD-10-CM",
      releaseVersion: "FY2026",
      shortDescription: "English source",
    }));
    const result = await service.resolveDisplaysForCatalogRows({ locale: "fr", catalogRows });
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0].where.icd10CatalogId.in).toHaveLength(50);
    expect(findMany.mock.calls[0][0].where.locale).toBe("fr");
    expect(result.size).toBe(50);
    expect(result.get("cat-0")?.exactness).toBe("UNLOCALIZED_CODE");
  });
});
