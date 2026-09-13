import { ConflictException, NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import {
  createPatientMessageThreadSchema,
  patientMessageReplySchema,
} from "./patient-messages.schemas";
import { PatientMessagesService } from "./patient-messages.service";

describe("PatientMessagesService", () => {
  const access = {
    portalAccountId: "portal-a",
    sessionId: "session-a",
    patientId: "patient-a",
    facilityId: "facility-a",
  };
  const actor = {
    userId: "staff-a",
    facilityId: "facility-a",
    ip: "127.0.0.1",
    userAgent: "jest",
  };

  const thread = {
    id: "thread-a",
    portalAccountId: "portal-a",
    patientId: "patient-a",
    facilityId: "facility-a",
    category: "CLINICAL",
    subject: "Question",
    status: "OPEN",
    lastMessageAt: new Date("2026-09-12T12:00:00Z"),
    closedAt: null,
    createdAt: new Date("2026-09-12T12:00:00Z"),
    updatedAt: new Date("2026-09-12T12:00:00Z"),
  };

  const patientMessage = {
    id: "message-a",
    threadId: "thread-a",
    senderType: "PATIENT",
    senderPortalAccountId: "portal-a",
    senderUserId: null,
    body: "I have a question.",
    createdAt: new Date("2026-09-12T12:00:00Z"),
  };

  function build() {
    const tx = {
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn().mockResolvedValue(1),
    } as any;
    const prisma = {
      $queryRaw: jest.fn(),
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    } as any;
    const patientAudit = { record: jest.fn().mockResolvedValue(undefined) } as any;
    const staffAudit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    return {
      tx,
      prisma,
      patientAudit,
      staffAudit,
      service: new PatientMessagesService(prisma, patientAudit, staffAudit),
    };
  }

  it("uses portal account + server-derived patient + facility for patient thread authorization", async () => {
    const { prisma, service } = build();
    prisma.$queryRaw
      .mockResolvedValueOnce([thread])
      .mockResolvedValueOnce([patientMessage]);

    await service.getPatientThread(access, "thread-a", {});

    const sql = prisma.$queryRaw.mock.calls[0][0];
    const text = sql.strings.join(" ");
    expect(text).toContain('"id" =');
    expect(text).toContain('"portalAccountId" =');
    expect(text).toContain('"patientId" =');
    expect(text).toContain('"facilityId" =');
    expect(sql.values).toEqual(
      expect.arrayContaining(["thread-a", "portal-a", "patient-a", "facility-a"]),
    );
  });

  it("never exposes staff user ids or portal account ids in the patient message projection", async () => {
    const { prisma, service } = build();
    prisma.$queryRaw
      .mockResolvedValueOnce([thread])
      .mockResolvedValueOnce([
        {
          ...patientMessage,
          id: "message-staff",
          senderType: "STAFF",
          senderPortalAccountId: null,
          senderUserId: "staff-secret-id",
          body: "Your care team replied.",
        },
      ]);

    const result = await service.getPatientThread(access, "thread-a", {});

    expect(result).not.toHaveProperty("portalAccountId");
    expect(result).not.toHaveProperty("patientId");
    expect(result.messages[0]).toEqual(
      expect.objectContaining({ sender: "CARE_TEAM", body: "Your care team replied." }),
    );
    expect(result.messages[0]).not.toHaveProperty("senderUserId");
    expect(result.messages[0]).not.toHaveProperty("senderPortalAccountId");
  });

  it("creates patient messages and their audit record atomically without copying message text into audit metadata", async () => {
    const { tx, service } = build();
    tx.$queryRaw
      .mockResolvedValueOnce([thread])
      .mockResolvedValueOnce([patientMessage]);

    await service.createPatientThread(
      access,
      {
        category: "CLINICAL",
        subject: "Question",
        message: "I have a question.",
      },
      { ip: "127.0.0.1", userAgent: "jest" },
    );

    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    const threadInsert = tx.$queryRaw.mock.calls[0][0];
    expect(threadInsert.values).toEqual(
      expect.arrayContaining(["portal-a", "patient-a", "facility-a", "CLINICAL", "Question"]),
    );

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    const auditSql = tx.$executeRaw.mock.calls[0][0];
    expect(auditSql.strings.join(" ")).toContain('INSERT INTO "PatientPortalAuditLog"');
    expect(auditSql.values).not.toContain("I have a question.");
    expect(
      auditSql.values.some(
        (value: unknown) => typeof value === "string" && value.includes("I have a question."),
      ),
    ).toBe(false);
  });

  it("returns 404 before inserting when a patient thread is outside the verified access tuple", async () => {
    const { tx, service } = build();
    tx.$queryRaw.mockResolvedValueOnce([]);

    await expect(
      service.replyAsPatient(access, "foreign-thread", { message: "Hello" }, {}),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it("does not append messages to closed threads", async () => {
    const { tx, service } = build();
    tx.$queryRaw.mockResolvedValueOnce([{ ...thread, status: "CLOSED", closedAt: new Date() }]);

    await expect(
      service.replyAsPatient(access, "thread-a", { message: "Hello" }, {}),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it("scopes staff thread access to the authenticated facility before reply and uses critical staff audit", async () => {
    const { tx, staffAudit, service } = build();
    tx.$queryRaw
      .mockResolvedValueOnce([thread])
      .mockResolvedValueOnce([
        {
          ...patientMessage,
          id: "message-staff",
          senderType: "STAFF",
          senderPortalAccountId: null,
          senderUserId: "staff-a",
          body: "Care team response",
        },
      ]);

    await service.replyAsStaff(actor, "thread-a", { message: "Care team response" });

    const lookupSql = tx.$queryRaw.mock.calls[0][0];
    expect(lookupSql.strings.join(" ")).toContain('"facilityId" =');
    expect(lookupSql.values).toEqual(expect.arrayContaining(["thread-a", "facility-a"]));
    expect(staffAudit.log).toHaveBeenCalledWith(
      AuditAction.CREATE,
      "PATIENT_PORTAL_MESSAGE",
      expect.objectContaining({
        tx,
        critical: true,
        userId: "staff-a",
        facilityId: "facility-a",
        patientId: "patient-a",
      }),
    );
    const auditInput = staffAudit.log.mock.calls[0][2];
    expect(JSON.stringify(auditInput.metadata)).not.toContain("Care team response");
  });

  it("strictly rejects patient-controlled routing or identity fields", () => {
    expect(
      createPatientMessageThreadSchema.safeParse({
        category: "CLINICAL",
        subject: "Question",
        message: "Hello",
        patientId: "patient-b",
      }).success,
    ).toBe(false);
    expect(
      createPatientMessageThreadSchema.safeParse({
        category: "CLINICAL",
        subject: "Question",
        message: "Hello",
        targetUserId: "provider-b",
      }).success,
    ).toBe(false);
    expect(
      patientMessageReplySchema.safeParse({
        message: "Hello",
        attachmentId: "file-not-allowed-in-v1",
      }).success,
    ).toBe(false);
  });
});
