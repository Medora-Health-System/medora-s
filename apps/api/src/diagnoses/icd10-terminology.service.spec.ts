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
});
