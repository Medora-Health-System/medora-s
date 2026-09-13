import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { AuditService } from "../../common/services/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import type { PatientPortalAccessContext } from "../auth/patient-portal.types";
import type { CreatePatientServiceRequestInput, PatientServiceRequestDecisionInput } from "./patient-service-request.schemas";

type RequestContext = { ip?: string | null; userAgent?: string | null };
export type StaffRequestActor = RequestContext & { userId: string; facilityId: string };

type RequestRow = {
  id: string;
  portalAccountId: string;
  patientId: string;
  facilityId: string;
  type: string;
  status: string;
  appointmentId: string | null;
  medicationOrderItemId: string | null;
  preferredStartAt: Date | null;
  reason: string | null;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  resolutionCode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const REQUEST_COLUMNS = Prisma.raw(`
  "id", "portalAccountId", "patientId", "facilityId", "type"::text AS "type",
  "status"::text AS "status", "appointmentId", "medicationOrderItemId",
  "preferredStartAt", "reason", "reviewedByUserId", "reviewedAt",
  "resolutionCode", "createdAt", "updatedAt"
`);

@Injectable()
export class PatientServiceRequestsService {
  constructor(private readonly prisma: PrismaService, private readonly staffAudit: AuditService) {}

  private patientView(row: RequestRow) {
    return {
      id: row.id,
      type: row.type,
      status: row.status,
      appointmentId: row.appointmentId,
      medicationOrderItemId: row.medicationOrderItemId,
      preferredStartAt: row.preferredStartAt?.toISOString() ?? null,
      reason: row.reason,
      resolutionCode: row.resolutionCode,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      notice: "This request does not change an appointment or medication until authorized staff completes the corresponding workflow.",
    };
  }

  private staffView(row: RequestRow) {
    return {
      id: row.id,
      patientId: row.patientId,
      type: row.type,
      status: row.status,
      appointmentId: row.appointmentId,
      medicationOrderItemId: row.medicationOrderItemId,
      preferredStartAt: row.preferredStartAt?.toISOString() ?? null,
      reason: row.reason,
      reviewedByUserId: row.reviewedByUserId,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      resolutionCode: row.resolutionCode,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      authoritativeRecordChanged: false,
    };
  }

  private async patientAudit(tx: Prisma.TransactionClient, access: PatientPortalAccessContext, action: string, entityId: string, context: RequestContext, metadata: Record<string, string | boolean | number | null>) {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "PatientPortalAuditLog" (
        "id", "portalAccountId", "sessionId", "facilityId", "patientId",
        "action", "entityType", "entityId", "ip", "userAgent", "metadata"
      ) VALUES (
        ${randomUUID()}, ${access.portalAccountId}, ${access.sessionId}, ${access.facilityId},
        ${access.patientId}, ${action}, 'PATIENT_PORTAL_SERVICE_REQUEST', ${entityId},
        ${context.ip ?? null}, ${context.userAgent ?? null}, ${JSON.stringify(metadata)}::jsonb
      )
    `);
  }

  private async validateReference(tx: Prisma.TransactionClient, access: PatientPortalAccessContext, input: CreatePatientServiceRequestInput) {
    if ((input.type === "APPOINTMENT_NEW" || input.type === "APPOINTMENT_CHANGE") && input.preferredStartAt.getTime() <= Date.now()) {
      throw new BadRequestException("Requested appointment time must be in the future");
    }

    if (input.type === "APPOINTMENT_CHANGE" || input.type === "APPOINTMENT_CANCEL") {
      const rows = await tx.$queryRaw<Array<{ id: string; status: string }>>(Prisma.sql`
        SELECT "id", "status"::text AS "status" FROM "Appointment"
        WHERE "id" = ${input.appointmentId}
          AND "facilityId" = ${access.facilityId}
          AND "patientId" = ${access.patientId}
        LIMIT 1
      `);
      const appointment = rows[0];
      if (!appointment) throw new NotFoundException("Appointment not found");
      if (["COMPLETED", "CANCELLED"].includes(appointment.status)) {
        throw new ConflictException("Appointment is no longer eligible for this request");
      }
    }

    if (input.type === "MEDICATION_REFILL") {
      const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT oi."id"
        FROM "OrderItem" oi
        INNER JOIN "Order" o ON o."id" = oi."orderId"
        WHERE oi."id" = ${input.medicationOrderItemId}
          AND oi."catalogItemType" = 'MEDICATION'
          AND oi."medicationFulfillmentIntent" = 'PHARMACY_DISPENSE'
          AND o."type" = 'MEDICATION'
          AND o."facilityId" = ${access.facilityId}
          AND o."patientId" = ${access.patientId}
        LIMIT 1
      `);
      if (!rows[0]) throw new NotFoundException("Medication not found");
    }
  }

  private async findPatientRequest(tx: Prisma.TransactionClient, access: PatientPortalAccessContext, requestId: string) {
    const rows = await tx.$queryRaw<RequestRow[]>(Prisma.sql`
      SELECT ${REQUEST_COLUMNS} FROM "PatientPortalServiceRequest"
      WHERE "id" = ${requestId}
        AND "portalAccountId" = ${access.portalAccountId}
        AND "patientId" = ${access.patientId}
        AND "facilityId" = ${access.facilityId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async listPatient(access: PatientPortalAccessContext) {
    const rows = await this.prisma.$queryRaw<RequestRow[]>(Prisma.sql`
      SELECT ${REQUEST_COLUMNS} FROM "PatientPortalServiceRequest"
      WHERE "portalAccountId" = ${access.portalAccountId}
        AND "patientId" = ${access.patientId}
        AND "facilityId" = ${access.facilityId}
      ORDER BY "createdAt" DESC, "id" DESC
      LIMIT 100
    `);
    return { requests: rows.map((row) => this.patientView(row)) };
  }

  async create(access: PatientPortalAccessContext, input: CreatePatientServiceRequestInput, context: RequestContext) {
    return this.prisma.$transaction(async (tx) => {
      await this.validateReference(tx, access, input);
      const id = randomUUID();
      const appointmentId = "appointmentId" in input ? input.appointmentId : null;
      const medicationOrderItemId = "medicationOrderItemId" in input ? input.medicationOrderItemId : null;
      const preferredStartAt = "preferredStartAt" in input ? input.preferredStartAt : null;
      const reason = input.reason?.trim() || null;

      const rows = await tx.$queryRaw<RequestRow[]>(Prisma.sql`
        INSERT INTO "PatientPortalServiceRequest" (
          "id", "portalAccountId", "patientId", "facilityId", "type",
          "appointmentId", "medicationOrderItemId", "preferredStartAt", "reason"
        ) VALUES (
          ${id}, ${access.portalAccountId}, ${access.patientId}, ${access.facilityId},
          ${input.type}::"PatientPortalServiceRequestType", ${appointmentId},
          ${medicationOrderItemId}, ${preferredStartAt}, ${reason}
        ) RETURNING ${REQUEST_COLUMNS}
      `);

      await this.patientAudit(tx, access, "PATIENT_PORTAL_SERVICE_REQUEST_CREATE", id, context, {
        type: input.type,
        hasReason: !!reason,
        hasAppointmentReference: !!appointmentId,
        hasMedicationReference: !!medicationOrderItemId,
      });
      return this.patientView(rows[0]!);
    });
  }

  async cancelPatientRequest(access: PatientPortalAccessContext, requestId: string, context: RequestContext) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.findPatientRequest(tx, access, requestId);
      if (!existing) throw new NotFoundException("Request not found");
      if (existing.status !== "PENDING") throw new ConflictException("Only a pending request can be cancelled");

      const rows = await tx.$queryRaw<RequestRow[]>(Prisma.sql`
        UPDATE "PatientPortalServiceRequest"
        SET "status" = 'CANCELLED'::"PatientPortalServiceRequestStatus", "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${requestId}
          AND "portalAccountId" = ${access.portalAccountId}
          AND "patientId" = ${access.patientId}
          AND "facilityId" = ${access.facilityId}
          AND "status" = 'PENDING'::"PatientPortalServiceRequestStatus"
        RETURNING ${REQUEST_COLUMNS}
      `);
      const row = rows[0];
      if (!row) throw new ConflictException("Request status changed; refresh and retry");
      await this.patientAudit(tx, access, "PATIENT_PORTAL_SERVICE_REQUEST_CANCEL", row.id, context, { type: row.type });
      return this.patientView(row);
    });
  }

  async listStaff(actor: StaffRequestActor) {
    const rows = await this.prisma.$queryRaw<RequestRow[]>(Prisma.sql`
      SELECT ${REQUEST_COLUMNS} FROM "PatientPortalServiceRequest"
      WHERE "facilityId" = ${actor.facilityId}
      ORDER BY CASE WHEN "status" IN ('PENDING','IN_REVIEW') THEN 0 ELSE 1 END, "createdAt" ASC
      LIMIT 200
    `);
    await this.staffAudit.log(AuditAction.VIEW, "PATIENT_PORTAL_SERVICE_REQUEST_QUEUE", {
      userId: actor.userId,
      facilityId: actor.facilityId,
      ip: actor.ip ?? undefined,
      userAgent: actor.userAgent ?? undefined,
      metadata: { count: rows.length },
    });
    return { requests: rows.map((row) => this.staffView(row)) };
  }

  private transitionAllowed(from: string, to: PatientServiceRequestDecisionInput["status"]) {
    if (from === "PENDING") return ["IN_REVIEW", "ACCEPTED", "DECLINED"].includes(to);
    if (from === "IN_REVIEW") return ["ACCEPTED", "DECLINED"].includes(to);
    if (from === "ACCEPTED") return to === "COMPLETED";
    return false;
  }

  async decideStaff(actor: StaffRequestActor, requestId: string, decision: PatientServiceRequestDecisionInput) {
    return this.prisma.$transaction(async (tx) => {
      const currentRows = await tx.$queryRaw<RequestRow[]>(Prisma.sql`
        SELECT ${REQUEST_COLUMNS} FROM "PatientPortalServiceRequest"
        WHERE "id" = ${requestId} AND "facilityId" = ${actor.facilityId}
        LIMIT 1
      `);
      const current = currentRows[0];
      if (!current) throw new NotFoundException("Request not found");
      if (!this.transitionAllowed(current.status, decision.status)) {
        throw new ConflictException("Invalid request status transition");
      }

      const rows = await tx.$queryRaw<RequestRow[]>(Prisma.sql`
        UPDATE "PatientPortalServiceRequest"
        SET "status" = ${decision.status}::"PatientPortalServiceRequestStatus",
            "reviewedByUserId" = ${actor.userId},
            "reviewedAt" = CURRENT_TIMESTAMP,
            "resolutionCode" = ${decision.resolutionCode},
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${requestId}
          AND "facilityId" = ${actor.facilityId}
          AND "status"::text = ${current.status}
        RETURNING ${REQUEST_COLUMNS}
      `);
      const row = rows[0];
      if (!row) throw new ConflictException("Request status changed; refresh and retry");

      await this.staffAudit.log(AuditAction.UPDATE, "PATIENT_PORTAL_SERVICE_REQUEST", {
        tx,
        critical: true,
        userId: actor.userId,
        facilityId: actor.facilityId,
        patientId: row.patientId,
        entityId: row.id,
        ip: actor.ip ?? undefined,
        userAgent: actor.userAgent ?? undefined,
        metadata: {
          requestType: row.type,
          requestStatus: decision.status,
          resolutionCode: decision.resolutionCode,
          authoritativeRecordChanged: false,
        },
      });
      return this.staffView(row);
    });
  }
}
