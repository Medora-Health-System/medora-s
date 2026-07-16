import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeIcd10CodeForLookup } from "@medora/shared";
import {
  buildIcd10CatalogSearchMatch,
  buildIcd10CatalogSearchSelectSql,
  type Icd10CatalogSearchRow,
} from "./icd10-catalog-search.query";

const DEFAULT_SEARCH_LIMIT = 30;
const MAX_SEARCH_LIMIT = 50;

@Injectable()
export class Icd10CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, limit = DEFAULT_SEARCH_LIMIT) {
    const raw = q?.trim() ?? "";
    const take = Math.min(Math.max(1, limit), MAX_SEARCH_LIMIT);
    if (!raw) {
      return { items: [] as const, limit: take };
    }

    const match = buildIcd10CatalogSearchMatch(raw);
    if (!match) {
      return { items: [] as const, limit: take };
    }

    const items = await this.prisma.$queryRaw<Icd10CatalogSearchRow[]>(
      buildIcd10CatalogSearchSelectSql(match, take),
    );

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
