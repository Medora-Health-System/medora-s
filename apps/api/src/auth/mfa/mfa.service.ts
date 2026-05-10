import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuditAction, RoleCode, type User } from "@prisma/client";
import { toDataURL as qrcodeToDataURL } from "qrcode";

import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../common/services/audit.service";
import { createStructuredLogger } from "../../common/logging/structured-logger";

import {
  decryptMfaSecret,
  encryptMfaSecret,
  getMfaEncryptionKey,
  MfaEncryptionKeyMissingError,
} from "./mfa-encryption.util";
import {
  buildOtpAuthUri,
  generateTotpSecret,
  verifyTotpAndGetStep,
} from "./mfa-totp.util";
import {
  findMatchingRecoveryIndex,
  generateRecoveryCodes,
  hashRecoveryCodes,
  parseStoredRecoveryCodes,
  type StoredRecoveryCode,
} from "./mfa-recovery-codes.util";
import {
  MFA_CHALLENGE_TTL,
  MFA_CHALLENGE_TYPE,
  MFA_ENROLLMENT_TTL,
  MFA_ENROLLMENT_TYPE,
  type MfaGrantPayload,
  signMfaGrant,
  verifyMfaGrant,
} from "./mfa-challenge.util";
import { isMfaRequiredForRoles } from "./mfa-required-roles.util";

const log = createStructuredLogger("MfaService");

export const MFA_REQUIRED_BUT_NOT_ENROLLED = "MFA_REQUIRED_BUT_NOT_ENROLLED" as const;
export const MFA_NOT_ENABLED = "MFA_NOT_ENABLED" as const;
export const MFA_ALREADY_ENABLED = "MFA_ALREADY_ENABLED" as const;
export const MFA_INVALID_CODE = "MFA_INVALID_CODE" as const;
export const MFA_REPLAY_DETECTED = "MFA_REPLAY_DETECTED" as const;
export const MFA_GRANT_INVALID = "MFA_GRANT_INVALID" as const;

export type MfaUserSnapshot = {
  userId: string;
  facilityIds: string[];
  rolesByFacility: Record<string, RoleCode[]>;
};

/** Audit metadata is intentionally restricted to PHI-safe keys. */
type MfaAuditMeta = {
  userId: string;
  facilityId?: string;
  method?: "totp" | "recovery_code";
  success?: boolean;
  reason?: string;
  /** Roles snapshot only as enum codes. */
  roles?: RoleCode[];
};

@Injectable()
export class MfaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService
  ) {}

  /* ---------- Configuration helpers ---------- */

  private refreshSecret(): string {
    const s = this.config.get<string>("JWT_REFRESH_SECRET");
    if (!s) throw new Error("JWT_REFRESH_SECRET is required for MFA grants");
    return s;
  }

  private issuer(): string {
    return this.config.get<string>("TOKEN_ISSUER") ?? "medora-s";
  }

  private nodeEnv(): string {
    return this.config.get<string>("NODE_ENV") ?? process.env.NODE_ENV ?? "development";
  }

  /* ---------- Public read helpers ---------- */

  async getUserMfaSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        mfaEnabled: true,
        mfaEnabledAt: true,
        mfaLastVerifiedAt: true,
        mfaRecoveryCodesHash: true,
      },
    });
    if (!user) throw new NotFoundException("Utilisateur introuvable.");
    const codes = parseStoredRecoveryCodes(user.mfaRecoveryCodesHash) ?? [];
    const remaining = codes.filter((c) => !c.usedAt).length;
    return {
      enabled: user.mfaEnabled,
      enabledAt: user.mfaEnabledAt,
      lastVerifiedAt: user.mfaLastVerifiedAt,
      recoveryCodesRemaining: remaining,
    };
  }

  /**
   * For AuthService.login: decide what the post-password-step output is.
   *   * `full` — issue normal session
   *   * `mfa_challenge` — issue MFA verify token
   *   * `mfa_enrollment` — force enrollment because role requires MFA
   */
  decideLoginPath(user: Pick<User, "id" | "email" | "mfaEnabled">, roles: RoleCode[]): {
    next: "full" | "mfa_challenge" | "mfa_enrollment";
  } {
    const required = isMfaRequiredForRoles(roles.map((r) => ({ role: r })));
    if (user.mfaEnabled) return { next: "mfa_challenge" };
    if (required) return { next: "mfa_enrollment" };
    return { next: "full" };
  }

  issueChallengeToken(user: Pick<User, "id" | "email">): string {
    return signMfaGrant(
      this.jwt,
      {
        sub: user.id,
        username: user.email,
        iss: this.issuer(),
        type: MFA_CHALLENGE_TYPE,
        jti: cryptoRandomJti(),
      },
      this.refreshSecret(),
      MFA_CHALLENGE_TTL
    );
  }

  issueEnrollmentToken(user: Pick<User, "id" | "email">): string {
    return signMfaGrant(
      this.jwt,
      {
        sub: user.id,
        username: user.email,
        iss: this.issuer(),
        type: MFA_ENROLLMENT_TYPE,
        jti: cryptoRandomJti(),
      },
      this.refreshSecret(),
      MFA_ENROLLMENT_TTL
    );
  }

  verifyChallengeToken(token: string): MfaGrantPayload {
    return this.safeVerifyGrant(token, MFA_CHALLENGE_TYPE);
  }

  verifyEnrollmentToken(token: string): MfaGrantPayload {
    return this.safeVerifyGrant(token, MFA_ENROLLMENT_TYPE);
  }

  private safeVerifyGrant(
    token: string,
    expected: typeof MFA_CHALLENGE_TYPE | typeof MFA_ENROLLMENT_TYPE
  ): MfaGrantPayload {
    try {
      return verifyMfaGrant(this.jwt, token, this.refreshSecret(), this.issuer(), expected);
    } catch {
      throw new UnauthorizedException(MFA_GRANT_INVALID);
    }
  }

  /* ---------- Audit ---------- */

  async auditMfaEvent(
    action: AuditAction,
    meta: MfaAuditMeta,
    options: { critical?: boolean } = {}
  ): Promise<void> {
    await this.audit.log(action, "USER_MFA", {
      userId: meta.userId,
      facilityId: meta.facilityId,
      entityId: meta.userId,
      critical: options.critical ?? false,
      metadata: {
        userId: meta.userId,
        method: meta.method,
        success: meta.success,
        reason: meta.reason,
        roles: meta.roles,
      },
    });
  }

  /* ---------- Encryption gate (production fail-closed mirror of CHART_EXPORT_SIGNING_SECRET pattern) ---------- */

  private getEncryptionKeyOrFail(): Buffer {
    const key = getMfaEncryptionKey(process.env);
    if (key) return key;
    throw new InternalServerErrorException(
      "MFA encryption key is not configured. Set MFA_SECRET_ENCRYPTION_KEY."
    );
  }

  /* ---------- Enrollment ---------- */

  async beginEnrollment(userId: string): Promise<{
    otpauthUri: string;
    qrCodeDataUrl: string;
    issuer: string;
    accountLabel: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, mfaEnabled: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Utilisateur invalide.");
    }
    if (user.mfaEnabled) {
      throw new ConflictException(MFA_ALREADY_ENABLED);
    }

    const key = this.getEncryptionKeyOrFail();
    const secret = generateTotpSecret();
    const encrypted = encryptMfaSecret(key, secret);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        mfaSecretEncrypted: encrypted,
        // mfaEnabled stays false until verify; codes/timestamps cleared so a
        // re-init from a half-finished enrollment doesn't carry old state.
        mfaRecoveryCodesHash: null as unknown as object,
        mfaLastVerifiedAt: null,
        mfaLastUsedStep: null,
      },
    });

    await this.auditMfaEvent(AuditAction.MFA_ENROLLMENT_INIT, {
      userId: user.id,
    });

    const otpauthUri = buildOtpAuthUri(user.email, secret);
    const qrCodeDataUrl = await qrcodeToDataURL(otpauthUri, { errorCorrectionLevel: "M" });

    return {
      otpauthUri,
      qrCodeDataUrl,
      issuer: "Medora-S",
      accountLabel: user.email,
    };
  }

  async confirmEnrollment(
    userId: string,
    code: string
  ): Promise<{
    enabled: true;
    recoveryCodes: string[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, mfaEnabled: true, mfaSecretEncrypted: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Utilisateur invalide.");
    }
    if (user.mfaEnabled) {
      throw new ConflictException(MFA_ALREADY_ENABLED);
    }
    if (!user.mfaSecretEncrypted) {
      throw new BadRequestException("Aucune session d'inscription en cours.");
    }

    const key = this.getEncryptionKeyOrFail();
    let secret: string;
    try {
      secret = decryptMfaSecret(key, user.mfaSecretEncrypted);
    } catch {
      throw new InternalServerErrorException("Impossible de lire le secret MFA.");
    }
    const step = verifyTotpAndGetStep(secret, code);
    if (step == null) {
      await this.auditMfaEvent(AuditAction.MFA_LOGIN_FAILURE, {
        userId: user.id,
        method: "totp",
        success: false,
        reason: "enrollment_invalid_code",
      });
      throw new UnauthorizedException(MFA_INVALID_CODE);
    }

    const codes = generateRecoveryCodes();
    const hashed = await hashRecoveryCodes(codes);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: true,
        mfaEnabledAt: new Date(),
        mfaLastVerifiedAt: new Date(),
        mfaLastUsedStep: BigInt(step),
        mfaRecoveryCodesHash: hashed as unknown as object,
      },
    });

    await this.auditMfaEvent(AuditAction.MFA_ENABLED, {
      userId: user.id,
      method: "totp",
      success: true,
    });

    return { enabled: true, recoveryCodes: codes };
  }

  /* ---------- Login challenge verification ---------- */

  async verifyLoginChallenge(
    userId: string,
    code: string | undefined,
    recoveryCode: string | undefined
  ): Promise<{ method: "totp" | "recovery_code" }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        mfaEnabled: true,
        mfaSecretEncrypted: true,
        mfaRecoveryCodesHash: true,
        mfaLastUsedStep: true,
        isActive: true,
      },
    });
    if (!user || !user.isActive || !user.mfaEnabled) {
      throw new UnauthorizedException(MFA_NOT_ENABLED);
    }

    if (recoveryCode) {
      const stored = parseStoredRecoveryCodes(user.mfaRecoveryCodesHash) ?? [];
      const idx = await findMatchingRecoveryIndex(recoveryCode, stored);
      if (idx == null) {
        await this.auditMfaEvent(AuditAction.MFA_LOGIN_FAILURE, {
          userId: user.id,
          method: "recovery_code",
          success: false,
          reason: "invalid_recovery_code",
        });
        throw new UnauthorizedException(MFA_INVALID_CODE);
      }
      const next = stored.slice();
      next[idx] = { ...next[idx]!, usedAt: new Date().toISOString() };
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          mfaRecoveryCodesHash: next as unknown as object,
          mfaLastVerifiedAt: new Date(),
        },
      });
      await this.auditMfaEvent(AuditAction.MFA_RECOVERY_CODE_USED, {
        userId: user.id,
        method: "recovery_code",
        success: true,
      });
      await this.auditMfaEvent(AuditAction.MFA_LOGIN_SUCCESS, {
        userId: user.id,
        method: "recovery_code",
        success: true,
      });
      return { method: "recovery_code" };
    }

    if (!code) {
      throw new BadRequestException("Code TOTP requis.");
    }
    if (!user.mfaSecretEncrypted) {
      throw new InternalServerErrorException("Configuration MFA introuvable.");
    }
    const key = this.getEncryptionKeyOrFail();
    let secret: string;
    try {
      secret = decryptMfaSecret(key, user.mfaSecretEncrypted);
    } catch {
      throw new InternalServerErrorException("Impossible de lire le secret MFA.");
    }
    const step = verifyTotpAndGetStep(secret, code);
    if (step == null) {
      await this.auditMfaEvent(AuditAction.MFA_LOGIN_FAILURE, {
        userId: user.id,
        method: "totp",
        success: false,
        reason: "invalid_code",
      });
      throw new UnauthorizedException(MFA_INVALID_CODE);
    }
    const last = user.mfaLastUsedStep == null ? null : Number(user.mfaLastUsedStep);
    if (last != null && step <= last) {
      await this.auditMfaEvent(AuditAction.MFA_LOGIN_FAILURE, {
        userId: user.id,
        method: "totp",
        success: false,
        reason: "replay",
      });
      throw new UnauthorizedException(MFA_REPLAY_DETECTED);
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        mfaLastUsedStep: BigInt(step),
        mfaLastVerifiedAt: new Date(),
      },
    });
    await this.auditMfaEvent(AuditAction.MFA_LOGIN_SUCCESS, {
      userId: user.id,
      method: "totp",
      success: true,
    });
    return { method: "totp" };
  }

  /* ---------- User-driven disable / regenerate ---------- */

  async disable(userId: string, code: string): Promise<{ disabled: true }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        mfaEnabled: true,
        mfaSecretEncrypted: true,
        mfaLastUsedStep: true,
      },
    });
    if (!user || !user.mfaEnabled || !user.mfaSecretEncrypted) {
      throw new ConflictException(MFA_NOT_ENABLED);
    }
    const key = this.getEncryptionKeyOrFail();
    const secret = decryptMfaSecret(key, user.mfaSecretEncrypted);
    const step = verifyTotpAndGetStep(secret, code);
    if (step == null) {
      await this.auditMfaEvent(AuditAction.MFA_LOGIN_FAILURE, {
        userId: user.id,
        method: "totp",
        success: false,
        reason: "disable_invalid_code",
      });
      throw new UnauthorizedException(MFA_INVALID_CODE);
    }
    const last = user.mfaLastUsedStep == null ? null : Number(user.mfaLastUsedStep);
    if (last != null && step <= last) {
      throw new UnauthorizedException(MFA_REPLAY_DETECTED);
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaEnabledAt: null,
        mfaRecoveryCodesHash: null as unknown as object,
        mfaLastUsedStep: null,
        mfaLastVerifiedAt: null,
      },
    });
    await this.auditMfaEvent(AuditAction.MFA_DISABLED, {
      userId: user.id,
      method: "totp",
      success: true,
    });
    return { disabled: true };
  }

  async regenerateRecoveryCodes(userId: string, code: string): Promise<{ recoveryCodes: string[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        mfaEnabled: true,
        mfaSecretEncrypted: true,
        mfaLastUsedStep: true,
      },
    });
    if (!user || !user.mfaEnabled || !user.mfaSecretEncrypted) {
      throw new ConflictException(MFA_NOT_ENABLED);
    }
    const key = this.getEncryptionKeyOrFail();
    const secret = decryptMfaSecret(key, user.mfaSecretEncrypted);
    const step = verifyTotpAndGetStep(secret, code);
    if (step == null) throw new UnauthorizedException(MFA_INVALID_CODE);
    const last = user.mfaLastUsedStep == null ? null : Number(user.mfaLastUsedStep);
    if (last != null && step <= last) throw new UnauthorizedException(MFA_REPLAY_DETECTED);

    const codes = generateRecoveryCodes();
    const hashed: StoredRecoveryCode[] = await hashRecoveryCodes(codes);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        mfaRecoveryCodesHash: hashed as unknown as object,
        mfaLastUsedStep: BigInt(step),
        mfaLastVerifiedAt: new Date(),
      },
    });
    await this.auditMfaEvent(AuditAction.MFA_RECOVERY_CODES_REGENERATED, {
      userId: user.id,
      success: true,
    });
    return { recoveryCodes: codes };
  }

  /* ---------- Admin reset ---------- */

  async adminReset(
    actor: { userId: string; facilityId: string; role: RoleCode },
    targetUserId: string
  ): Promise<{ reset: true; sessionsRevoked: number }> {
    if (actor.userId === targetUserId) {
      throw new ForbiddenException("Un administrateur ne peut pas réinitialiser sa propre MFA.");
    }
    if (
      actor.role !== RoleCode.ADMIN &&
      actor.role !== RoleCode.MEDORA_SUPER_ADMIN
    ) {
      throw new ForbiddenException("Action réservée aux administrateurs.");
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        userRoles: {
          where: { isActive: true, facility: { isActive: true } },
          select: { facilityId: true, role: { select: { code: true } } },
        },
      },
    });
    if (!target) throw new NotFoundException("Utilisateur introuvable.");

    if (actor.role === RoleCode.ADMIN) {
      const sharesFacility = target.userRoles.some(
        (ur) => ur.facilityId === actor.facilityId
      );
      if (!sharesFacility) {
        throw new ForbiddenException(
          "Réinitialisation MFA uniquement pour les utilisateurs de votre établissement."
        );
      }
    }

    const revoked = await this.prisma.authSession.updateMany({
      where: { userId: targetUserId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: "mfa_reset_by_admin" },
    });
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaEnabledAt: null,
        mfaRecoveryCodesHash: null as unknown as object,
        mfaLastUsedStep: null,
        mfaLastVerifiedAt: null,
        refreshTokenHash: null,
      },
    });

    await this.audit.log(AuditAction.MFA_RESET_BY_ADMIN, "USER_MFA", {
      userId: actor.userId,
      facilityId: actor.facilityId,
      entityId: targetUserId,
      critical: true,
      metadata: {
        actorUserId: actor.userId,
        actorRole: actor.role,
        targetUserId,
        sessionsRevoked: revoked.count,
        targetRoles: target.userRoles.map((ur) => ur.role.code),
      },
    });

    log.warn("mfa_reset_by_admin", {
      actorUserId: actor.userId,
      targetUserId,
      sessionsRevoked: revoked.count,
    });

    return { reset: true, sessionsRevoked: revoked.count };
  }
}

function cryptoRandomJti(): string {
  // Imported lazily to keep top-level imports minimal; randomUUID is built-in.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { randomUUID } = require("node:crypto") as typeof import("node:crypto");
  return randomUUID();
}

export function isMfaEncryptionKeyMissing(error: unknown): boolean {
  return error instanceof MfaEncryptionKeyMissingError;
}
