import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { DocumentStorageService } from "../../documents/storage/document-storage.service";
import type { PatientPortalAccessContext } from "../auth/patient-portal.types";
import { PatientPortalAuditService } from "../patient-portal-audit.service";

type RequestContext = { ip?: string | null; userAgent?: string | null };

type PatientDocumentRow = {
  id: string;
  encounterId: string | null;
  category: string;
  type: string;
  title: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  pageCount: number | null;
  signatureStatus: string;
  lockedAt: Date | null;
  uploadedAt: Date;
  packetType: string | null;
  packetVersion: string | null;
  locale: string | null;
  finalizedAt: Date | null;
  releaseBasis: "AUTOMATIC_FINALIZED_REGISTRATION" | "EXPLICIT_RELEASE";
};

type PatientDocumentContentRow = PatientDocumentRow & {
  storagePath: string;
};

@Injectable()
export class PatientDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: DocumentStorageService,
    private readonly audit: PatientPortalAuditService,
  ) {}

  private documentProjection(row: PatientDocumentRow) {
    return {
      id: row.id,
      encounterId: row.encounterId,
      category: row.category,
      type: row.type,
      title: row.title,
      fileName: row.fileName,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      pageCount: row.pageCount,
      signatureStatus: row.signatureStatus,
      lockedAt: row.lockedAt?.toISOString() ?? null,
      uploadedAt: row.uploadedAt.toISOString(),
      packetType: row.packetType,
      packetVersion: row.packetVersion,
      locale: row.locale,
      finalizedAt: row.finalizedAt?.toISOString() ?? null,
      releaseBasis: row.releaseBasis,
    };
  }

  private visibleDocumentsSql(access: PatientPortalAccessContext, documentId?: string) {
    return Prisma.sql`
      SELECT
        d."id",
        d."encounterId",
        d."category",
        d."type",
        d."title",
        d."fileName",
        d."mimeType",
        d."fileSize",
        d."pageCount",
        d."signatureStatus"::text AS "signatureStatus",
        d."lockedAt",
        d."uploadedAt",
        ps."packetType",
        ps."packetVersion",
        ps."locale",
        ps."finalizedAt",
        CASE
          WHEN d."category" = 'REGISTRATION' AND ps."finalizedAt" IS NOT NULL
            THEN 'AUTOMATIC_FINALIZED_REGISTRATION'
          ELSE 'EXPLICIT_RELEASE'
        END AS "releaseBasis"
      FROM "EnterpriseDocument" d
      LEFT JOIN "EnterpriseDocumentPacketSource" ps
        ON ps."documentId" = d."id"
       AND ps."patientId" = d."patientId"
       AND ps."facilityId" = d."facilityId"
      LEFT JOIN "PatientDocumentRelease" r
        ON r."documentId" = d."id"
       AND r."patientId" = d."patientId"
       AND r."facilityId" = d."facilityId"
      WHERE d."facilityId" = ${access.facilityId}
        AND d."patientId" = ${access.patientId}
        AND d."status" = 'ACTIVE'
        ${documentId ? Prisma.sql`AND d."id" = ${documentId}` : Prisma.empty}
        AND r."revokedAt" IS NULL
        AND (
          (d."category" = 'REGISTRATION' AND ps."finalizedAt" IS NOT NULL)
          OR r."id" IS NOT NULL
        )
    `;
  }

  async listDocuments(access: PatientPortalAccessContext, context: RequestContext) {
    const rows = await this.prisma.$queryRaw<PatientDocumentRow[]>(Prisma.sql`
      ${this.visibleDocumentsSql(access)}
      ORDER BY d."uploadedAt" DESC
      LIMIT 100
    `);

    await this.audit.record("PATIENT_PORTAL_DOCUMENT_LIST_VIEW", "ENTERPRISE_DOCUMENT_LIST", {
      portalAccountId: access.portalAccountId,
      sessionId: access.sessionId,
      facilityId: access.facilityId,
      patientId: access.patientId,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: {
        count: rows.length,
        releasePolicy: "FINALIZED_REGISTRATION_OR_EXPLICIT_RELEASE_V2",
      },
    });

    return { documents: rows.map((row) => this.documentProjection(row)) };
  }

  async getDocumentContent(
    access: PatientPortalAccessContext,
    documentId: string,
    context: RequestContext,
  ) {
    // Authorization and ownership are proven in the database query before storage is touched.
    // The storage path never leaves this service.
    const rows = await this.prisma.$queryRaw<PatientDocumentContentRow[]>(Prisma.sql`
      SELECT visible.*, d."storagePath"
      FROM (
        ${this.visibleDocumentsSql(access, documentId)}
      ) visible
      INNER JOIN "EnterpriseDocument" d ON d."id" = visible."id"
      LIMIT 1
    `);
    const row = rows[0];
    if (!row) throw new NotFoundException("Document not found");

    const stored = await this.storage.read(row.storagePath, row.id);
    if (!stored) throw new NotFoundException("Document file is unavailable");

    await this.audit.record("PATIENT_PORTAL_DOCUMENT_DOWNLOAD", "ENTERPRISE_DOCUMENT", {
      portalAccountId: access.portalAccountId,
      sessionId: access.sessionId,
      facilityId: access.facilityId,
      patientId: access.patientId,
      entityId: row.id,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: {
        releaseBasis: row.releaseBasis,
        mimeType: row.mimeType,
      },
    });

    return {
      document: this.documentProjection(row),
      buffer: stored.buffer,
    };
  }
}
