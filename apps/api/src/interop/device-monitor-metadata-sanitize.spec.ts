import {
  deviceObservationAuditMetadataAllowlist,
  MAX_DEVICE_MEASUREMENT_TYPES_IN_AUDIT,
  sanitizeDeviceObservationAuditMetadata,
} from "./device-monitor-metadata-sanitize";

describe("sanitizeDeviceObservationAuditMetadata", () => {
  it("keeps allowlisted fields only", () => {
    expect(
      sanitizeDeviceObservationAuditMetadata({
        facilityId: "fac-1",
        deviceId: "mon-42",
        encounterId: "enc-9",
        patientId: "pat-7",
        observationStatus: "pending_clinical_review",
        matchConfidence: "LOW",
        sourceKind: "DEVICE",
        measurementTypes: ["HR", "SPO2", "NIBP_SYS"],
        receivedAt: "2026-05-10T12:00:00.000Z",
      })
    ).toEqual({
      facilityId: "fac-1",
      deviceId: "mon-42",
      encounterId: "enc-9",
      patientId: "pat-7",
      observationStatus: "pending_clinical_review",
      matchConfidence: "LOW",
      sourceKind: "DEVICE",
      measurementTypes: ["HR", "SPO2", "NIBP_SYS"],
      receivedAt: "2026-05-10T12:00:00.000Z",
    });
  });

  it("removes patient name, MRN, notes, raw payload, and numeric vitals", () => {
    const out = sanitizeDeviceObservationAuditMetadata({
      facilityId: "fac-1",
      patientName: "Jane Doe",
      mrn: "MRN-999",
      notes: "Patient looks pale",
      rawPayload: "MSH|^~\\&|...",
      hr: 120,
      spo2: 88,
      bpSys: 180,
      vitals: { hr: 100 },
      observationStatus: "received",
    });
    expect(out).toEqual({
      facilityId: "fac-1",
      observationStatus: "received",
    });
  });

  it("drops non-string entries in measurementTypes and caps array size", () => {
    const types = Array.from({ length: 40 }, (_, i) => `T${i}`);
    const out = sanitizeDeviceObservationAuditMetadata({
      facilityId: "f",
      measurementTypes: ["HR", 123, null, "SPO2", ...types],
    });
    expect(Array.isArray(out.measurementTypes)).toBe(true);
    expect((out.measurementTypes as string[]).length).toBe(MAX_DEVICE_MEASUREMENT_TYPES_IN_AUDIT);
    expect((out.measurementTypes as string[]).includes("HR")).toBe(true);
    expect((out.measurementTypes as string[]).includes("T29")).toBe(true);
    expect((out.measurementTypes as string[]).includes("T30")).toBe(false);
  });

  it("truncates long strings", () => {
    const long = "x".repeat(200);
    const out = sanitizeDeviceObservationAuditMetadata({ deviceId: long });
    expect((out.deviceId as string).length).toBe(128);
  });

  it("returns empty for non-objects", () => {
    expect(sanitizeDeviceObservationAuditMetadata(null)).toEqual({});
    expect(sanitizeDeviceObservationAuditMetadata("x")).toEqual({});
    expect(sanitizeDeviceObservationAuditMetadata([1])).toEqual({});
  });

  it("exposes allowlist for parity checks", () => {
    expect(deviceObservationAuditMetadataAllowlist().has("receivedAt")).toBe(true);
    expect(deviceObservationAuditMetadataAllowlist().has("notes")).toBe(false);
  });
});
