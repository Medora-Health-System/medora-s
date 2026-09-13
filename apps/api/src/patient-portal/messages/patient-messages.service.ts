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

type SqlClient = Pick<Prisma.TransactionClient, "$queryRaw" | "$executeRaw">;

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
    entityType: string,
    entityId: string,
    context: RequestContext,
    metadata: Record<string, string | number | boolean | null>,
  ): Promise<void> {
    // Secure-message mutations and their forensic audit are atomic. The audit stores only
    // opaque identifiers and lengths/categories, never message subject/body text.
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "PatientPortalAuditLog" (
        "id", "portalAccountId", "sessionId", "facilityId", "patientId",
        "action", "entityType", "entityId", "ip", "userAgent", "metadata"
      ) VALUES (
        ${randomUUID()}, ${access.portalAccountId}, ${access.sessionId},
        ${access.facilityId}, ${access.patientId}, ${action}, ${entityType},
        ${entityId}, ${context.ip ?? null}, ${context.userAgent ?? null},
        ${JSON.stringify(metadata)}::jsonb
      )
    `);
  }

  private async findPatientThread(
    access: PatientPortalAccessContext,
    threadId: string,
    client: SqlClient = this.prisma,
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
    client: SqlClient = this.prisma,
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

  private async findStaffReplyableThread(
    actor: PatientPortalStaffMessagingActor,
    threadId: string,
    client: SqlClient,
  ): Promise<ThreadRow | null> {
    const rows = await client.$queryRaw<ThreadRow[]>(Prisma.sql`
      SELECT
        t."id", t."portalAccountId", t."patientId", t."facilityId",
        t."category"::text AS "category", t."subject", t."status"::text AS "status",
        t."lastMessageAt", t."closedAt", t."createdAt", t."updatedAt"
      FROM "PatientPortalMessageThread" t
      INNER JOIN "PatientPortalLink" l
        ON l."portalAccountId" = t."portalAccountId"
       AND l."patientId" = t."patientId"
       AND l."facilityId" = t."facilityId"
      INNER JOIN "PatientPortalAccount" a ON a."id" = t."portalAccountId"
      INNER JOIN "Patient" p ON p."id" = t."patientId"
      INNER JOIN "Facility" f ON f."id" = t."facilityId"
      WHERE t."id" = ${threadId}
        AND t."facilityId" = ${actor.facilityId}
        AND l."status" = 'VERIFIED'::"PatientPortalLinkStatus"
        AND l."revokedAt" IS NULL
        AND a."status" = 'ACTIVE'::"PatientPortalAccountStatus"
        AND p."facilityId" = t."facilityId"
        AND f."isActive" = TRUE
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  private async listThreadMessages(
    threadId: string,
    client: SqlClient = this.prisma,
  ): Promise<{ messages: MessageRow[]; truncated: boolean }> {
    // Read the newest window, then restore chronological display order. Fetching one extra
    // row makes truncation explicit instead of silently dropping the newest conversation.
    const rows = await client.$queryRaw<MessageRow[]>(Prisma.sql`
      SELECT
        "id", "threadId", "senderType"::text AS "senderType",
        "senderPortalAccountId", "senderUserId", "body", "createdAt"
      FROM "PatientPortalMessage"
      WHERE "threadId" = ${threadId}
      ORDER BY "createdAt" DESC, "id" DESC
      LIMIT 501
    `);
    const truncated = rows.length > 500;
    return {
      messages: rows.slice(0, 500).reverse(),
      truncated,
    };
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

    await this.patientAudit.record(
      "PATIENT_PORTAL_MESSAGE_THREAD_LIST_VIEW",
      "PATIENT_PORTAL_MESSAGE_THREAD_LIST",
      {
        portalAccountId: access.portalAccountId,
        sessionId: access.sessionId,
        facilityId: access.facilityId,
        patientId: access.patientId,
        ip: context.ip ?? null,
        userAgent: context.userAgent ?? null,
        metadata: { count: rows.length },
      },
    );

    return rows.map((thread) => this.patientThreadView(thread));
  }

  async getPatientThread(
    access: PatientPortalAccessContext,
    threadId: string,
    context: RequestContext,
  ) {
    const thread = await this.findPatientThread(access, threadId);
    if (!thread) throw new NotFoundException("Message thread not found");

    const history = await this.listThreadMessages(thread.id);

    await this.patientAudit.record(
      "PATIENT_PORTAL_MESSAGE_THREAD_VIEW",
      "PATIENT_PORTAL_MESSAGE_THREAD",
      {
        portalAccountId: access.portalAccountId,
        sessionId: access.sessionId,
        facilityId: access.facilityId,
        patientId: access.patientId,
        entityId: thread.id,
        ip: context.ip ?? null,
        userAgent: context.userAgent ?? null,
        metadata: {
          messageCount: history.messages.length,
          messagesTruncated: history.truncated,
        },
      },
    );

    return {
      ...this.patientThreadView(thread),
      messages: history.messages.map((message) => this.patientMessageView(message)),
      messagesTruncated: history.truncated,
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
        "PATIENT_PORTAL_MESSAGE_THREAD",
        threadId,
        context,
        {
          category: input.category,
          subjectLength: input.subject.length,
          messageLength: input.message.length,
        },
      );

      return {
        ...this.patientThreadView(threadRows[0]!),
        messages: [this.patientMessageView(messageRows[0]!)],
        messagesTruncated: false,
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
        "PATIENT_PORTAL_MESSAGE",
        messageId,
        context,
        { threadId: thread.id, messageLength: input.message.length },
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
    const history = await this.listThreadMessages(thread.id);

    await this.staffAudit.log(AuditAction.VIEW, "PATIENT_PORTAL_MESSAGE_THREAD", {
      userId: actor.userId,
      facilityId: actor.facilityId,
      patientId: thread.patientId,
      entityId: thread.id,
      ip: actor.ip ?? undefined,
      userAgent: actor.userAgent ?? undefined,
      metadata: {
        messageCount: history.messages.length,
        messagesTruncated: history.truncated,
      },
    });

    return {
      ...this.staffThreadView(thread),
      messages: history.messages.map((message) => this.staffMessageView(message)),
      messagesTruncated: history.truncated,
    };
  }

  async replyAsStaff(
    actor: PatientPortalStaffMessagingActor,
    threadId: string,
    input: PatientMessageReplyInput,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Historical thread viewing remains facility-scoped, but new staff content is permitted
      // only while the patient's verified link/account/facility scope remains active.
      const thread = await this.findStaffReplyableThread(actor, threadId, tx);
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
      // Closing a historical thread remains allowed after link revocation so facilities can
      // retire old conversations without adding new content to an unreachable patient inbox.
      const thread = await this.findStaffThread(actor, threadId, tx);
      if (!thread) throw new NotFoundException("Message thread not found");
      if (thread.status === "CLOSED") {
        return { threadId: thread.id, status: "CLOSED", closedAt: thread.closedAt };
      }

      const rows = await tx.$queryRaw<Array<{ id: string; patientId: string; closedAt: Date }>>(
        Prisma.sql`
          UPDATE "PatientPortalMessageThread"
          SET "status" = 'CLOSED'::"PatientPortalMessageThreadStatus",
              "closedAt" = CURRENT_TIMESTAMP,
              "closedByUserId" = ${actor.userId},
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${thread.id}
            AND "facilityId" = ${actor.facilityId}
            AND "status" = 'OPEN'::"PatientPortalMessageThreadStatus"
          RETURNING "id", "patientId", "closedAt"
        `,
      );

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
