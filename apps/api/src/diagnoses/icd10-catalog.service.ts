import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeIcd10CodeForLookup } from "@medora/shared";

const DEFAULT_SEARCH_LIMIT = 30;
const MAX_SEARCH_LIMIT = 50;

type Icd10SearchRow = {
  id: string;
  code: string;
  normalizedCode: string;
  shortDescription: string;
  longDescription: string | null;
  chapter: string | null;
  category: string | null;
  isBillable: boolean;
  effectiveYear: number | null;
  codeSetVersion: string | null;
};

function joinSqlOr(conditions: Prisma.Sql[]) {
  return conditions.reduce((acc, condition, index) => {
    if (index === 0) return condition;
    return Prisma.sql`${acc} OR ${condition}`;
  }, Prisma.empty);
}

@Injectable()
export class Icd10CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, limit = DEFAULT_SEARCH_LIMIT) {
    const raw = q?.trim() ?? "";
    if (!raw) {
      return { items: [] as const, limit: Math.min(Math.max(1, limit), MAX_SEARCH_LIMIT) };
    }
    const take = Math.min(Math.max(1, limit), MAX_SEARCH_LIMIT);
    const norm = normalizeIcd10CodeForLookup(raw);
    const tokens = raw.split(/\s+/).filter(Boolean);
    const pattern = raw.length >= 2 ? `%${raw}%` : null;
    const normPrefix = norm.length > 0 ? `${norm}%` : null;
    const rawPrefix = raw.length > 0 ? `${raw}%` : null;
    const lowerPattern = raw.length >= 2 ? `%${raw.toLowerCase()}%` : null;

    const or: Prisma.Sql[] = [];

    if (normPrefix) {
      or.push(Prisma.sql`"normalizedCode" ILIKE ${normPrefix}`);
      or.push(Prisma.sql`"code" ILIKE ${rawPrefix}`);
    }
    if (pattern) {
      or.push(Prisma.sql`"shortDescription" ILIKE ${pattern}`);
      or.push(Prisma.sql`"longDescription" ILIKE ${pattern}`);
      or.push(Prisma.sql`"searchText" ILIKE ${lowerPattern}`);
    }
    const tokenConditions: Prisma.Sql[] = [];
    for (const t of tokens) {
      if (t.length < 2) continue;
      const tokenPattern = `%${t}%`;
      const condition = Prisma.sql`"shortDescription" ILIKE ${tokenPattern}`;
      tokenConditions.push(condition);
      or.push(condition);
    }

    if (or.length === 0) {
      return { items: [] as const, limit: take };
    }

    const tokenRankSql = tokenConditions.length > 0 ? joinSqlOr(tokenConditions) : Prisma.sql`FALSE`;
    const matchSql = joinSqlOr(or);
    const codeExactSql =
      norm.length > 0
        ? Prisma.sql`LOWER("normalizedCode") = LOWER(${norm}) OR LOWER("code") = LOWER(${raw})`
        : Prisma.sql`FALSE`;
    const codePrefixSql =
      normPrefix && rawPrefix
        ? Prisma.sql`"normalizedCode" ILIKE ${normPrefix} OR "code" ILIKE ${rawPrefix}`
        : Prisma.sql`FALSE`;
    const shortExactSql = Prisma.sql`LOWER("shortDescription") = LOWER(${raw})`;
    const shortPrefixSql = rawPrefix ? Prisma.sql`"shortDescription" ILIKE ${rawPrefix}` : Prisma.sql`FALSE`;
    const shortContainsSql = pattern ? Prisma.sql`"shortDescription" ILIKE ${pattern}` : Prisma.sql`FALSE`;
    const longContainsSql = pattern ? Prisma.sql`"longDescription" ILIKE ${pattern}` : Prisma.sql`FALSE`;

    const items = await this.prisma.$queryRaw<Icd10SearchRow[]>`
      SELECT
        "id",
        "code",
        "normalizedCode",
        "shortDescription",
        "longDescription",
        "chapter",
        "category",
        "isBillable",
        "effectiveYear",
        "codeSetVersion"
      FROM "Icd10DiagnosisCode"
      WHERE "isActive" = TRUE
        AND (${matchSql})
      ORDER BY
        CASE
          WHEN ${codeExactSql} THEN 1
          WHEN ${codePrefixSql} THEN 2
          WHEN ${shortExactSql} THEN 3
          WHEN ${shortPrefixSql} THEN 4
          WHEN ${shortContainsSql} THEN 5
          WHEN ${longContainsSql} THEN 6
          WHEN ${tokenRankSql} THEN 7
          ELSE 8
        END ASC,
        "isBillable" DESC,
        LENGTH("shortDescription") ASC,
        "code" ASC
      LIMIT ${take};
    `;

    return { items, limit: take };
  }

  async findByCode(codeParam: string) {
    const raw = codeParam?.trim() ?? "";
    if (!raw) return null;
    const norm = normalizeIcd10CodeForLookup(raw);
    const byNorm = await this.prisma.icd10DiagnosisCode.findFirst({
      where: { normalizedCode: norm, isActive: true },
      select: {
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
      },
    });
    if (byNorm) return byNorm;
    return this.prisma.icd10DiagnosisCode.findFirst({
      where: { code: raw, isActive: true },
      select: {
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
      },
    });
  }
}
