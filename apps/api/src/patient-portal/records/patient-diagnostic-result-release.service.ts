import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { AuditService } from "../../common/services/audit.service";
import { PrismaService } from "../../prisma/prisma.service";

export type DiagnosticResultStaffActor = { userId: string; facilityId: string; ip?: string | null; userAgent?: string | null };

@Injectable()
export class PatientDiagnosticResultReleaseService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async list(actor: DiagnosticResultStaffActor) {
    const orders = await this.prisma.order.findMany({
      where: { facilityId: actor.facilityId, cancelledAt: null },
      select: { id: true, patientId: true, encounterId: true, items: { select: { id: true, catalogItemType: true, manualLabel: true, result: { select: { criticalValue: true, resultText: true, verifiedAt: true, effectiveResultedAt: true, effectiveFinalizedAt: true } } } } },
      orderBy: { createdAt: "desc" }, take: 250,
    });
    const ids = orders.flatMap((o) => o.items.filter((i) => (i.catalogItemType === "LAB_TEST" || i.catalogItemType === "IMAGING_STUDY") && i.result?.verifiedAt).map((i) => i.id));
    const releases = ids.length ? await this.prisma.$queryRaw<Array<{ orderItemId: string; releasedAt: Date; revokedAt: Date | null }>>(Prisma.sql`
      SELECT "orderItemId", "releasedAt", "revokedAt" FROM "PatientDiagnosticResultRelease" WHERE "facilityId" = ${actor.facilityId} AND "orderItemId" IN (${Prisma.join(ids)})
    `) : [];
    const byId = new Map(releases.map((r) => [r.orderItemId, r]));
    return orders.flatMap((order) => order.items.filter((item) => (item.catalogItemType === "LAB_TEST" || item.catalogItemType === "IMAGING_STUDY") && item.result?.verifiedAt).map((item) => {
      const release = byId.get(item.id); const result = item.result!;
      return { id: item.id, orderId: order.id, patientId: order.patientId, encounterId: order.encounterId, kind: item.catalogItemType, title: item.manualLabel?.trim() || (item.catalogItemType === "LAB_TEST" ? "Laboratory result" : "Imaging result"), criticalValue: result.criticalValue, resultText: result.resultText, verifiedAt: result.verifiedAt!.toISOString(), clinicalAt: (item.catalogItemType === "LAB_TEST" ? result.effectiveResultedAt : result.effectiveFinalizedAt)?.toISOString() ?? result.verifiedAt!.toISOString(), released: !!release && !release.revokedAt, releasedAt: release?.releasedAt?.toISOString() ?? null };
    }));
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
