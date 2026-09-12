import { NotFoundException } from "@nestjs/common";
import { PatientDocumentReleaseService } from "./patient-document-release.service";

describe("PatientDocumentReleaseService", () => {
  const actor = {
    userId: "staff-a",
    facilityId: "facility-a",
    ip: "127.0.0.1",
    userAgent: "jest",
  };

  function build(document: any = {
    id: "doc-a",
    patientId: "patient-a",
    facilityId: "facility-a",
    category: "CLINICAL",
    type: "DISCHARGE_SUMMARY",
  }, patient: any = { id: "patient-a" }) {
    const tx = {
      enterpriseDocument: { findFirst: jest.fn().mockResolvedValue(document) },
      patient: { findFirst: jest.fn().mockResolvedValue(patient) },
      $executeRaw: jest.fn().mockResolvedValue(1),
    } as any;
    const prisma = {
      $transaction: jest.fn(async (fn: any) => fn(tx)),
    } as any;
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    return {
      tx,
      prisma,
      audit,
      service: new PatientDocumentReleaseService(prisma, audit),
    };
  }

  it("scopes staff release lookup to the authenticated facility and verifies the patient belongs there", async () => {
    const { service, tx } = build();

    await service.release("doc-a", actor);

    expect(tx.enterpriseDocument.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "doc-a", facilityId: "facility-a", status: "ACTIVE" },
      }),
    );
    expect(tx.patient.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "patient-a", facilityId: "facility-a" },
      }),
    );
  });

  it("never accepts a foreign or patient-less document for release", async () => {
    const { service, tx, audit } = build(null, null);

    await expect(service.release("doc-b", actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("writes release mutation and staff audit inside the same transaction", async () => {
    const { service, tx, audit } = build();

    const result = await service.release("doc-a", actor);

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledWith(
      expect.anything(),
      "PATIENT_DOCUMENT_RELEASE",
      expect.objectContaining({
        tx,
        critical: true,
        userId: "staff-a",
        facilityId: "facility-a",
        patientId: "patient-a",
        entityId: "doc-a",
        metadata: expect.objectContaining({ operation: "RELEASE" }),
      }),
    );
    expect(result.released).toBe(true);
  });

  it("records a revocation row even for an automatically visible finalized registration packet", async () => {
    const { service, tx, audit } = build({
      id: "doc-reg",
      patientId: "patient-a",
      facilityId: "facility-a",
      category: "REGISTRATION",
      type: "REGISTRATION_PACKET",
    });

    const result = await service.revoke("doc-reg", actor);

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    const sql = tx.$executeRaw.mock.calls[0][0];
    expect(sql.strings.join(" ")).toContain('"revokedAt"');
    expect(audit.log).toHaveBeenCalledWith(
      expect.anything(),
      "PATIENT_DOCUMENT_RELEASE",
      expect.objectContaining({
        metadata: expect.objectContaining({ operation: "REVOKE" }),
      }),
    );
    expect(result.released).toBe(false);
  });
});
