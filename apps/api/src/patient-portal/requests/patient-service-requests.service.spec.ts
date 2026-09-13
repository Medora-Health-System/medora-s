import { ConflictException, NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { createPatientServiceRequestSchema, patientServiceRequestDecisionSchema } from "./patient-service-request.schemas";
import { PatientServiceRequestsService } from "./patient-service-requests.service";

describe("PatientServiceRequestsService", () => {
  const access = { portalAccountId: "portal-a", sessionId: "session-a", patientId: "patient-a", facilityId: "facility-a" };
  const actor = { userId: "provider-a", facilityId: "facility-a" };
  const appointmentId = "11111111-1111-4111-8111-111111111111";
  const requestRow = {
    id: "request-a", portalAccountId: "portal-a", patientId: "patient-a", facilityId: "facility-a",
    type: "APPOINTMENT_CHANGE", status: "PENDING", appointmentId, medicationOrderItemId: null,
    preferredStartAt: new Date("2026-12-01T15:00:00Z"), reason: "Need another time",
    reviewedByUserId: null, reviewedAt: null, resolutionCode: null,
    createdAt: new Date("2026-09-13T00:00:00Z"), updatedAt: new Date("2026-09-13T00:00:00Z"),
  };

  function build() {
    const tx = { $queryRaw: jest.fn(), $executeRaw: jest.fn().mockResolvedValue(1) } as any;
    const prisma = { $queryRaw: jest.fn(), $transaction: jest.fn(async (fn: any) => fn(tx)) } as any;
    const staffAudit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    return { tx, prisma, staffAudit, service: new PatientServiceRequestsService(prisma, staffAudit) };
  }

  it("strictly rejects patient-controlled identity and workflow fields", () => {
    expect(createPatientServiceRequestSchema.safeParse({ type: "APPOINTMENT_NEW", preferredStartAt: "2026-12-01T15:00:00Z", patientId: "patient-b" }).success).toBe(false);
    expect(createPatientServiceRequestSchema.safeParse({ type: "MEDICATION_REFILL", medicationOrderItemId: "22222222-2222-4222-8222-222222222222", status: "ACCEPTED" }).success).toBe(false);
  });

  it("binds appointment references to server-derived patient and facility", async () => {
    const { tx, service } = build();
    tx.$queryRaw.mockResolvedValueOnce([{ id: appointmentId, status: "SCHEDULED" }]).mockResolvedValueOnce([requestRow]);
    await service.create(access, { type: "APPOINTMENT_CHANGE", appointmentId, preferredStartAt: new Date("2026-12-01T15:00:00Z"), reason: "Need another time" }, {});
    const lookup = tx.$queryRaw.mock.calls[0][0];
    expect(lookup.strings.join(" ")).toContain('"facilityId" =');
    expect(lookup.strings.join(" ")).toContain('"patientId" =');
    expect(lookup.values).toEqual(expect.arrayContaining(["facility-a", "patient-a"]));
  });

  it("rejects a medication reference outside the patient/facility prescription authority", async () => {
    const { tx, service } = build();
    tx.$queryRaw.mockResolvedValueOnce([]);
    await expect(service.create(access, { type: "MEDICATION_REFILL", medicationOrderItemId: "22222222-2222-4222-8222-222222222222" }, {})).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it("does not mutate authoritative appointment or order records when creating a request", async () => {
    const { tx, service } = build();
    tx.$queryRaw.mockResolvedValueOnce([{ id: appointmentId, status: "SCHEDULED" }]).mockResolvedValueOnce([requestRow]);
    await service.create(access, { type: "APPOINTMENT_CANCEL", appointmentId }, {});
    const statements = tx.$queryRaw.mock.calls.map((call: any[]) => call[0].strings.join(" ")).join(" ");
    expect(statements).toContain('INSERT INTO "PatientPortalServiceRequest"');
    expect(statements).not.toContain('UPDATE "Appointment"');
    expect(statements).not.toContain('UPDATE "Order"');
    expect(statements).not.toContain('UPDATE "OrderItem"');
  });

  it("writes patient mutation audit in the same transaction without free-text reason", async () => {
    const { tx, service } = build();
    tx.$queryRaw.mockResolvedValueOnce([{ id: appointmentId, status: "SCHEDULED" }]).mockResolvedValueOnce([requestRow]);
    await service.create(access, { type: "APPOINTMENT_CANCEL", appointmentId, reason: "Private scheduling explanation" }, {});
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    const auditSql = tx.$executeRaw.mock.calls[0][0];
    expect(auditSql.strings.join(" ")).toContain('INSERT INTO "PatientPortalAuditLog"');
    expect(auditSql.values.some((v: unknown) => typeof v === "string" && v.includes("Private scheduling explanation"))).toBe(false);
  });

  it("keeps provider decisions separate from authoritative clinical/scheduling records", async () => {
    const { tx, staffAudit, service } = build();
    tx.$queryRaw
      .mockResolvedValueOnce([requestRow])
      .mockResolvedValueOnce([{ ...requestRow, status: "ACCEPTED", reviewedByUserId: "provider-a", reviewedAt: new Date(), resolutionCode: "REQUEST_ACCEPTED" }]);
    const result = await service.decideStaff(actor, "request-a", { status: "ACCEPTED", resolutionCode: "REQUEST_ACCEPTED" });
    const statements = tx.$queryRaw.mock.calls.map((call: any[]) => call[0].strings.join(" ")).join(" ");
    expect(statements).toContain('UPDATE "PatientPortalServiceRequest"');
    expect(statements).not.toContain('UPDATE "Appointment"');
    expect(statements).not.toContain('UPDATE "Order"');
    expect(result.authoritativeRecordChanged).toBe(false);
    expect(staffAudit.log).toHaveBeenCalledWith(AuditAction.UPDATE, "PATIENT_PORTAL_SERVICE_REQUEST", expect.objectContaining({ tx, critical: true, facilityId: "facility-a", patientId: "patient-a" }));
  });

  it("rejects backward or terminal status transitions", async () => {
    const { tx, service } = build();
    tx.$queryRaw.mockResolvedValueOnce([{ ...requestRow, status: "ACCEPTED" }]);
    await expect(service.decideStaff(actor, "request-a", { status: "DECLINED", resolutionCode: "REQUEST_DECLINED" })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("only permits matching decision status and resolution code pairs", () => {
    expect(patientServiceRequestDecisionSchema.safeParse({ status: "ACCEPTED", resolutionCode: "REQUEST_DECLINED" }).success).toBe(false);
    expect(patientServiceRequestDecisionSchema.safeParse({ status: "DECLINED", resolutionCode: "REQUEST_DECLINED" }).success).toBe(true);
  });

  it("blocks requests against completed appointments", async () => {
    const { tx, service } = build();
    tx.$queryRaw.mockResolvedValueOnce([{ id: appointmentId, status: "COMPLETED" }]);
    await expect(service.create(access, { type: "APPOINTMENT_CHANGE", appointmentId, preferredStartAt: new Date("2026-12-01T15:00:00Z") }, {})).rejects.toBeInstanceOf(ConflictException);
  });
});
