import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export function normalizePayerSearchToken(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[''`´.]/g, "")
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
    const take = Math.min(limit, 50);
    const fetchCap = Math.min(250, Math.max(take * 8, 64));
    const rows = await this.prisma.insurancePayer.findMany({
      where: {
        isActive: true,
        normalizedName: { contains: n, mode: "insensitive" },
      },
      take: fetchCap,
      select: { id: true, name: true, code: true, normalizedName: true },
    });
    const pref = (a: { normalizedName: string }) => (a.normalizedName.startsWith(n) ? 0 : 1);
    rows.sort((a, b) => {
      const d = pref(a) - pref(b);
      if (d !== 0) return d;
      return a.name.localeCompare(b.name, "en");
    });
    return rows.slice(0, take).map(({ normalizedName: _n, ...rest }) => rest);
  }
}
