import { describe, expect, it } from "vitest";
import { buildMedicationAdministrationCandidate } from "./billingCaptureV1.js";

describe("buildMedicationAdministrationCandidate billing timestamps", () => {
  const documentedAtIso = "2026-05-16T14:42:00.000Z";
  const clinicalOnlyIso = "2026-05-16T17:30:00.000Z";

  it("uses documented atIso for serviceDate (never effective clinical time)", () => {
    const item = buildMedicationAdministrationCandidate({
      administrationId: "mar-1",
      encounterId: "enc-1",
      patientId: "pat-1",
      facilityId: "fac-1",
      medicationLabel: "Ondansetron",
      atIso: documentedAtIso,
    });
    expect(item.serviceDate).toBe(documentedAtIso);
    expect(item.createdAt).toBe(documentedAtIso);
    expect(item.serviceDate).not.toBe(clinicalOnlyIso);
  });

  it("candidate shape has no effectiveAdministeredAt field", () => {
    const item = buildMedicationAdministrationCandidate({
      administrationId: "mar-2",
      encounterId: "enc-1",
      patientId: "pat-1",
      facilityId: "fac-1",
      medicationLabel: "Saline",
      atIso: documentedAtIso,
    });
    expect("effectiveAdministeredAt" in (item as object)).toBe(false);
  });
});
