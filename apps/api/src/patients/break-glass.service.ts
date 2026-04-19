import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import type { BreakGlassStartDto } from "@medora/shared";

/** Default break-glass window (20 minutes). */
const BREAK_GLASS_TTL_MS = 20 * 60 * 1000;

@Injectable()
export class BreakGlassService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async start(
    facilityId: string,
    patientId: string,
    userId: string,
    dto: BreakGlassStartDto,
    ip?: string,
    userAgent?: string
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    let encounterId: string | null = null;
    if (dto.encounterId) {
      const enc = await this.prisma.encounter.findFirst({
        where: { id: dto.encounterId, patientId, facilityId },
        select: { id: true },
      });
      if (!enc) {
        throw new BadRequestException("Consultation introuvable pour ce patient.");
      }
      encounterId = enc.id;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + BREAK_GLASS_TTL_MS);

    return this.prisma.$transaction(async (tx) => {
      const active = await tx.breakGlassSession.findMany({
        where: {
          userId,
          facilityId,
          patientId,
          endedAt: null,
          expiresAt: { gt: now },
        },
        select: { id: true },
      });

      for (const row of active) {
        await tx.breakGlassSession.update({
          where: { id: row.id },
          data: { endedAt: now },
        });
        await this.audit.log(AuditAction.BREAK_GLASS_END, "BREAK_GLASS_SESSION", {
          userId,
          facilityId,
          patientId,
          entityId: row.id,
          ip,
          userAgent,
          metadata: { superseded: true },
          critical: true,
          tx,
        });
      }

      const created = await tx.breakGlassSession.create({
        data: {
          userId,
          facilityId,
          patientId,
          encounterId,
          reason: dto.reason.trim(),
          startedAt: now,
          expiresAt,
        },
      });

      await this.audit.log(AuditAction.BREAK_GLASS_START, "BREAK_GLASS_SESSION", {
        userId,
        facilityId,
        patientId,
        entityId: created.id,
        ip,
        userAgent,
        metadata: {
          expiresAt: expiresAt.toISOString(),
          ...(encounterId ? { encounterId } : {}),
        },
        critical: true,
        tx,
      });

      return {
        id: created.id,
        patientId: created.patientId,
        encounterId: created.encounterId,
        expiresAt: created.expiresAt.toISOString(),
      };
    });
  }

  async end(
    facilityId: string,
    patientId: string,
    userId: string,
    ip?: string,
    userAgent?: string
  ) {
    const now = new Date();
    const session = await this.prisma.breakGlassSession.findFirst({
      where: {
        userId,
        facilityId,
        patientId,
        endedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { startedAt: "desc" },
    });

    if (!session) {
      throw new NotFoundException("Aucune session break-glass active.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.breakGlassSession.update({
        where: { id: session.id },
        data: { endedAt: now },
      });
      await this.audit.log(AuditAction.BREAK_GLASS_END, "BREAK_GLASS_SESSION", {
        userId,
        facilityId,
        patientId,
        entityId: session.id,
        ip,
        userAgent,
        metadata: { explicit: true },
        critical: true,
        tx,
      });
    });

    return { ok: true as const, id: session.id };
  }
}
