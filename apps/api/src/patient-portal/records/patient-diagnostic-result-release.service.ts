import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { AuditService } from "../../common/services/audit.service";
import { PrismaService } from "../../prisma/prisma.service";

export type DiagnosticResultStaffActor = { userId: string; facilityId: string; ip?: string | null; userAgent?: string | null };

@Injectable()
export class PatientDiagnosticResultReleaseService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async list(actor: DiagnosticResultStaffActor, patientId?: string) {
    const includeResultData = Boolean(patientId);
    const orders = await this.prisma.order.findMany({
      where: { facilityId: actor.facilityId, cancelledAt: null, ...(patientId ? { patientId } : {}) },
      select: {
        id: true,
        patientId: true,
        encounterId: true,
        prescriberName: true,
        orderedBy: true,
        items: {
          select: {
            id: true,
            catalogItemType: true,
            manualLabel: true,
            documentedCollectedAt: true,
            effectiveCollectedAt: true,
            result: {
              select: {
                criticalValue: true,
                resultText: true,
                verifiedAt: true,
                effectiveResultedAt: true,
                effectiveFinalizedAt: true,
                ...(includeResultData ? { resultData: true } : {}),
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: patientId ? 80 : 250,
    });
    const ids = orders.flatMap((o) => o.items.filter((i) => (i.catalogItemType === "LAB_TEST" || i.catalogItemType === "IMAGING_STUDY") && i.result?.verifiedAt).map((i) => i.id));
    const releases = ids.length ? await this.prisma.$queryRaw<Array<{ orderItemId: string; releasedAt: Date; revokedAt: Date | null }>>(Prisma.sql`
      SELECT "orderItemId", "releasedAt", "revokedAt" FROM "PatientDiagnosticResultRelease" WHERE "facilityId" = ${actor.facilityId} AND "orderItemId" IN (${Prisma.join(ids)})
    `) : [];
    const byId = new Map(releases.map((r) => [r.orderItemId, r]));
    return orders.flatMap((order) => order.items.filter((item) => (item.catalogItemType === "LAB_TEST" || item.catalogItemType === "IMAGING_STUDY") && item.result?.verifiedAt).map((item) => {
      const release = byId.get(item.id); const result = item.result!;
      const resultData = includeResultData ? (result as { resultData?: unknown }).resultData ?? null : null;
      return {
        id: item.id,
        orderId: order.id,
        patientId: order.patientId,
        encounterId: order.encounterId,
        kind: item.catalogItemType,
        title: item.manualLabel?.trim() || (item.catalogItemType === "LAB_TEST" ? "Laboratory result" : "Imaging result"),
        criticalValue: result.criticalValue,
        resultText: result.resultText,
        resultData,
        orderingProvider: order.prescriberName || null,
        verifiedAt: result.verifiedAt!.toISOString(),
        collectedAt: (item.effectiveCollectedAt ?? item.documentedCollectedAt)?.toISOString() ?? null,
        clinicalAt: (item.catalogItemType === "LAB_TEST" ? result.effectiveResultedAt : result.effectiveFinalizedAt)?.toISOString() ?? result.verifiedAt!.toISOString(),
        released: !!release && !release.revokedAt,
        releasedAt: release?.releasedAt?.toISOString() ?? null,
      };
    }));
  }

  async get(orderItemId: string, actor: DiagnosticResultStaffActor, purpose: "VIEW" | "DOWNLOAD" | "PRINT" = "VIEW") {
    const item = await this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        catalogItemType: { in: ["LAB_TEST", "IMAGING_STUDY"] },
        order: { facilityId: actor.facilityId, cancelledAt: null },
        result: { is: { verifiedAt: { not: null } } },
      },
      select: {
        id: true,
        catalogItemType: true,
        manualLabel: true,
        documentedCollectedAt: true,
        effectiveCollectedAt: true,
        order: { select: { id: true, patientId: true, encounterId: true, facilityId: true, prescriberName: true } },
        result: {
          select: {
            criticalValue: true,
            resultText: true,
            resultData: true,
            verifiedAt: true,
            effectiveResultedAt: true,
            effectiveFinalizedAt: true,
            verifiedByUserId: true,
            acknowledgedByUserId: true,
            acknowledgedByProviderAt: true,
          },
        },
      },
    });
    if (!item || item.order.facilityId !== actor.facilityId || !item.result?.verifiedAt) {
      throw new NotFoundException("Verified diagnostic result not found");
    }
    const signerIds = [item.result.verifiedByUserId, item.result.acknowledgedByUserId].filter(
      (id): id is string => Boolean(id),
    );
    const [releaseRows, users, history] = await Promise.all([
      this.prisma.$queryRaw<Array<{ releasedAt: Date; revokedAt: Date | null; releasedByUserId: string | null; revokedByUserId: string | null }>>(Prisma.sql`
        SELECT "releasedAt", "revokedAt", "releasedByUserId", "revokedByUserId"
        FROM "PatientDiagnosticResultRelease"
        WHERE "facilityId" = ${actor.facilityId} AND "orderItemId" = ${item.id}
        LIMIT 1
      `),
      signerIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: signerIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : Promise.resolve([] as Array<{ id: string; firstName: string | null; lastName: string | null }>),
      this.prisma.auditLog.findMany({
        where: {
          facilityId: actor.facilityId,
          patientId: item.order.patientId,
          entityType: "PATIENT_DIAGNOSTIC_RESULT_RELEASE",
          entityId: item.id,
        },
        select: { id: true, createdAt: true, action: true, metadata: true, userId: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);
    const nameById = new Map(users.map((user) => [user.id, [user.firstName, user.lastName].filter(Boolean).join(" ")]));
    const release = releaseRows[0];
    await this.audit.log(AuditAction.VIEW, "PATIENT_DIAGNOSTIC_RESULT_RELEASE", {
      userId: actor.userId,
      facilityId: actor.facilityId,
      patientId: item.order.patientId,
      entityId: item.id,
      ip: actor.ip ?? undefined,
      userAgent: actor.userAgent ?? undefined,
      metadata: { operation: purpose },
    });
    return {
      id: item.id,
      orderId: item.order.id,
      patientId: item.order.patientId,
      encounterId: item.order.encounterId,
      kind: item.catalogItemType,
      title: item.manualLabel?.trim() || (item.catalogItemType === "LAB_TEST" ? "Laboratory result" : "Imaging result"),
      criticalValue: item.result.criticalValue,
      resultText: item.result.resultText,
      resultData: item.result.resultData,
      orderingProvider: item.order.prescriberName,
      verifiedAt: item.result.verifiedAt.toISOString(),
      collectedAt: (item.effectiveCollectedAt ?? item.documentedCollectedAt)?.toISOString() ?? null,
      clinicalAt: (item.catalogItemType === "LAB_TEST" ? item.result.effectiveResultedAt : item.result.effectiveFinalizedAt)?.toISOString() ?? item.result.verifiedAt.toISOString(),
      released: !!release && !release.revokedAt,
      releasedAt: release?.releasedAt?.toISOString() ?? null,
      verifiedByName: item.result.verifiedByUserId ? nameById.get(item.result.verifiedByUserId) ?? null : null,
      acknowledgedByName: item.result.acknowledgedByUserId ? nameById.get(item.result.acknowledgedByUserId) ?? null : null,
      acknowledgedAt: item.result.acknowledgedByProviderAt?.toISOString() ?? null,
      history: history.map((row) => ({
        id: row.id,
        at: row.createdAt.toISOString(),
        action: row.action,
        metadata: row.metadata,
      })),
    };
  }

  private async authoritative(orderItemId: string, actor: DiagnosticResultStaffActor) {
    const item = await this.prisma.orderItem.findFirst({ where: { id: orderItemId, catalogItemType: { in: ["LAB_TEST", "IMAGING_STUDY"] }, order: { facilityId: actor.facilityId, cancelledAt: null }, result: { is: { verifiedAt: { not: null } } } }, select: { id: true, order: { select: { patientId: true, facilityId: true } } } });
    if (!item || item.order.facilityId !== actor.facilityId) throw new NotFoundException("Verified diagnostic result not found");
    return item;
  }

  async release(orderItemId: string, actor: DiagnosticResultStaffActor) {
    const item = await this.authoritative(orderItemId, actor); const id = randomUUID();
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`INSERT INTO "PatientDiagnosticResultRelease" ("id","orderItemId","patientId","facilityId","releasedByUserId","releasedAt","revokedByUserId","revokedAt","createdAt","updatedAt") VALUES (${id},${item.id},${item.order.patientId},${actor.facilityId},${actor.userId},CURRENT_TIMESTAMP,NULL,NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("orderItemId") DO UPDATE SET "patientId"=EXCLUDED."patientId","facilityId"=EXCLUDED."facilityId","releasedByUserId"=EXCLUDED."releasedByUserId","releasedAt"=CURRENT_TIMESTAMP,"revokedByUserId"=NULL,"revokedAt"=NULL,"updatedAt"=CURRENT_TIMESTAMP`);
      await this.audit.log(AuditAction.UPDATE, "PATIENT_DIAGNOSTIC_RESULT_RELEASE", { tx, critical: true, userId: actor.userId, facilityId: actor.facilityId, patientId: item.order.patientId, entityId: item.id, ip: actor.ip ?? undefined, userAgent: actor.userAgent ?? undefined, metadata: { operation: "RELEASE" } });
    });
    return { orderItemId: item.id, patientId: item.order.patientId, facilityId: actor.facilityId, released: true };
  }

  async revoke(orderItemId: string, actor: DiagnosticResultStaffActor) {
    const item = await this.authoritative(orderItemId, actor); const id = randomUUID();
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`INSERT INTO "PatientDiagnosticResultRelease" ("id","orderItemId","patientId","facilityId","releasedByUserId","releasedAt","revokedByUserId","revokedAt","createdAt","updatedAt") VALUES (${id},${item.id},${item.order.patientId},${actor.facilityId},NULL,CURRENT_TIMESTAMP,${actor.userId},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("orderItemId") DO UPDATE SET "patientId"=EXCLUDED."patientId","facilityId"=EXCLUDED."facilityId","revokedByUserId"=EXCLUDED."revokedByUserId","revokedAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP`);
      await this.audit.log(AuditAction.UPDATE, "PATIENT_DIAGNOSTIC_RESULT_RELEASE", { tx, critical: true, userId: actor.userId, facilityId: actor.facilityId, patientId: item.order.patientId, entityId: item.id, ip: actor.ip ?? undefined, userAgent: actor.userAgent ?? undefined, metadata: { operation: "REVOKE" } });
    });
    return { orderItemId: item.id, patientId: item.order.patientId, facilityId: actor.facilityId, released: false };
  }
}
