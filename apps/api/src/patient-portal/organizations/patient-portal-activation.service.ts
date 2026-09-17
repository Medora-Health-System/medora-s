import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import { randomBytes, randomUUID } from "crypto";
import { MailDeliveryError, MailNotConfiguredError, OutboundMailService } from "../../common/mail/outbound-mail.service";
import { PatientPortalAuditService } from "../patient-portal-audit.service";
import { PatientPortalActivationRepository } from "../persistence/patient-portal-activation.repository";
import { PatientPortalRepository } from "../persistence/patient-portal.repository";
import {
  EMAIL_INVITATION_TTL_MS,
  INVITATION_SEND_FAILED_MESSAGE,
  MANUAL_ACTIVATION_TTL_MS,
  PATIENT_EMAIL_REQUIRED_MESSAGE,
  PATIENT_PORTAL_ACTIVATION_CHANNEL,
  buildPatientInvitationUrl,
  invitationEmailsMatch,
  maskPatientEmail,
  type PatientPortalActivationChannel,
} from "./patient-portal-activation.constants";

@Injectable()
export class PatientPortalActivationService {
  constructor(
    private readonly activations: PatientPortalActivationRepository,
    private readonly portalRepo: PatientPortalRepository,
    private readonly audit: PatientPortalAuditService,
    private readonly mail: OutboundMailService,
    private readonly config: ConfigService,
  ) {}

  async issueForStaff(input: {
    patientId: string;
    facilityId: string;
    createdByUserId: string;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    const issued = await this.issueActivation({
      ...input,
      channel: PATIENT_PORTAL_ACTIVATION_CHANNEL.MANUAL_CODE,
      ttlMs: MANUAL_ACTIVATION_TTL_MS,
    });

    return {
      activationCode: issued.activationCode,
      expiresAt: issued.expiresAt.toISOString(),
      patientId: input.patientId,
      facilityId: input.facilityId,
    };
  }

  async inviteForStaff(input: {
    patientId: string;
    facilityId: string;
    createdByUserId: string;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    if (!(await this.activations.assertPatientBelongsToFacility(input.patientId, input.facilityId))) {
      throw new NotFoundException("Patient not found at this facility");
    }

    const email = await this.activations.getPatientEmail(input.patientId, input.facilityId);
    if (!email) {
      throw new BadRequestException(PATIENT_EMAIL_REQUIRED_MESSAGE);
    }

    if (!this.mail.isConfigured()) {
      throw new ServiceUnavailableException(INVITATION_SEND_FAILED_MESSAGE);
    }

    const baseUrl = this.patientAppBaseUrl();
    const issued = await this.issueActivation({
      ...input,
      channel: PATIENT_PORTAL_ACTIVATION_CHANNEL.EMAIL_INVITATION,
      ttlMs: EMAIL_INVITATION_TTL_MS,
    });

    const invitationUrl = buildPatientInvitationUrl(baseUrl, issued.activationCode);
    try {
      await this.mail.send({
        to: email,
        subject: "Activate your Medora Patient account",
        text: [
          "You have been invited to activate your Medora Patient account.",
          "",
          "Open this link to continue:",
          invitationUrl,
          "",
          "This invitation expires in 24 hours. If you did not expect this message, you can ignore it.",
        ].join("\n"),
      });
    } catch (error) {
      await this.activations.revokeUnusedActivation(issued.activationId);
      if (error instanceof MailNotConfiguredError || error instanceof MailDeliveryError) {
        throw new ServiceUnavailableException(INVITATION_SEND_FAILED_MESSAGE);
      }
      throw new ServiceUnavailableException(INVITATION_SEND_FAILED_MESSAGE);
    }

    await this.audit.record("PATIENT_PORTAL_INVITATION_SENT", "PATIENT_PORTAL_ACTIVATION", {
      facilityId: input.facilityId,
      patientId: input.patientId,
      entityId: issued.activationId,
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: {
        createdByUserId: input.createdByUserId,
        channel: PATIENT_PORTAL_ACTIVATION_CHANNEL.EMAIL_INVITATION,
        delivery: "EMAIL",
      },
      critical: true,
    });

    return {
      status: "SENT",
      delivery: "EMAIL",
      maskedEmail: maskPatientEmail(email),
      expiresAt: issued.expiresAt.toISOString(),
      patientId: input.patientId,
      facilityId: input.facilityId,
    };
  }

  async getAccessForStaff(input: { patientId: string; facilityId: string }) {
    if (!(await this.activations.assertPatientBelongsToFacility(input.patientId, input.facilityId))) {
      throw new NotFoundException("Patient not found at this facility");
    }

    const row = await this.activations.getStaffAccess(input.patientId, input.facilityId);
    const activationState = !row.latestActivationId
      ? "NONE"
      : row.activationRevokedAt
        ? "REVOKED"
        : row.activationUsedAt
          ? "USED"
          : row.activationExpiresAt && row.activationExpiresAt.getTime() <= Date.now()
            ? "EXPIRED"
            : "PENDING";
    const patientEmail = row.patientEmail?.trim() || null;

    return {
      patientId: input.patientId,
      facilityId: input.facilityId,
      accessStatus: row.linkStatus ?? "NOT_LINKED",
      accountStatus: row.accountStatus,
      verifiedAt: row.verifiedAt?.toISOString() ?? null,
      revokedAt: row.revokedAt?.toISOString() ?? null,
      hasEmail: Boolean(patientEmail),
      maskedEmail: patientEmail ? maskPatientEmail(patientEmail) : null,
      latestActivation: row.latestActivationId
        ? {
            state: activationState,
            channel: row.activationChannel,
            createdAt: row.activationCreatedAt?.toISOString() ?? null,
            expiresAt: row.activationExpiresAt?.toISOString() ?? null,
          }
        : null,
    };
  }

  async revokeForStaff(input: {
    patientId: string;
    facilityId: string;
    revokedByUserId: string;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    if (!(await this.activations.assertPatientBelongsToFacility(input.patientId, input.facilityId))) {
      throw new NotFoundException("Patient not found at this facility");
    }

    const result = await this.activations.revokePatientFacilityAccess(input.patientId, input.facilityId);

    await this.audit.record("PATIENT_PORTAL_ACCESS_REVOKED", "PATIENT_PORTAL_LINK", {
      facilityId: input.facilityId,
      patientId: input.patientId,
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: {
        revokedByUserId: input.revokedByUserId,
        revokedLinks: result.revokedLinks,
        revokedActivations: result.revokedActivations,
      },
      critical: true,
    });

    return {
      revoked: true,
      patientId: input.patientId,
      facilityId: input.facilityId,
      revokedLinks: result.revokedLinks,
      revokedActivations: result.revokedActivations,
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

    if (activation.channel === PATIENT_PORTAL_ACTIVATION_CHANNEL.EMAIL_INVITATION) {
      const patientEmail = await this.activations.getPatientEmail(activation.patientId, activation.facilityId);
      if (!invitationEmailsMatch(patientEmail, account.email)) {
        throw new ForbiddenException("Activation code invalid or expired");
      }
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
      metadata: {
        verificationMethod: "FACILITY_ACTIVATION_CODE",
        channel: activation.channel,
      },
      critical: true,
    });

    return {
      activated: true,
      accountId: account.id,
      facilityId: activation.facilityId,
    };
  }

  private async issueActivation(input: {
    patientId: string;
    facilityId: string;
    createdByUserId: string;
    ip?: string | null;
    userAgent?: string | null;
    channel: PatientPortalActivationChannel;
    ttlMs: number;
  }) {
    if (!(await this.activations.assertPatientBelongsToFacility(input.patientId, input.facilityId))) {
      throw new NotFoundException("Patient not found at this facility");
    }

    const activationId = randomUUID();
    const secret = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + input.ttlMs);
    await this.activations.createActivation({
      id: activationId,
      patientId: input.patientId,
      facilityId: input.facilityId,
      secretHash: await argon2.hash(secret),
      createdByUserId: input.createdByUserId,
      expiresAt,
      channel: input.channel,
    });

    await this.audit.record("PATIENT_PORTAL_ACTIVATION_ISSUED", "PATIENT_PORTAL_ACTIVATION", {
      facilityId: input.facilityId,
      patientId: input.patientId,
      entityId: activationId,
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: { createdByUserId: input.createdByUserId, channel: input.channel },
      critical: true,
    });

    return {
      activationId,
      activationCode: `${activationId}.${secret}`,
      expiresAt,
    };
  }

  private patientAppBaseUrl(): string {
    const url = this.config.get<string>("PATIENT_APP_BASE_URL")?.trim();
    if (!url) {
      throw new ServiceUnavailableException(INVITATION_SEND_FAILED_MESSAGE);
    }
    if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/i.test(url)) {
      throw new ServiceUnavailableException(INVITATION_SEND_FAILED_MESSAGE);
    }
    return url;
  }
}
