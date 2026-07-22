import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("ED admission decision Phase A boundary", () => {
  it("wires ADMISSION save/sign to POST /admission/decision (not PATCH admissionSummaryJson)", () => {
    const panel = readSrc("features/emergency/EmergencyDispositionPanel.tsx");
    expect(panel).toContain("/admission/decision");
    expect(panel).toContain("signAdmissionButton");
    expect(panel).toContain("primaryDiagnosisId");
    expect(panel).toContain("admission-primary-diagnosis");
    // Must not assign admissionSummaryJson on generic PATCH body for ADMISSION writer path
    expect(panel).not.toMatch(/body\.admissionSummaryJson\s*=/);
  });

  it("gates HOME nursing execution on non-HOME disposition", () => {
    const workspace = readSrc("features/emergency/EmergencyActiveWorkspaceView.tsx");
    expect(workspace).toContain("showHomeNursingDischargeExecution");
    expect(workspace).toContain("erDispositionBadgeFromEncounterJson");
  });

  it("maps coded direct-admission errors with requestId in intake", () => {
    const intake = readSrc("features/hospital-care/HospitalAdmissionIntakeView.tsx");
    expect(intake).toContain("isDirectAdmissionErrorCode");
    expect(intake).toContain("hospitalAdmissionD4a0.errors.");
    expect(intake).toContain("requestId");
  });

  it("mirrors admission i18n keys in EN and FR", () => {
    const en = readSrc("i18n/messages/en.ts");
    const fr = readSrc("i18n/messages/fr.ts");
    for (const key of [
      "signAdmissionButton",
      "signAdmissionOk",
      "labelAdmissionDiagnoses",
      "primaryAdmissionDiagnosis",
      "errors: {",
      "PATIENT_NOT_FOUND_IN_FACILITY",
    ]) {
      expect(en).toContain(key);
      expect(fr).toContain(key);
    }
  });
});
