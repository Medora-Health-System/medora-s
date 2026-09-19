import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { resolvePlatformAuthority } from "../auth/platform-principal";

const normalizeCountry = (value: string) => value.trim().toUpperCase();

@Injectable()
export class PlatformCountryScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive(userId: string): Promise<string[]> {
    const rows = await this.prisma.platformCountryScopeGrant.findMany({ where: { userId, isActive: true }, select: { countryCode: true } });
    return [...new Set(rows.map((row) => normalizeCountry(row.countryCode)))].sort();
  }

  async assertCountry(userId: string, countryCode: string): Promise<void> {
    if ((await resolvePlatformAuthority(this.prisma, userId)).granted) return;
    const country = normalizeCountry(countryCode);
    if (!country) throw new ForbiddenException("Delegated country scope required");
    const grant = await this.prisma.platformCountryScopeGrant.findFirst({ where: { userId, countryCode: country, isActive: true }, select: { id: true } });
    if (!grant) throw new ForbiddenException("Delegated country scope denied");
  }

  async assertFacility(userId: string, facilityId: string): Promise<void> {
    if ((await resolvePlatformAuthority(this.prisma, userId)).granted) return;
    const facility = await this.prisma.facility.findUnique({ where: { id: facilityId }, select: { country: true } });
    if (!facility) throw new ForbiddenException("Facility target unavailable");
    await this.assertCountry(userId, facility.country);
  }
}
