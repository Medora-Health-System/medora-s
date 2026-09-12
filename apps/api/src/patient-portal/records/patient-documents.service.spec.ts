import { NotFoundException } from "@nestjs/common";
import { PatientDocumentsService } from "./patient-documents.service";

describe("PatientDocumentsService", () => {
  const access = {
    portalAccountId: "portal-a",
    sessionId: "session-a",
    patientId: "patient-a",
    facilityId: "facility-a",
  };

  function build(overrides?: { rows?: any[]; stored?: any }) {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue(overrides?.rows ?? []),
    } as any;
    const storage = {
      read: jest.fn().mockResolvedValue(overrides?.stored ?? null),
    } as any;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
    return {
      prisma,
      storage,
      audit,
      service: new PatientDocumentsService(prisma, storage, audit),
    };
  }

  it("binds patient document list authorization to both facility and server-derived patient", async () => {
    const { prisma, service } = build();

    await service.listDocuments(access, {});

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const sql = prisma.$queryRaw.mock.calls[0][0];
    const text = sql.strings.join(" ");
    expect(text).toContain('d."facilityId" =');
    expect(text).toContain('d."patientId" =');
    expect(text).toContain('r."patientId" = d."patientId"');
    expect(text).toContain('r."facilityId" = d."facilityId"');
    expect(sql.values).toEqual(expect.arrayContaining(["facility-a", "patient-a"]));
  });

  it("makes an explicit revocation override automatic finalized-registration visibility", async () => {
    const { prisma, service } = build();

    await service.listDocuments(access, {});

    const sql = prisma.$queryRaw.mock.calls[0][0];
    const text = sql.strings.join(" ");
    expect(text).toContain('r."revokedAt" IS NULL');
    expect(text).toContain("AUTOMATIC_FINALIZED_REGISTRATION");
  });

  it("does not touch storage when the document is foreign, unreleased, revoked, or absent", async () => {
    const { service, storage, audit } = build({ rows: [] });

    await expect(service.getDocumentContent(access, "doc-b", {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(storage.read).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it("returns bytes only after an authorized row and never returns storagePath", async () => {
    const row = {
      id: "doc-a",
      encounterId: "enc-a",
      category: "CLINICAL",
      type: "DISCHARGE_SUMMARY",
      title: "Discharge summary",
      fileName: "summary.pdf",
      mimeType: "application/pdf",
      fileSize: 123,
      pageCount: 2,
      signatureStatus: "FINAL",
      lockedAt: null,
      uploadedAt: new Date("2026-09-12T12:00:00Z"),
      packetType: null,
      packetVersion: null,
      locale: null,
      finalizedAt: null,
      releaseBasis: "EXPLICIT_RELEASE",
      storagePath: "/private/path/doc-a.pdf",
    };
    const { service, storage, audit } = build({
      rows: [row],
      stored: { provider: "local", buffer: Buffer.from("pdf") },
    });

    const result = await service.getDocumentContent(access, "doc-a", {});

    expect(storage.read).toHaveBeenCalledWith("/private/path/doc-a.pdf", "doc-a");
    expect(result.buffer.equals(Buffer.from("pdf"))).toBe(true);
    expect(result.document).not.toHaveProperty("storagePath");
    expect(audit.record).toHaveBeenCalledWith(
      "PATIENT_PORTAL_DOCUMENT_DOWNLOAD",
      "ENTERPRISE_DOCUMENT",
      expect.objectContaining({
        facilityId: "facility-a",
        patientId: "patient-a",
        entityId: "doc-a",
      }),
    );
  });

  it("does not return storage details in list projections", async () => {
    const row = {
      id: "doc-a",
      encounterId: null,
      category: "REGISTRATION",
      type: "REGISTRATION_PACKET",
      title: "Registration",
      fileName: "registration.pdf",
      mimeType: "application/pdf",
      fileSize: 100,
      pageCount: 1,
      signatureStatus: "FINAL",
      lockedAt: null,
      uploadedAt: new Date("2026-09-12T12:00:00Z"),
      packetType: "REGISTRATION",
      packetVersion: "1.0",
      locale: "en",
      finalizedAt: new Date("2026-09-12T11:00:00Z"),
      releaseBasis: "AUTOMATIC_FINALIZED_REGISTRATION",
      storagePath: "/must-not-leak",
    };
    const { service } = build({ rows: [row] });

    const result = await service.listDocuments(access, {});

    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]).not.toHaveProperty("storagePath");
  });
});
