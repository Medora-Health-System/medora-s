import { BadRequestException, NotFoundException } from "@nestjs/common";
import { FhirDocumentReferenceService, mapDocumentReference } from "./fhir-document-reference.service";

describe("FHIR Phase 2C DocumentReference", () => {
  const row = {
    id: "doc-1",
    patientId: "patient-1",
    encounterId: "encounter-1",
    facilityId: "facility-1",
    category: "CLINICAL",
    type: "DISCHARGE_SUMMARY",
    status: "ACTIVE",
    title: "Discharge summary",
    fileName: "summary.pdf",
    mimeType: "application/pdf",
    fileSize: 1234,
    uploadedAt: new Date("2026-09-14T12:00:00.000Z"),
  };

  test("maps governed metadata without exposing storage path, notes, checksum, or file bytes", () => {
    const resource = mapDocumentReference(row);
    expect(resource).toMatchObject({
      resourceType: "DocumentReference",
      id: "doc-1",
      status: "current",
      subject: { reference: "Patient/patient-1" },
      custodian: { reference: "Organization/facility-1" },
      context: { encounter: [{ reference: "Encounter/encounter-1" }] },
      content: [{ attachment: { contentType: "application/pdf", title: "Discharge summary", size: 1234 } }],
    });
    expect(JSON.stringify(resource)).not.toMatch(/storagePath|checksum|notes|base64|data:/i);
  });

  test("direct read is facility scoped and excludes non-patient/non-clinical documents", async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new FhirDocumentReferenceService(
      { enterpriseDocument: { findFirst } } as never,
      {} as never,
    );
    await expect(service.read("facility-1", "doc-1")).rejects.toBeInstanceOf(NotFoundException);
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: "doc-1",
        facilityId: "facility-1",
        patientId: { not: null },
        status: "ACTIVE",
        category: { in: ["CLINICAL", "EMERGENCY", "REGISTRATION", "LEGAL"] },
      }),
    }));
  });

  test("search rejects categories outside the patient-document FHIR allowlist", async () => {
    const search = {
      parse: jest.fn().mockReturnValue({ count: 20, values: { category: "BILLING" } }),
      baseUrl: jest.fn().mockReturnValue("https://api.example/fhir"),
    };
    const service = new FhirDocumentReferenceService(
      { enterpriseDocument: { findMany: jest.fn() } } as never,
      search as never,
    );
    await expect(service.find("facility-1", { category: "BILLING" })).rejects.toBeInstanceOf(BadRequestException);
  });
});
