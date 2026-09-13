import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { AuditService } from "../../common/services/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import type { PatientPortalAccessContext } from "../auth/patient-portal.types";
import { PatientPortalAuditService } from "../patient-portal-audit.service";
import type {
  CreatePatientMessageThreadInput,
  PatientMessageReplyInput,
} from "./patient-messages.schemas";

type RequestContext = {
  ip?: string | null;
  userAgent?: string | null;
};

export type PatientPortalStaffMessagingActor = RequestContext & {
  userId: string;
  facilityId: string;
};

type ThreadRow = {
  id: string;
  portalAccountId: string;
  patientId: string;
  facilityId: string;
  category: string;
  subject: string;
  status: string;
  lastMessageAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MessageRow = {
  id: string;
  threadId: string;
  senderType: "PATIENT" | "STAFF";
  senderPortalAccountId: string | null;
  senderUserId: string | null;
  body: string;
  createdAt: Date;
};

@Injectable()
export class PatientMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientAudit: PatientPortalAuditService,
    private readonly staffAudit: AuditService,
  ) {}

  private patientThreadView(thread: ThreadRow) {
    return {
      id: thread.id,
      category: thread.category,
      subject: thread.subject,
      status: thread.status,
      lastMessageAt: thread.lastMessageAt,
      closedAt: thread.closedAt,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
    };
  }

  private patientMessageView(message: MessageRow) {
    return {
      id: message.id,
      sender: message.senderType === "PATIENT" ? "PATIENT" : "CARE_TEAM",
      body: message.body,
      createdAt: message.createdAt,
    };
  }

  private staffThreadView(thread: ThreadRow) {
    return {
      id: thread.id,
      patientId: thread.patientId,
      category: thread.category,
      subject: thread.subject,
      status: thread.status,
      lastMessageAt: thread.lastMessageAt,
      closedAt: thread.closedAt,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
    };
  }

  private staffMessageView(message: MessageRow) {
    return {
      id: message.id,
      senderType: message.senderType,
      senderUserId: message.senderType === "STAFF" ? message.senderUserId : null,
      body: message.body,
      createdAt: message.createdAt,
    };
  }

  private async writePatientMutationAudit(
    tx: Prisma.TransactionClient,
    access: PatientPortalAccessContext,
    action: string,
    entityId: string,
    context: RequestContext,
    metadata: Record<string, string | number | boolean | null>,
  ): Promise<void> {
    // Secure-message writes are always audit-atomic. If this insert fails, the surrounding
    // transaction rolls back the message write instead of creating unaudited PHI.
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "PatientPortalAuditLog" (
        "id", "portalAccountId", "sessionId", "facilityId", "patientId",
        "action", "entityType", "entityId", "ip", "userAgent", "metadata"
      ) VALUES (
        ${randomUUID()}, ${access.portalAccountId}, ${access.sessionId},
        ${access.facilityId}, ${access.patientId}, ${action},
        'PATIENT_PORTAL_MESSAGE_THREAD', ${entityId}, ${context.ip ?? null},
        ${context.userAgent ?? null}, ${JSON.stringify(metadata)}::jsonb
      )
    `);
  }

  private async findPatientThread(
    access: PatientPortalAccessContext,
    threadId: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<ThreadRow | null> {
    const rows = await client.$queryRaw<ThreadRow[]>(Prisma.sql`
      SELECT
        "id", "portalAccountId", "patientId", "facilityId",
        "category"::text AS "category", "subject", "status"::text AS "status",
        "lastMessageAt", "closedAt", "createdAt", "updatedAt"
      FROM "PatientPortalMessageThread"
      WHERE "id" = ${threadId}
        AND "portalAccountId" = ${access.portalAccountId}
        AND "patientId" = ${access.patientId}
        AND "facilityId" = ${access.facilityId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  private async findStaffThread(
    actor: PatientPortalStaffMessagingActor,
    threadId: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<ThreadRow | null> {
    const rows = await client.$queryRaw<ThreadRow[]>(Prisma.sql`
      SELECT
        "id", "portalAccountId", "patientId", "facilityId",
        "category"::text AS "category", "subject", "status"::text AS "status",
        "lastMessageAt", "closedAt", "createdAt", "updatedAt"
      FROM "PatientPortalMessageThread"
      WHERE "id" = ${threadId}
        AND "facilityId" = ${actor.facilityId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  private async listThreadMessages(
    threadId: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<MessageRow[]> {
    return client.$queryRaw<MessageRow[]>(Prisma.sql`
      SELECT
        "id", "threadId", "senderType"::text AS "senderType",
        "senderPortalAccountId", "senderUserId", "body", "createdAt"
      FROM "PatientPortalMessage"
      WHERE "threadId" = ${threadId}
      ORDER BY "createdAt" ASC, "id" ASC
      LIMIT 500
    `);
  }

  async listPatientThreads(access: PatientPortalAccessContext, context: RequestContext) {
    const rows = await this.prisma.$queryRaw<ThreadRow[]>(Prisma.sql`
      SELECT
        "id", "portalAccountId", "patientId", "facilityId",
        "category"::text AS "category", "subject", "status"::text AS "status",
        "lastMessageAt", "closedAt", "createdAt", "updatedAt"
      FROM "PatientPortalMessageThread"
      WHERE "portalAccountId" = ${access.portalAccountId}
        AND "patientId" = ${access.patientId}
        AND "facilityId" = ${access.facilityId}
      ORDER BY "lastMessageAt" DESC, "id" DESC
      LIMIT 100
    `);

    await this.patientAudit.record("PATIENT_PORTAL_MESSAGE_THREAD_LIST_VIEW", "PATIENT_PORTAL_MESSAGE_THREAD_LIST", {
      portalAccountId: access.portalAccountId,
      sessionId: access.sessionId,
      facilityId: access.facilityId,
      patientId: access.patientId,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
      metadata: { count: rows.length },
    });

    return rows.map((thread) => this.patientThreadView(thread));
  }

  async getPatientThread(
    access: PatientPortalAccessContext,
    threadId: string,
    context: RequestContext,
  ) {
    const thread = await this.findPatientThread(access, threadId);
    if (!thread) throw new NotFoundException("Message thread not found");

    const messages = await this.listThreadMessages(thread.id);

    await this.patientAudit.record("PATIENT_PORTAL_MESSAGE_THREAD_VIEW", "PATIENT_PORTAL_MESSAGE_THREAD", {
      portalAccountId: access.portalAccountId,
      sessionId: access.sessionId,
      facilityId: access.facilityId,
      patientId: access.patientId,
      entityId: thread.id,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
      metadata: { messageCount: messages.length },
    });

    return {
      ...this.patientThreadView(thread),
      messages: messages.map((message) => this.patientMessageView(message)),
    };
  }

  async createPatientThread(
    access: PatientPortalAccessContext,
    input: CreatePatientMessageThreadInput,
    context: RequestContext,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const threadId = randomUUID();
      const messageId = randomUUID();

      const threadRows = await tx.$queryRaw<ThreadRow[]>(Prisma.sql`
        INSERT INTO "PatientPortalMessageThread" (
          "id", "portalAccountId", "patientId", "facilityId", "category", "subject"
        ) VALUES (
          ${threadId}, ${access.portalAccountId}, ${access.patientId}, ${access.facilityId},
          ${input.category}::"PatientPortalMessageCategory", ${input.subject}
        )
        RETURNING
          "id", "portalAccountId", "patientId", "facilityId",
          "category"::text AS "category", "subject", "status"::text AS "status",
          "lastMessageAt", "closedAt", "createdAt", "updatedAt"
      `);

      const messageRows = await tx.$queryRaw<MessageRow[]>(Prisma.sql`
        INSERT INTO "PatientPortalMessage" (
          "id", "threadId", "senderType", "senderPortalAccountId", "senderUserId", "body"
        ) VALUES (
          ${messageId}, ${threadId}, 'PATIENT'::"PatientPortalMessageSenderType",
          ${access.portalAccountId}, NULL, ${input.message}
        )
        RETURNING
          "id", "threadId", "senderType"::text AS "senderType",
          "senderPortalAccountId", "senderUserId", "body", "createdAt"
      `);

      await this.writePatientMutationAudit(
        tx,
        access,
        "PATIENT_PORTAL_MESSAGE_THREAD_CREATE",
        threadId,
        context,
        {
          category: input.category,
          subjectLength: input.subject.length,
          messageLength: input.message.length,
        },
      );

      const thread = threadRows[0]!;
      const message = messageRows[0]!;
      return {
        ...this.patientThreadView(thread),
        messages: [this.patientMessageView(message)],
      };
    });
  }

  async replyAsPatient(
    access: PatientPortalAccessContext,
    threadId: string,
    input: PatientMessageReplyInput,
    context: RequestContext,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const thread = await this.findPatientThread(access, threadId, tx);
      if (!thread) throw new NotFoundException("Message thread not found");
      if (thread.status !== "OPEN") {
        throw new ConflictException("Message thread is closed");
      }

      const messageId = randomUUID();
      const rows = await tx.$queryRaw<MessageRow[]>(Prisma.sql`
        INSERT INTO "PatientPortalMessage" (
          "id", "threadId", "senderType", "senderPortalAccountId", "senderUserId", "body"
        ) VALUES (
          ${messageId}, ${thread.id}, 'PATIENT'::"PatientPortalMessageSenderType",
          ${access.portalAccountId}, NULL, ${input.message}
        )
        RETURNING
          "id", "threadId", "senderType"::text AS "senderType",
          "senderPortalAccountId", "senderUserId", "body", "createdAt"
      `);

      await this.writePatientMutationAudit(
        tx,
        access,
        "PATIENT_PORTAL_MESSAGE_SEND",
        thread.id,
        context,
        { messageLength: input.message.length },
      );

      return this.patientMessageView(rows[0]!);
    });
  }

  async listStaffThreads(actor: PatientPortalStaffMessagingActor) {
    const rows = await this.prisma.$queryRaw<ThreadRow[]>(Prisma.sql`
      SELECT
        "id", "portalAccountId", "patientId", "facilityId",
        "category"::text AS "category", "subject", "status"::text AS "status",
        "lastMessageAt", "closedAt", "createdAt", "updatedAt"
      FROM "PatientPortalMessageThread"
      WHERE "facilityId" = ${actor.facilityId}
      ORDER BY "lastMessageAt" DESC, "id" DESC
      LIMIT 100
    `);

    await this.staffAudit.log(AuditAction.VIEW, "PATIENT_PORTAL_MESSAGE_THREAD_LIST", {
      userId: actor.userId,
      facilityId: actor.facilityId,
      ip: actor.ip ?? undefined,
      userAgent: actor.userAgent ?? undefined,
      metadata: { count: rows.length },
    });

    return rows.map((thread) => this.staffThreadView(thread));
  }

  async getStaffThread(actor: PatientPortalStaffMessagingActor, threadId: string) {
    const thread = await this.findStaffThread(actor, threadId);
    if (!thread) throw new NotFoundException("Message thread not found");
    const messages = await this.listThreadMessages(thread.id);

    await this.staffAudit.log(AuditAction.VIEW, "PATIENT_PORTAL_MESSAGE_THREAD", {
      userId: actor.userId,
      facilityId: actor.facilityId,
      patientId: thread.patientId,
      entityId: thread.id,
      ip: actor.ip ?? undefined,
      userAgent: actor.userAgent ?? undefined,
      metadata: { messageCount: messages.length },
    });

    return {
      ...this.staffThreadView(thread),
      messages: messages.map((message) => this.staffMessageView(message)),
    };
  }

  async replyAsStaff(
    actor: PatientPortalStaffMessagingActor,
    threadId: string,
    input: PatientMessageReplyInput,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const thread = await this.findStaffThread(actor, threadId, tx);
      if (!thread) throw new NotFoundException("Message thread not found");
      if (thread.status !== "OPEN") {
        throw new ConflictException("Message thread is closed");
      }

      const messageId = randomUUID();
      const rows = await tx.$queryRaw<MessageRow[]>(Prisma.sql`
        INSERT INTO "PatientPortalMessage" (
          "id", "threadId", "senderType", "senderPortalAccountId", "senderUserId", "body"
        ) VALUES (
          ${messageId}, ${thread.id}, 'STAFF'::"PatientPortalMessageSenderType",
          NULL, ${actor.userId}, ${input.message}
        )
        RETURNING
          "id", "threadId", "senderType"::text AS "senderType",
          "senderPortalAccountId", "senderUserId", "body", "createdAt"
      `);

      await this.staffAudit.log(AuditAction.CREATE, "PATIENT_PORTAL_MESSAGE", {
        tx,
        critical: true,
        userId: actor.userId,
        facilityId: actor.facilityId,
        patientId: thread.patientId,
        entityId: messageId,
        ip: actor.ip ?? undefined,
        userAgent: actor.userAgent ?? undefined,
        metadata: {
          threadId: thread.id,
          messageLength: input.message.length,
          senderType: "STAFF",
        },
      });

      return this.staffMessageView(rows[0]!);
    });
  }

  async closeAsStaff(actor: PatientPortalStaffMessagingActor, threadId: string) {
    return this.prisma.$transaction(async (tx) => {
      const thread = await this.findStaffThread(actor, threadId, tx);
      if (!thread) throw new NotFoundException("Message thread not found");
      if (thread.status === "CLOSED") {
        return { threadId: thread.id, status: "CLOSED", closedAt: thread.closedAt };
      }

      const rows = await tx.$queryRaw<Array<{ id: string; patientId: string; closedAt: Date }>>(Prisma.sql`
        UPDATE "PatientPortalMessageThread"
        SET "status" = 'CLOSED'::"PatientPortalMessageThreadStatus",
            "closedAt" = CURRENT_TIMESTAMP,
            "closedByUserId" = ${actor.userId},
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${thread.id}
          AND "facilityId" = ${actor.facilityId}
          AND "status" = 'OPEN'::"PatientPortalMessageThreadStatus"
        RETURNING "id", "patientId", "closedAt"
      `);

      const closed = rows[0];
      if (!closed) throw new ConflictException("Message thread could not be closed");

      await this.staffAudit.log(AuditAction.UPDATE, "PATIENT_PORTAL_MESSAGE_THREAD", {
        tx,
        critical: true,
        userId: actor.userId,
        facilityId: actor.facilityId,
        patientId: closed.patientId,
        entityId: closed.id,
        ip: actor.ip ?? undefined,
        userAgent: actor.userAgent ?? undefined,
        metadata: { operation: "CLOSE" },
      });

      return { threadId: closed.id, status: "CLOSED", closedAt: closed.closedAt };
    });
  }
}
