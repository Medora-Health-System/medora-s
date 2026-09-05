import { Injectable } from "@nestjs/common";
import {
  mapIcd10ExactnessToDisplayResolution,
  normalizeIcd10CodeForLookup,
  type ProductUiLanguage,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import {
  buildIcd10CatalogSearchMatch,
  buildIcd10CatalogSearchSelectSql,
  type Icd10CatalogSearchRow,
} from "./icd10-catalog-search.query";
import { Icd10TerminologyService } from "./icd10-terminology.service";

const DEFAULT_SEARCH_LIMIT = 30;
const MAX_SEARCH_LIMIT = 50;

export type Icd10CatalogSearchHit = Icd10CatalogSearchRow & {
  displayLabel: string;
  displayResolution: "EXACT_SOURCE_LABEL" | "EXACT_GOVERNED_LABEL" | "UNLOCALIZED_CODE";
};

@Injectable()
export class Icd10CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly terminology: Icd10TerminologyService,
  ) {}

  async search(q: string, locale: ProductUiLanguage, limit = DEFAULT_SEARCH_LIMIT) {
    const raw = q?.trim() ?? "";
    const take = Math.min(Math.max(1, limit), MAX_SEARCH_LIMIT);
    if (!raw) {
      return { items: [] as const, limit: take };
    }

    const match = buildIcd10CatalogSearchMatch(raw);
    if (!match) {
      return { items: [] as const, limit: take };
    }

    const catalogItems = await this.prisma.$queryRaw<Icd10CatalogSearchRow[]>(
      buildIcd10CatalogSearchSelectSql(match, take),
    );

    const displays = await this.terminology.resolveDisplaysForCatalogRows({
      locale,
      catalogRows: catalogItems.map((row) => ({
        id: row.id,
        code: row.code,
        codeSystem: row.codeSystem,
        releaseVersion: row.releaseVersion,
        shortDescription: row.shortDescription,
        longDescription: row.longDescription,
      })),
    });

    const items: Icd10CatalogSearchHit[] = catalogItems.map((row) => {
      const display = displays.get(row.id);
      return {
        ...row,
        displayLabel: display?.displayName ?? row.code,
        displayResolution: display
          ? mapIcd10ExactnessToDisplayResolution(display.exactness)
          : "UNLOCALIZED_CODE",
      };
    });

    return { items, limit: take };
  }

  async findByCode(codeParam: string) {
    const raw = codeParam?.trim() ?? "";
    if (!raw) return null;
    const norm = normalizeIcd10CodeForLookup(raw);
    const select = {
      id: true,
      code: true,
      normalizedCode: true,
      shortDescription: true,
      longDescription: true,
      chapter: true,
      category: true,
      isBillable: true,
      effectiveYear: true,
      codeSetVersion: true,
    } as const;
    const byNorm = await this.prisma.icd10DiagnosisCode.findFirst({
      where: {
        normalizedCode: norm,
        isActive: true,
        isSelectable: true,
        NOT: { releaseVersion: { contains: "DEV-SAMPLE" } },
      },
      orderBy: [{ releaseYear: "desc" }, { code: "asc" }],
      select,
    });
    if (byNorm) return byNorm;
    const byNormAny = await this.prisma.icd10DiagnosisCode.findFirst({
      where: { normalizedCode: norm, isActive: true, isSelectable: true },
      orderBy: [{ releaseYear: "desc" }, { code: "asc" }],
      select,
    });
    if (byNormAny) return byNormAny;
    return this.prisma.icd10DiagnosisCode.findFirst({
      where: { code: raw, isActive: true, isSelectable: true },
      orderBy: [{ releaseYear: "desc" }, { code: "asc" }],
      select,
    });
  }
}
