import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export function normalizePayerSearchToken(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

@Injectable()
export class InsurancePayersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recherche rapide sur nom normalisé (préfixe / contient).
   */
  async search(q: string, limit = 25) {
    const n = normalizePayerSearchToken(q);
    if (n.length < 2) {
      return [];
    }
    return this.prisma.insurancePayer.findMany({
      where: {
        isActive: true,
        normalizedName: { contains: n, mode: "insensitive" },
      },
      take: Math.min(limit, 50),
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    });
  }
}
