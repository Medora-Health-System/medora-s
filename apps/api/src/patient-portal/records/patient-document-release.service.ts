import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { AuditService } from "../../common/services/audit.service";
import { PrismaService } from "../../prisma/prisma.service";

type StaffActor = {
  userId: string;
  facilityId: string;
  ip?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class PatientDocumentReleaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async release(documentId: string, actor: StaffActor) {
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.enterpriseDocument.findFirst({
        where: {
          id: documentId,
          facilityId: actor.facilityId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          patientId: true,
          facilityId: true,
          category: true,
          type: true,
        },
      });
      if (!document?.patientId || document.facilityId !== actor.facilityId) {
        throw new NotFoundException("Document not found");
      }

      const patient = await tx.patient.findFirst({
        where: { id: document.patientId, facilityId: actor.facilityId },
        select: { id: true },
      });
      if (!patient) throw new NotFoundException("Document not found");

      const releaseId = randomUUID();
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "PatientDocumentRelease" (
          "id", "documentId", "patientId", "facilityId", "releasedByUserId",
          "releasedAt", "revokedByUserId", "revokedAt", "createdAt", "updatedAt"
        ) VALUES (
          ${releaseId}, ${document.id}, ${document.patientId}, ${actor.facilityId}, ${actor.userId},
          CURRENT_TIMESTAMP, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT ("documentId") DO UPDATE SET
          "patientId" = EXCLUDED."patientId",
          "facilityId" = EXCLUDED."facilityId",
          "releasedByUserId" = EXCLUDED."releasedByUserId",
          "releasedAt" = CURRENT_TIMESTAMP,
          "revokedByUserId" = NULL,
          "revokedAt" = NULL,
          "updatedAt" = CURRENT_TIMESTAMP
      `);

      await this.audit.log(AuditAction.UPDATE, "PATIENT_DOCUMENT_RELEASE", {
        tx,
        critical: true,
        userId: actor.userId,
        facilityId: actor.facilityId,
        patientId: document.patientId,
        entityId: document.id,
        ip: actor.ip ?? undefined,
        userAgent: actor.userAgent ?? undefined,
        metadata: {
          operation: "RELEASE",
          documentCategory: document.category,
          documentType: document.type,
        },
      });

      return {
        documentId: document.id,
        patientId: document.patientId,
        facilityId: actor.facilityId,
        released: true,
      };
    });
  }

  async revoke(documentId: string, actor: StaffActor) {
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.enterpriseDocument.findFirst({
        where: {
          id: documentId,
          facilityId: actor.facilityId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          patientId: true,
          facilityId: true,
          category: true,
          type: true,
        },
      });
      if (!document?.patientId || document.facilityId !== actor.facilityId) {
        throw new NotFoundException("Document not found");
      }

      const patient = await tx.patient.findFirst({
        where: { id: document.patientId, facilityId: actor.facilityId },
        select: { id: true },
      });
      if (!patient) throw new NotFoundException("Document not found");

      // Upsert a revoked row so staff can explicitly suppress even a finalized registration
      // packet that would otherwise be visible through the automatic release policy.
      const releaseId = randomUUID();
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "PatientDocumentRelease" (
          "id", "documentId", "patientId", "facilityId", "releasedByUserId",
          "releasedAt", "revokedByUserId", "revokedAt", "createdAt", "updatedAt"
        ) VALUES (
          ${releaseId}, ${document.id}, ${document.patientId}, ${actor.facilityId}, NULL,
          CURRENT_TIMESTAMP, ${actor.userId}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT ("documentId") DO UPDATE SET
          "patientId" = EXCLUDED."patientId",
          "facilityId" = EXCLUDED."facilityId",
          "revokedByUserId" = EXCLUDED."revokedByUserId",
          "revokedAt" = CURRENT_TIMESTAMP,
          "updatedAt" = CURRENT_TIMESTAMP
      `);

      await this.audit.log(AuditAction.UPDATE, "PATIENT_DOCUMENT_RELEASE", {
        tx,
        critical: true,
        userId: actor.userId,
        facilityId: actor.facilityId,
        patientId: document.patientId,
        entityId: document.id,
        ip: actor.ip ?? undefined,
        userAgent: actor.userAgent ?? undefined,
        metadata: {
          operation: "REVOKE",
          documentCategory: document.category,
          documentType: document.type,
        },
      });

      return {
        documentId: document.id,
        patientId: document.patientId,
        facilityId: actor.facilityId,
        released: false,
      };
    });
  }
}
