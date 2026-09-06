import { Icd10CatalogService } from "./icd10-catalog.service";
import { Icd10TerminologyService } from "./icd10-terminology.service";

describe("Icd10CatalogService P3 search presentation", () => {
  const catalogRow = {
    id: "cat-r1085",
    code: "R10.85",
    normalizedCode: "R1085",
    codeSystem: "ICD-10-CM",
    releaseVersion: "FY2026",
    shortDescription: "Abdominal pain, unspecified site",
    longDescription: null,
    chapter: null,
    category: null,
    isBillable: true,
    effectiveYear: 2026,
    codeSetVersion: "FY2026",
  };

  it("requires locale-resolved display fields and does not use shortDescription as FR/ES display", async () => {
    const queryRaw = jest.fn().mockResolvedValue([catalogRow]);
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
      ]),
    );
    const service = new Icd10CatalogService(
      { $queryRaw: queryRaw } as never,
      { resolveDisplaysForCatalogRows } as unknown as Icd10TerminologyService,
    );
    const result = await service.search("dolor", "es", 25);
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(resolveDisplaysForCatalogRows).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "cat-r1085",
      code: "R10.85",
      codeSystem: "ICD-10-CM",
      releaseVersion: "FY2026",
      shortDescription: "Abdominal pain, unspecified site",
      displayLabel: "Dolor abdominal en varios sitios",
      displayResolution: "EXACT_GOVERNED_LABEL",
    });
    expect(result.items[0]!.displayLabel).not.toBe(result.items[0]!.shortDescription);
  });

  it("maps missing ES terminology to UNLOCALIZED_CODE without English fallback", async () => {
    const a42 = { ...catalogRow, id: "cat-a42", code: "A42.1", normalizedCode: "A421", shortDescription: "Abdominal actinomycosis" };
    const service = new Icd10CatalogService(
      { $queryRaw: jest.fn().mockResolvedValue([a42]) } as never,
      {
        resolveDisplaysForCatalogRows: jest.fn().mockResolvedValue(
          new Map([
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
        ),
      } as unknown as Icd10TerminologyService,
    );
    const result = await service.search("abd", "es", 25);
    expect(result.items[0]!.displayResolution).toBe("UNLOCALIZED_CODE");
    expect(result.items[0]!.displayLabel).toBe("A42.1");
    expect(result.items[0]!.displayLabel).not.toBe("Abdominal actinomycosis");
  });

  it("does not treat alias match text as displayLabel", async () => {
    const service = new Icd10CatalogService(
      { $queryRaw: jest.fn().mockResolvedValue([catalogRow]) } as never,
      {
        resolveDisplaysForCatalogRows: jest.fn().mockResolvedValue(
          new Map([
            [
              "cat-r1085",
              {
                code: "R10.85",
                displayName: "R10.85",
                exactness: "UNLOCALIZED_CODE",
                provenance: null,
                localized: false,
              },
            ],
          ]),
        ),
      } as unknown as Icd10TerminologyService,
    );
    const result = await service.search("dolor abdominal", "es", 25);
    expect(result.items[0]!.displayLabel).not.toBe("dolor abdominal");
    expect(result.items[0]!.displayResolution).toBe("UNLOCALIZED_CODE");
  });

  it("returns one row per canonical catalog id from search SQL", async () => {
    const second = { ...catalogRow, id: "cat-a42", code: "A42.1", normalizedCode: "A421" };
    const service = new Icd10CatalogService(
      { $queryRaw: jest.fn().mockResolvedValue([catalogRow, second]) } as never,
      {
        resolveDisplaysForCatalogRows: jest.fn().mockResolvedValue(
          new Map([
            ["cat-r1085", { code: "R10.85", displayName: "R10.85", exactness: "UNLOCALIZED_CODE", provenance: null, localized: false }],
            ["cat-a42", { code: "A42.1", displayName: "A42.1", exactness: "UNLOCALIZED_CODE", provenance: null, localized: false }],
          ]),
        ),
      } as unknown as Icd10TerminologyService,
    );
    const result = await service.search("a", "es", 25);
    const ids = result.items.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps English source fields on UNLOCALIZED FR/ES DTOs without using them as displayLabel", async () => {
    const a42 = {
      ...catalogRow,
      id: "cat-a42",
      code: "A42.1",
      normalizedCode: "A421",
      shortDescription: "Abdominal actinomycosis",
      longDescription: "Abdominal actinomycosis",
    };
    const service = new Icd10CatalogService(
      { $queryRaw: jest.fn().mockResolvedValue([a42]) } as never,
      {
        resolveDisplaysForCatalogRows: jest.fn().mockResolvedValue(
          new Map([
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
        ),
      } as unknown as Icd10TerminologyService,
    );
    for (const locale of ["es", "fr"] as const) {
      const result = await service.search("A42.1", locale, 25);
      expect(result.items[0]!.shortDescription).toBe("Abdominal actinomycosis");
      expect(result.items[0]!.longDescription).toBe("Abdominal actinomycosis");
      expect(result.items[0]!.displayLabel).toBe("A42.1");
      expect(result.items[0]!.displayResolution).toBe("UNLOCALIZED_CODE");
      expect(result.items[0]!.displayLabel).not.toBe(result.items[0]!.shortDescription);
    }
  });

  it("uses one catalog query and one terminology batch for a 50-row FR/ES result", async () => {
    const rows = Array.from({ length: 50 }, (_, index) => ({
      ...catalogRow,
      id: `cat-${index}`,
      code: `A00.${String(index).padStart(2, "0")}`,
      normalizedCode: `A00${String(index).padStart(2, "0")}`,
    }));
    const queryRaw = jest.fn().mockResolvedValue(rows);
    const resolveDisplaysForCatalogRows = jest.fn().mockResolvedValue(
      new Map(rows.map((row) => [row.id, { code: row.code, displayName: row.code, exactness: "UNLOCALIZED_CODE", provenance: null, localized: false }])),
    );
    const service = new Icd10CatalogService(
      { $queryRaw: queryRaw } as never,
      { resolveDisplaysForCatalogRows } as unknown as Icd10TerminologyService,
    );
    const result = await service.search("a", "es", 50);
    expect(result.items).toHaveLength(50);
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(resolveDisplaysForCatalogRows).toHaveBeenCalledTimes(1);
    expect(resolveDisplaysForCatalogRows.mock.calls[0][0].catalogRows).toHaveLength(50);
  });

  it("skips terminology for EN while still using one catalog query", async () => {
    const queryRaw = jest.fn().mockResolvedValue([catalogRow]);
    const resolveDisplaysForCatalogRows = jest.fn().mockResolvedValue(
      new Map([
        [
          "cat-r1085",
          {
            code: "R10.85",
            displayName: "Abdominal pain, unspecified site",
            exactness: "EXACT_SOURCE",
            provenance: null,
            localized: false,
          },
        ],
      ]),
    );
    const service = new Icd10CatalogService(
      { $queryRaw: queryRaw } as never,
      { resolveDisplaysForCatalogRows } as unknown as Icd10TerminologyService,
    );
    const result = await service.search("R10.85", "en", 25);
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(resolveDisplaysForCatalogRows).toHaveBeenCalledTimes(1);
    expect(result.items[0]!.displayResolution).toBe("EXACT_SOURCE_LABEL");
  });

  it("selects FY2026 for DOS 2026-09-30 and FY2027 from 2026-10-01", async () => {
    const queryRaw = jest.fn().mockResolvedValue([]);
    const service = new Icd10CatalogService(
      { $queryRaw: queryRaw } as never,
      { resolveDisplaysForCatalogRows: jest.fn() } as unknown as Icd10TerminologyService,
    );
    await service.search("R10.85", "es", 25, { dateOfService: "2026-09-30" });
    await service.search("R10.85", "es", 25, { dateOfService: "2026-10-01" });
    await service.search("R10.85", "es", 25, { dateOfService: "2026-10-15" });
    const releases = queryRaw.mock.calls.map((call) => {
      const sql = call[0] as { values?: unknown[] };
      return (sql.values ?? []).find((value) => value === "FY2026" || value === "FY2027");
    });
    expect(releases).toEqual(["FY2026", "FY2027", "FY2027"]);
  });
});
