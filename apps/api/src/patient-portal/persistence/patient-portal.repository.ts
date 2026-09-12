import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

export type PatientPortalAccountStatus =
  | "PENDING_VERIFICATION"
  | "ACTIVE"
  | "LOCKED"
  | "DISABLED";

export type PatientPortalLinkStatus = "PENDING" | "VERIFIED" | "REVOKED";

export type PatientPortalVerificationMethod =
  | "FACILITY_ACTIVATION_CODE"
  | "VERIFIED_PHONE"
  | "VERIFIED_EMAIL"
  | "MRN_DOB"
  | "GOVERNMENT_ID"
  | "MANUAL_STAFF_VERIFICATION";

export type PatientPortalAccountRow = {
  id: string;
  email: string | null;
  phone: string | null;
  passwordHash: string;
  status: PatientPortalAccountStatus;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  firstName: string;
  lastName: string;
  dob: Date;
  preferredLanguage: string;
  failedLoginCount: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PatientPortalSessionRow = {
  id: string;
  portalAccountId: string;
  refreshTokenHash: string | null;
  deviceId: string | null;
  deviceName: string | null;
  userAgent: string | null;
  ipCreated: string | null;
  createdAt: Date;
  lastSeenAt: Date | null;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type PatientPortalVerifiedLinkRow = {
  id: string;
  portalAccountId: string;
  patientId: string;
  facilityId: string;
  status: PatientPortalLinkStatus;
  verificationMethod: PatientPortalVerificationMethod | null;
  verifiedAt: Date | null;
  revokedAt: Date | null;
  facilityName: string;
  facilityCountry: string;
  facilityTimezone: string;
  facilityDefaultLanguage: string;
};

@Injectable()
export class PatientPortalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAccountById(id: string): Promise<PatientPortalAccountRow | null> {
    const rows = await this.prisma.$queryRaw<PatientPortalAccountRow[]>(Prisma.sql`
      SELECT
        "id", "email", "phone", "passwordHash", "status"::text AS "status",
        "emailVerifiedAt", "phoneVerifiedAt", "firstName", "lastName", "dob",
        "preferredLanguage", "failedLoginCount", "lockedUntil", "lastLoginAt",
        "createdAt", "updatedAt"
      FROM "PatientPortalAccount"
      WHERE "id" = ${id}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async findAccountByIdentifier(identifier: string): Promise<PatientPortalAccountRow | null> {
    const normalized = identifier.trim().toLowerCase();
    const rows = await this.prisma.$queryRaw<PatientPortalAccountRow[]>(Prisma.sql`
      SELECT
        "id", "email", "phone", "passwordHash", "status"::text AS "status",
        "emailVerifiedAt", "phoneVerifiedAt", "firstName", "lastName", "dob",
        "preferredLanguage", "failedLoginCount", "lockedUntil", "lastLoginAt",
        "createdAt", "updatedAt"
      FROM "PatientPortalAccount"
      WHERE lower(COALESCE("email", '')) = ${normalized}
         OR "phone" = ${identifier.trim()}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async createAccount(input: {
    id: string;
    email: string | null;
    phone: string | null;
    passwordHash: string;
    firstName: string;
    lastName: string;
    dob: Date;
    preferredLanguage: "en" | "es" | "fr";
  }): Promise<PatientPortalAccountRow> {
    const rows = await this.prisma.$queryRaw<PatientPortalAccountRow[]>(Prisma.sql`
      INSERT INTO "PatientPortalAccount" (
        "id", "email", "phone", "passwordHash", "firstName", "lastName", "dob", "preferredLanguage"
      ) VALUES (
        ${input.id}, ${input.email}, ${input.phone}, ${input.passwordHash},
        ${input.firstName}, ${input.lastName}, ${input.dob}, ${input.preferredLanguage}
      )
      RETURNING
        "id", "email", "phone", "passwordHash", "status"::text AS "status",
        "emailVerifiedAt", "phoneVerifiedAt", "firstName", "lastName", "dob",
        "preferredLanguage", "failedLoginCount", "lockedUntil", "lastLoginAt",
        "createdAt", "updatedAt"
    `);
    return rows[0]!;
  }

  async updatePreferredLanguage(
    accountId: string,
    preferredLanguage: "en" | "es" | "fr",
  ): Promise<PatientPortalAccountRow | null> {
    const rows = await this.prisma.$queryRaw<PatientPortalAccountRow[]>(Prisma.sql`
      UPDATE "PatientPortalAccount"
      SET "preferredLanguage" = ${preferredLanguage},
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${accountId}
        AND "status" = 'ACTIVE'::"PatientPortalAccountStatus"
      RETURNING
        "id", "email", "phone", "passwordHash", "status"::text AS "status",
        "emailVerifiedAt", "phoneVerifiedAt", "firstName", "lastName", "dob",
        "preferredLanguage", "failedLoginCount", "lockedUntil", "lastLoginAt",
        "createdAt", "updatedAt"
    `);
    return rows[0] ?? null;
  }

  async markLoginSuccess(accountId: string): Promise<void> {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "PatientPortalAccount"
      SET "failedLoginCount" = 0,
          "lockedUntil" = NULL,
          "lastLoginAt" = CURRENT_TIMESTAMP,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${accountId}
    `);
  }

  async incrementFailedLogin(accountId: string): Promise<void> {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "PatientPortalAccount"
      SET "failedLoginCount" = "failedLoginCount" + 1,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${accountId}
    `);
  }

  async createSession(input: {
    id: string;
    portalAccountId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    deviceId?: string | null;
    deviceName?: string | null;
    userAgent?: string | null;
    ipCreated?: string | null;
  }): Promise<PatientPortalSessionRow> {
    const rows = await this.prisma.$queryRaw<PatientPortalSessionRow[]>(Prisma.sql`
      INSERT INTO "PatientPortalSession" (
        "id", "portalAccountId", "refreshTokenHash", "expiresAt",
        "deviceId", "deviceName", "userAgent", "ipCreated"
      ) VALUES (
        ${input.id}, ${input.portalAccountId}, ${input.refreshTokenHash}, ${input.expiresAt},
        ${input.deviceId ?? null}, ${input.deviceName ?? null}, ${input.userAgent ?? null}, ${input.ipCreated ?? null}
      )
      RETURNING
        "id", "portalAccountId", "refreshTokenHash", "deviceId", "deviceName",
        "userAgent", "ipCreated", "createdAt", "lastSeenAt", "expiresAt", "revokedAt"
    `);
    return rows[0]!;
  }

  async findActiveSession(sessionId: string, accountId: string): Promise<PatientPortalSessionRow | null> {
    const rows = await this.prisma.$queryRaw<PatientPortalSessionRow[]>(Prisma.sql`
      SELECT
        "id", "portalAccountId", "refreshTokenHash", "deviceId", "deviceName",
        "userAgent", "ipCreated", "createdAt", "lastSeenAt", "expiresAt", "revokedAt"
      FROM "PatientPortalSession"
      WHERE "id" = ${sessionId}
        AND "portalAccountId" = ${accountId}
        AND "revokedAt" IS NULL
        AND "expiresAt" > CURRENT_TIMESTAMP
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async rotateRefreshToken(sessionId: string, accountId: string, refreshTokenHash: string, expiresAt: Date): Promise<void> {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "PatientPortalSession"
      SET "refreshTokenHash" = ${refreshTokenHash},
          "expiresAt" = ${expiresAt},
          "lastSeenAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${sessionId}
        AND "portalAccountId" = ${accountId}
        AND "revokedAt" IS NULL
    `);
  }

  async revokeSession(sessionId: string, accountId: string): Promise<void> {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "PatientPortalSession"
      SET "revokedAt" = COALESCE("revokedAt", CURRENT_TIMESTAMP),
          "lastSeenAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${sessionId}
        AND "portalAccountId" = ${accountId}
    `);
  }

  async findVerifiedFacilityLink(portalAccountId: string, facilityId: string): Promise<PatientPortalVerifiedLinkRow | null> {
    const rows = await this.prisma.$queryRaw<PatientPortalVerifiedLinkRow[]>(Prisma.sql`
      SELECT
        l."id",
        l."portalAccountId",
        l."patientId",
        l."facilityId",
        l."status"::text AS "status",
        l."verificationMethod"::text AS "verificationMethod",
        l."verifiedAt",
        l."revokedAt",
        f."name" AS "facilityName",
        f."country" AS "facilityCountry",
        f."timezone" AS "facilityTimezone",
        f."defaultLanguage" AS "facilityDefaultLanguage"
      FROM "PatientPortalLink" l
      INNER JOIN "Facility" f ON f."id" = l."facilityId"
      INNER JOIN "Patient" p ON p."id" = l."patientId"
      WHERE l."portalAccountId" = ${portalAccountId}
        AND l."facilityId" = ${facilityId}
        AND l."status" = 'VERIFIED'::"PatientPortalLinkStatus"
        AND l."revokedAt" IS NULL
        AND f."isActive" = TRUE
        AND p."facilityId" = l."facilityId"
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async listVerifiedFacilityLinks(portalAccountId: string): Promise<PatientPortalVerifiedLinkRow[]> {
    return this.prisma.$queryRaw<PatientPortalVerifiedLinkRow[]>(Prisma.sql`
      SELECT
        l."id",
        l."portalAccountId",
        l."patientId",
        l."facilityId",
        l."status"::text AS "status",
        l."verificationMethod"::text AS "verificationMethod",
        l."verifiedAt",
        l."revokedAt",
        f."name" AS "facilityName",
        f."country" AS "facilityCountry",
        f."timezone" AS "facilityTimezone",
        f."defaultLanguage" AS "facilityDefaultLanguage"
      FROM "PatientPortalLink" l
      INNER JOIN "Facility" f ON f."id" = l."facilityId"
      INNER JOIN "Patient" p ON p."id" = l."patientId"
      WHERE l."portalAccountId" = ${portalAccountId}
        AND l."status" = 'VERIFIED'::"PatientPortalLinkStatus"
        AND l."revokedAt" IS NULL
        AND f."isActive" = TRUE
        AND p."facilityId" = l."facilityId"
      ORDER BY f."name" ASC, l."facilityId" ASC
    `);
  }

  async writeAudit(input: {
    id: string;
    portalAccountId?: string | null;
    sessionId?: string | null;
    facilityId?: string | null;
    patientId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }): Promise<void> {
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "PatientPortalAuditLog" (
        "id", "portalAccountId", "sessionId", "facilityId", "patientId",
        "action", "entityType", "entityId", "ip", "userAgent", "metadata"
      ) VALUES (
        ${input.id}, ${input.portalAccountId ?? null}, ${input.sessionId ?? null},
        ${input.facilityId ?? null}, ${input.patientId ?? null}, ${input.action},
        ${input.entityType}, ${input.entityId ?? null}, ${input.ip ?? null},
        ${input.userAgent ?? null}, ${input.metadata ? JSON.stringify(input.metadata) : null}::jsonb
      )
    `);
  }
}
