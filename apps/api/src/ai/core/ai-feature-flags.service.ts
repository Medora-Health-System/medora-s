import { Injectable } from "@nestjs/common";
import { AiConfigService } from "./ai-config.service";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * AI-1 external-provider deployment kill switch. This deliberately does not
 * gate local deterministic chart review, which never calls an external model.
 * The allowlist is an interim operator control, NOT clinical/PHI approval.
 * A durable facility/role/category capability and provider compliance review
 * are still required before production activation.
 */
@Injectable()
export class AiFeatureFlagsService {
  constructor(private readonly config: AiConfigService, private readonly prisma: PrismaService) {}

  isAiEnabled(): boolean {
    return this.config.getProvider() !== "NO_OP";
  }

  isCategoryEnabled(_category: string): boolean {
    // Do not advertise category-specific permission before it exists.
    return false;
  }

  async isFacilityEnabled(facilityId: string): Promise<boolean> {
    if (!this.isAiEnabled() || !facilityId || typeof facilityId !== "string") return false;

    // Durable facility configuration is authoritative. External provider
    // configuration alone never grants PHI-bearing AI access.
    const row = await this.prisma.facilityConfiguration.findUnique({
      where: { facilityId },
      select: { settingsJson: true, facility: { select: { isActive: true } } },
    });
    if (!row?.facility?.isActive || !row.settingsJson || typeof row.settingsJson !== "object" || Array.isArray(row.settingsJson)) {
      return false;
    }
    const settings = row.settingsJson as Record<string, unknown>;
    const ai = settings.medoraAssist;
    if (!ai || typeof ai !== "object" || Array.isArray(ai)) return false;
    return (ai as Record<string, unknown>).externalClinicalReviewEnabled === true;
  }
}
