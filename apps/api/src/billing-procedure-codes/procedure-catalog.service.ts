import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { BillingProcedureCodeSystem } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeProcedureCodeForValidation } from "@medora/shared";
const DEFAULT_SEARCH_LIMIT = 30;
const MAX_SEARCH_LIMIT = 50;

@Injectable()
export class ProcedureCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, limit = DEFAULT_SEARCH_LIMIT, system?: BillingProcedureCodeSystem) {
    const raw = q?.trim() ?? "";
    if (!raw) {
      return { items: [] as const, limit: Math.min(Math.max(1, limit), MAX_SEARCH_LIMIT) };
    }
    const take = Math.min(Math.max(1, limit), MAX_SEARCH_LIMIT);

    const or: Prisma.BillingProcedureCodeWhereInput[] = [];
    if (raw.length >= 2) {
      or.push({ shortDescription: { contains: raw, mode: "insensitive" } });
      or.push({ searchText: { contains: raw.toLowerCase(), mode: "insensitive" } });
    }
    const digits = raw.replace(/\D/g, "");
    if (digits.length >= 2) {
      or.push({ normalizedCode: { startsWith: digits }, codeSystem: BillingProcedureCodeSystem.CPT });
    }
    const alnum = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (alnum.length >= 2) {
      or.push({ normalizedCode: { startsWith: alnum } });
      or.push({ code: { startsWith: raw, mode: "insensitive" } });
    }

    if (or.length === 0) {
      return { items: [] as const, limit: take };
    }

    const where: Prisma.BillingProcedureCodeWhereInput = {
      isActive: true,
      OR: or,
    };
    if (system) {
      where.codeSystem = system;
    }

    const items = await this.prisma.billingProcedureCode.findMany({
      where,
      orderBy: [{ codeSystem: "asc" }, { code: "asc" }],
      take,
      select: {
        id: true,
        code: true,
        normalizedCode: true,
        codeSystem: true,
        shortDescription: true,
        longDescription: true,
        effectiveYear: true,
        codeSetVersion: true,
      },
    });

    return { items, limit: take };
  }

  async findByCode(codeParam: string, system: BillingProcedureCodeSystem) {
    const raw = codeParam?.trim() ?? "";
    if (!raw) return null;
    const norm = normalizeProcedureCodeForValidation(raw, system === "CPT" ? "CPT" : "HCPCS");
    const byNorm = await this.prisma.billingProcedureCode.findFirst({
      where: { normalizedCode: norm, codeSystem: system, isActive: true },
      select: {
        id: true,
        code: true,
        normalizedCode: true,
        codeSystem: true,
        shortDescription: true,
        longDescription: true,
        effectiveYear: true,
        codeSetVersion: true,
      },
    });
    if (byNorm) return byNorm;
    return this.prisma.billingProcedureCode.findFirst({
      where: { code: raw, codeSystem: system, isActive: true },
      select: {
        id: true,
        code: true,
        normalizedCode: true,
        codeSystem: true,
        shortDescription: true,
        longDescription: true,
        effectiveYear: true,
        codeSetVersion: true,
      },
    });
  }
}
