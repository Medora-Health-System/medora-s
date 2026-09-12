import { Injectable } from "@nestjs/common";
import { PatientPortalAuditService } from "../patient-portal-audit.service";
import { PatientPortalRepository } from "../persistence/patient-portal.repository";
import type { PatientPortalPrincipal } from "../auth/patient-portal.types";

@Injectable()
export class PatientOrganizationsService {
  constructor(
    private readonly repo: PatientPortalRepository,
    private readonly audit: PatientPortalAuditService
  ) {}

  async list(
    principal: PatientPortalPrincipal,
    context: { ip?: string | null; userAgent?: string | null }
  ) {
    const links = await this.repo.listVerifiedFacilityLinks(principal.portalAccountId);

    await this.audit.record("PATIENT_PORTAL_ORGANIZATION_VIEW", "PATIENT_PORTAL_ORGANIZATION_LIST", {
      portalAccountId: principal.portalAccountId,
      sessionId: principal.sessionId,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { organizationCount: links.length },
    });

    return {
      organizations: links.map((link) => ({
        facilityId: link.facilityId,
        name: link.facilityName,
        country: link.facilityCountry,
        timezone: link.facilityTimezone,
        defaultLanguage: link.facilityDefaultLanguage,
        relationshipStatus: link.status,
        verifiedAt: link.verifiedAt?.toISOString() ?? null,
      })),
    };
  }
}
