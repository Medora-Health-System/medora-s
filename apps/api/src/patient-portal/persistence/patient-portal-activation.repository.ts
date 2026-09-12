import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";

export type PatientPortalActivationRow = {
  id: string;
  patientId: string;
  facilityId: string;
  secretHash: string;
  createdByUserId: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
};

@Injectable()
export class PatientPortalActivationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async assertPatientBelongsToFacility(patientId: string, facilityId: string): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "Patient"
      WHERE "id" = ${patientId}
        AND "facilityId" = ${facilityId}
      LIMIT 1
    `);
    return rows.length === 1;
  }

  async createActivation(input: {
    id: string;
    patientId: string;
    facilityId: string;
    secretHash: string;
    createdByUserId: string;
    expiresAt: Date;
  }): Promise<PatientPortalActivationRow> {
    const rows = await this.prisma.$queryRaw<PatientPortalActivationRow[]>(Prisma.sql`
      INSERT INTO "PatientPortalActivation" (
        "id", "patientId", "facilityId", "secretHash", "createdByUserId", "expiresAt"
      ) VALUES (
        ${input.id}, ${input.patientId}, ${input.facilityId}, ${input.secretHash},
        ${input.createdByUserId}, ${input.expiresAt}
      )
      RETURNING
        "id", "patientId", "facilityId", "secretHash", "createdByUserId",
        "createdAt", "expiresAt", "usedAt", "revokedAt"
    `);
    return rows[0]!;
  }

  async findUsableActivation(id: string): Promise<PatientPortalActivationRow | null> {
    const rows = await this.prisma.$queryRaw<PatientPortalActivationRow[]>(Prisma.sql`
      SELECT
        "id", "patientId", "facilityId", "secretHash", "createdByUserId",
        "createdAt", "expiresAt", "usedAt", "revokedAt"
      FROM "PatientPortalActivation"
      WHERE "id" = ${id}
        AND "usedAt" IS NULL
        AND "revokedAt" IS NULL
        AND "expiresAt" > CURRENT_TIMESTAMP
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async consumeAndLink(input: {
    activationId: string;
    portalAccountId: string;
    patientId: string;
    facilityId: string;
  }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const consumed = await tx.$executeRaw(Prisma.sql`
        UPDATE "PatientPortalActivation"
        SET "usedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${input.activationId}
          AND "patientId" = ${input.patientId}
          AND "facilityId" = ${input.facilityId}
          AND "usedAt" IS NULL
          AND "revokedAt" IS NULL
          AND "expiresAt" > CURRENT_TIMESTAMP
      `);
      if (consumed !== 1) return false;

      const patientRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "Patient"
        WHERE "id" = ${input.patientId}
          AND "facilityId" = ${input.facilityId}
        LIMIT 1
      `);
      if (patientRows.length !== 1) {
        throw new Error("PATIENT_PORTAL_PATIENT_FACILITY_MISMATCH");
      }

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "PatientPortalLink" (
          "id", "portalAccountId", "patientId", "facilityId", "status",
          "verificationMethod", "verifiedAt"
        ) VALUES (
          ${randomUUID()}, ${input.portalAccountId}, ${input.patientId}, ${input.facilityId},
          'VERIFIED'::"PatientPortalLinkStatus",
          'FACILITY_ACTIVATION_CODE'::"PatientPortalVerificationMethod",
          CURRENT_TIMESTAMP
        )
        ON CONFLICT ("portalAccountId", "patientId", "facilityId")
        DO UPDATE SET
          "status" = 'VERIFIED'::"PatientPortalLinkStatus",
          "verificationMethod" = 'FACILITY_ACTIVATION_CODE'::"PatientPortalVerificationMethod",
          "verifiedAt" = CURRENT_TIMESTAMP,
          "revokedAt" = NULL,
          "updatedAt" = CURRENT_TIMESTAMP
      `);

      await tx.$executeRaw(Prisma.sql`
        UPDATE "PatientPortalAccount"
        SET "status" = 'ACTIVE'::"PatientPortalAccountStatus",
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${input.portalAccountId}
          AND "status" IN (
            'PENDING_VERIFICATION'::"PatientPortalAccountStatus",
            'ACTIVE'::"PatientPortalAccountStatus"
          )
      `);

      return true;
    });
  }
}
