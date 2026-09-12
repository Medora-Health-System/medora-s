import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import { randomBytes, randomUUID } from "crypto";
import { PatientPortalAuditService } from "../patient-portal-audit.service";
import { PatientPortalActivationRepository } from "../persistence/patient-portal-activation.repository";
import { PatientPortalRepository } from "../persistence/patient-portal.repository";

@Injectable()
export class PatientPortalActivationService {
  constructor(
    private readonly activations: PatientPortalActivationRepository,
    private readonly portalRepo: PatientPortalRepository,
    private readonly audit: PatientPortalAuditService
  ) {}

  async issueForStaff(input: {
    patientId: string;
    facilityId: string;
    createdByUserId: string;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    if (!(await this.activations.assertPatientBelongsToFacility(input.patientId, input.facilityId))) {
      throw new NotFoundException("Patient not found at this facility");
    }

    const activationId = randomUUID();
    const secret = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await this.activations.createActivation({
      id: activationId,
      patientId: input.patientId,
      facilityId: input.facilityId,
      secretHash: await argon2.hash(secret),
      createdByUserId: input.createdByUserId,
      expiresAt,
    });

    await this.audit.record("PATIENT_PORTAL_ACTIVATION_ISSUED", "PATIENT_PORTAL_ACTIVATION", {
      facilityId: input.facilityId,
      patientId: input.patientId,
      entityId: activationId,
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: { createdByUserId: input.createdByUserId },
      critical: true,
    });

    return {
      activationCode: `${activationId}.${secret}`,
      expiresAt: expiresAt.toISOString(),
      patientId: input.patientId,
      facilityId: input.facilityId,
    };
  }

  async activate(input: {
    accountId: string;
    password: string;
    activationCode: string;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    const account = await this.portalRepo.findAccountById(input.accountId);
    if (!account || account.status === "DISABLED") {
      throw new UnauthorizedException("Invalid activation request");
    }
    if (!(await argon2.verify(account.passwordHash, input.password))) {
      throw new UnauthorizedException("Invalid activation request");
    }

    const dot = input.activationCode.indexOf(".");
    if (dot <= 0 || dot === input.activationCode.length - 1) {
      throw new BadRequestException("Invalid activation code");
    }
    const activationId = input.activationCode.slice(0, dot);
    const secret = input.activationCode.slice(dot + 1);
    const activation = await this.activations.findUsableActivation(activationId);
    if (!activation || !(await argon2.verify(activation.secretHash, secret))) {
      throw new ForbiddenException("Activation code invalid or expired");
    }

    const consumed = await this.activations.consumeAndLink({
      activationId: activation.id,
      portalAccountId: account.id,
      patientId: activation.patientId,
      facilityId: activation.facilityId,
    });
    if (!consumed) {
      throw new ForbiddenException("Activation code invalid or expired");
    }

    await this.audit.record("PATIENT_PORTAL_LINK_VERIFY", "PATIENT_PORTAL_LINK", {
      portalAccountId: account.id,
      facilityId: activation.facilityId,
      patientId: activation.patientId,
      entityId: activation.id,
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: { verificationMethod: "FACILITY_ACTIVATION_CODE" },
      critical: true,
    });

    return {
      activated: true,
      accountId: account.id,
      facilityId: activation.facilityId,
    };
  }
}
