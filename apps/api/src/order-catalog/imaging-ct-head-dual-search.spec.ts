/**
 * Phase 2C.3.3B / 2C.5B — CT head search query matrix (post-retirement active catalog).
 */
import { HAITI_IMAGING_CATALOG } from "../../prisma/data/haiti-imaging-studies";
import { ImagingCatalogService } from "./imaging-catalog.service";

const CT_HEAD_ID = "11111111-1111-4111-8111-111111111111";
const CT_HEAD_WO_ID = "22222222-2222-4222-8222-222222222222";

type CatalogRow = {
  id: string;
  code: string;
  name: string;
  displayNameEn: string;
  displayNameFr: string;
  searchText: string;
  modality: string;
  bodyRegion: string;
  isActive: boolean;
  isEssential: boolean;
  sortPriority: number;
};

const CT_HEAD_ROW: CatalogRow = {
  id: CT_HEAD_ID,
  code: "CT_HEAD",
  name: "CT_HEAD",
  displayNameEn: "CT head",
  displayNameFr: "Scanner cérébral",
  searchText: "cerveau trauma avc",
  modality: "CT",
  bodyRegion: "CERVEAU",
  isActive: false,
  isEssential: true,
  sortPriority: 10,
};

const CT_HEAD_WO_ROW: CatalogRow = {
  id: CT_HEAD_WO_ID,
  code: "CT_HEAD_WO_CONTRAST",
  name: "CT_HEAD_WO_CONTRAST",
  displayNameEn: "CT head without contrast",
  displayNameFr: "TDM tête sans contraste",
  searchText: "ct head without contrast tdm tete sans contraste brain stroke bleed hemorrhage",
  modality: "CT",
  bodyRegion: "head",
  isActive: true,
  isEssential: true,
  sortPriority: 20,
};

const ALIAS_ROWS = [
  { catalogImagingStudyId: CT_HEAD_WO_ID, alias: "ct head" },
  { catalogImagingStudyId: CT_HEAD_WO_ID, alias: "head CT non contrast" },
  { catalogImagingStudyId: CT_HEAD_WO_ID, alias: "CT brain without contrast" },
  { catalogImagingStudyId: CT_HEAD_WO_ID, alias: "stroke bleed" },
];

function fieldContains(row: CatalogRow, field: keyof CatalogRow, q: string): boolean {
  const value = String(row[field] ?? "").toLowerCase();
  return value.includes(q.toLowerCase());
}

function catalogMatchesContains(row: CatalogRow, q: string): boolean {
  return (
    fieldContains(row, "code", q) ||
    fieldContains(row, "name", q) ||
    fieldContains(row, "displayNameEn", q) ||
    fieldContains(row, "displayNameFr", q) ||
    fieldContains(row, "searchText", q) ||
    fieldContains(row, "modality", q) ||
    fieldContains(row, "bodyRegion", q)
  );
}

function tokenizeQuery(q: string): string[] {
  return q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function catalogMatchesQuery(row: CatalogRow, q: string): boolean {
  if (catalogMatchesContains(row, q)) return true;

  const tokens = tokenizeQuery(q);
  if (tokens.length === 0) return false;

  const haystacks = [row.code, row.name, row.displayNameEn, row.displayNameFr, row.searchText].map((value) =>
    String(value ?? "").toLowerCase()
  );
  return tokens.every((token) => haystacks.some((value) => value.includes(token)));
}

function buildService(): ImagingCatalogService {
  const rows = [CT_HEAD_ROW, CT_HEAD_WO_ROW];

  const prisma = {
    catalogImagingStudy: {
      findMany: jest.fn(async (args: {
        where?: {
          isActive?: boolean;
          OR?: Array<Record<string, { contains: string; mode: string }>>;
          code?: { in: string[] };
          id?: { in: string[] };
        };
      }) => {
        let result = rows.filter((r) => r.isActive);

        const where = args.where;
        if (where?.code?.in) {
          const codes = new Set(where.code.in);
          result = rows.filter((r) => codes.has(r.code) && r.isActive);
        } else if (where?.id?.in) {
          const ids = new Set(where.id.in);
          result = rows.filter((r) => ids.has(r.id));
        } else if (where?.OR) {
          const q = where.OR[0]?.code?.contains ?? where.OR[0]?.searchText?.contains ?? "";
          if (q) {
            result = result.filter((r) => catalogMatchesQuery(r, q));
          }
        }

        return result;
      }),
    },
    imagingStudyAlias: {
      findMany: jest.fn(async (args: { where: { alias: { contains: string; mode: string } } }) => {
        const q = args.where.alias.contains.toLowerCase();
        return ALIAS_ROWS.filter((a) => a.alias.toLowerCase().includes(q));
      }),
    },
  };

  return new ImagingCatalogService(prisma as never);
}

describe("CT head catalog seed retirement (2C.5B)", () => {
  it("marks CT_HEAD inactive and keeps CT_HEAD_WO_CONTRAST active in Haiti seed", () => {
    const ctHead = HAITI_IMAGING_CATALOG.find((row) => row.code === "CT_HEAD");
    const ctHeadWo = HAITI_IMAGING_CATALOG.find((row) => row.code === "CT_HEAD_WO_CONTRAST");
    expect(ctHead?.isActive).toBe(false);
    expect(ctHeadWo?.isActive).toBe(true);
  });
});

describe("CT head post-retirement search (2C.5B)", () => {
  const service = buildService();

  async function codesForQuery(q: string): Promise<string[]> {
    const { items } = await service.search({ q, limit: 20 });
    return items.map((item) => item.code);
  }

  it("ct head returns CT_HEAD_WO_CONTRAST only", async () => {
    const codes = await codesForQuery("ct head");
    expect(codes).toEqual(["CT_HEAD_WO_CONTRAST"]);
  });

  it("does not return inactive CT_HEAD in active catalog search", async () => {
    const codes = await codesForQuery("ct head");
    expect(codes).not.toContain("CT_HEAD");
  });

  it("stroke bleed still returns CT_HEAD_WO_CONTRAST", async () => {
    const codes = await codesForQuery("stroke bleed");
    expect(codes).toEqual(["CT_HEAD_WO_CONTRAST"]);
  });

  it("brain ct still returns CT_HEAD_WO_CONTRAST", async () => {
    const codes = await codesForQuery("brain ct");
    expect(codes).toContain("CT_HEAD_WO_CONTRAST");
  });

  it("keeps ct head DB alias on successor only", async () => {
    const ctHeadAliasOwners = ALIAS_ROWS.filter((row) => row.alias.toLowerCase() === "ct head").map(
      (row) => row.catalogImagingStudyId
    );
    expect(ctHeadAliasOwners).toEqual([CT_HEAD_WO_ID]);
  });
});
