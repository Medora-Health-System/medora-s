import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { resolveMedoraAiCountryAuthority, resolveMedoraAiFacilityLanguage } from "./ai-country-authority.js";

/**
 * Read-only trusted facility context for AI chart review. Never derive the
 * jurisdiction or language from a request header, query parameter, or model.
 */
@Injectable()
export class AiFacilityReviewContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(facilityId: string, encounterId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId, facility: { isActive: true } },
      select: {
        facility: { select: { country: true, defaultLanguage: true } },
      },
    });
    if (!encounter) throw new NotFoundException("Encounter not found or not accessible");

    const country = resolveMedoraAiCountryAuthority(encounter.facility.country);
    const language = resolveMedoraAiFacilityLanguage(encounter.facility.defaultLanguage);
    if (!country || !language) {
      throw new ForbiddenException("Medora Assist facility country or language is not configured for AI review");
    }
    return { country, language };
  }
}
