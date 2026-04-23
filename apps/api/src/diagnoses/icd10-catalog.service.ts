import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeIcd10CodeForLookup } from "@medora/shared";

const DEFAULT_SEARCH_LIMIT = 30;
const MAX_SEARCH_LIMIT = 50;

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

    const or: Prisma.Icd10DiagnosisCodeWhereInput[] = [];

    if (normPrefix) {
      or.push({ normalizedCode: { startsWith: norm, mode: "insensitive" } });
      or.push({ code: { startsWith: raw, mode: "insensitive" } });
    }
    if (pattern) {
      or.push({ shortDescription: { contains: raw, mode: "insensitive" } });
      or.push({ searchText: { contains: raw.toLowerCase(), mode: "insensitive" } });
    }
    for (const t of tokens) {
      if (t.length < 2) continue;
      or.push({ shortDescription: { contains: t, mode: "insensitive" } });
    }

    if (or.length === 0) {
      return { items: [] as const, limit: take };
    }

    const items = await this.prisma.icd10DiagnosisCode.findMany({
      where: {
        isActive: true,
        OR: or,
      },
      orderBy: [{ code: "asc" }],
      take,
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
