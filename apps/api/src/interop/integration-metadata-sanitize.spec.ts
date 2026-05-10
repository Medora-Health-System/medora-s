import {
  integrationMetadataAllowlist,
  sanitizeIntegrationAuditMetadata,
} from "./integration-metadata-sanitize";

describe("sanitizeIntegrationAuditMetadata", () => {
  it("keeps only allowlisted primitive fields", () => {
    const out = sanitizeIntegrationAuditMetadata({
      sourceSystem: "TEST_HL7",
      messageKind: "ORU_R01",
      correlationId: "abc-123",
      codingSystem: "LN",
      codingCode: "2345-7",
      eventType: "result_received",
      hl7MessageType: "ORU^R01",
      fhirResourceType: "DiagnosticReport",
      externalMessageId: "msg-001",
    });
    expect(out).toEqual({
      sourceSystem: "TEST_HL7",
      messageKind: "ORU_R01",
      correlationId: "abc-123",
      codingSystem: "LN",
      codingCode: "2345-7",
      eventType: "result_received",
      hl7MessageType: "ORU^R01",
      fhirResourceType: "DiagnosticReport",
      externalMessageId: "msg-001",
    });
  });

  it("drops patient-identifying and narrative keys", () => {
    const out = sanitizeIntegrationAuditMetadata({
      correlationId: "ok",
      patientName: "DOE^JANE",
      mrn: "12345",
      obxValue: "POSITIVE HIV",
      address: "1 Main St",
      nested: { foo: "bar" },
    });
    expect(out).toEqual({ correlationId: "ok" });
  });

  it("truncates long strings", () => {
    const long = "x".repeat(400);
    const out = sanitizeIntegrationAuditMetadata({ correlationId: long });
    expect((out.correlationId as string).length).toBe(256);
  });

  it("returns empty for non-objects", () => {
    expect(sanitizeIntegrationAuditMetadata(null)).toEqual({});
    expect(sanitizeIntegrationAuditMetadata(undefined)).toEqual({});
    expect(sanitizeIntegrationAuditMetadata("string")).toEqual({});
    expect(sanitizeIntegrationAuditMetadata([1, 2])).toEqual({});
  });

  it("exposes allowlist for documentation parity tests", () => {
    expect(integrationMetadataAllowlist().has("correlationId")).toBe(true);
    expect(integrationMetadataAllowlist().has("patientName")).toBe(false);
  });
});
