import { Injectable, NotFoundException } from "@nestjs/common";
import type { PatientPortalPrincipal } from "../auth/patient-portal.types";
import { PatientPortalAuditService } from "../patient-portal-audit.service";
import { PatientPortalRepository } from "../persistence/patient-portal.repository";
import type { PatientProfileUpdateDto } from "./patient-profile.schemas";

@Injectable()
export class PatientProfileService {
  constructor(
    private readonly repo: PatientPortalRepository,
    private readonly audit: PatientPortalAuditService,
  ) {}

  async getProfile(principal: PatientPortalPrincipal) {
    const account = await this.repo.findAccountById(principal.portalAccountId);
    if (!account || account.status !== "ACTIVE") {
      throw new NotFoundException("Patient portal account not found");
    }

    return this.toProfile(account);
  }

  async updateProfile(
    principal: PatientPortalPrincipal,
    input: PatientProfileUpdateDto,
  ) {
    const account = input.preferredLanguage
      ? await this.repo.updatePreferredLanguage(
          principal.portalAccountId,
          input.preferredLanguage,
        )
      : await this.repo.findAccountById(principal.portalAccountId);

    if (!account || account.status !== "ACTIVE") {
      throw new NotFoundException("Patient portal account not found");
    }

    await this.audit.record("PATIENT_PORTAL_PROFILE_UPDATE", "PatientPortalAccount", {
      portalAccountId: principal.portalAccountId,
      sessionId: principal.sessionId,
      entityId: principal.portalAccountId,
      metadata: {
        fields: input.preferredLanguage ? ["preferredLanguage"] : [],
      },
      critical: true,
    });

    return this.toProfile(account);
  }

  private toProfile(account: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    dob: Date;
    preferredLanguage: string;
    emailVerifiedAt: Date | null;
    phoneVerifiedAt: Date | null;
  }) {
    return {
      id: account.id,
      firstName: account.firstName,
      lastName: account.lastName,
      dateOfBirth: account.dob.toISOString().slice(0, 10),
      email: account.email,
      phone: account.phone,
      preferredLanguage: account.preferredLanguage,
      emailVerified: account.emailVerifiedAt !== null,
      phoneVerified: account.phoneVerifiedAt !== null,
      contactChangesRequireVerification: true,
    };
  }
}
