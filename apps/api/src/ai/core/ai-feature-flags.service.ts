import { Injectable } from "@nestjs/common";
import { AiConfigService } from "./ai-config.service";

/**
 * AI-1 external-provider deployment kill switch. This deliberately does not
 * gate local deterministic chart review, which never calls an external model.
 * The allowlist is an interim operator control, NOT clinical/PHI approval.
 * A durable facility/role/category capability and provider compliance review
 * are still required before production activation.
 */
@Injectable()
export class AiFeatureFlagsService {
  constructor(private readonly config: AiConfigService) {}

  isAiEnabled(): boolean {
    return this.config.getProvider() !== "NO_OP";
  }

  isCategoryEnabled(_category: string): boolean {
    // Do not advertise category-specific permission before it exists.
    return false;
  }

  isFacilityEnabled(facilityId: string): boolean {
    if (!this.isAiEnabled() || !facilityId || typeof facilityId !== "string") return false;
    const raw = process.env.MEDORA_AI_EXTERNAL_FACILITY_IDS;
    if (!raw || raw.trim().length === 0) return false;
    const entries = raw.split(",").map((value) => value.trim()).filter(Boolean);
    // No wildcard, partial matches, or malformed list can grant permission.
    if (entries.some((value) => value === "*" || !/^[a-zA-Z0-9_-]{8,128}$/.test(value))) return false;
    return entries.includes(facilityId);
  }
}
