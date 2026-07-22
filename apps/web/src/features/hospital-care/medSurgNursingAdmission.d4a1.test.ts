import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MEDSURG_NURSING_ADMISSION_CERTIFICATION_ID,
  patientOwnsLongitudinalRecord,
  encounterOwnsVerificationNotDuplicateHistory,
  admissionMustNotSilentlyOverwritePatientHistory,
  homeMedicationsMustNotAutoConvertToInpatientOrders,
  HEAD_TO_TOE_SYSTEM_KEYS,
  buildAdmissionPreloadFromPatientProfile,
  emptyPatientClinicalHistoryProfile,
  applyHistoryVerification,
} from "@medora/shared";

const shellSrc = readFileSync(
  join(__dirname, "../inpatient-workspace/InpatientAdmissionClinicalShell.tsx"),
  "utf8"
);
const opsApiSrc = readFileSync(join(__dirname, "inpatientOperationsApi.ts"), "utf8");

describe("D4A.1 Med/Surg nursing admission (web)", () => {
  it("certification id is stable", () => {
    expect(MEDSURG_NURSING_ADMISSION_CERTIFICATION_ID).toBe(
      "MEDUI.MEDSURG_NURSING_ADMISSION.D4A1"
    );
  });

  it("enforces longitudinal invariants", () => {
    expect(patientOwnsLongitudinalRecord()).toBe(true);
    expect(encounterOwnsVerificationNotDuplicateHistory()).toBe(true);
    expect(admissionMustNotSilentlyOverwritePatientHistory()).toBe(true);
    expect(homeMedicationsMustNotAutoConvertToInpatientOrders()).toBe(true);
  });

  it("preloads history unverified and requires verification", () => {
    const profile = {
      ...emptyPatientClinicalHistoryProfile(),
      medicalHistory: { pastMedicalHistory: "Hypertension" },
    };
    const items = buildAdmissionPreloadFromPatientProfile({ profile });
    expect(items.some((i) => i.domain === "MEDICAL_HISTORY")).toBe(true);
    const item = items.find((i) => i.domain === "MEDICAL_HISTORY")!;
    expect(item.provenance.verified).toBe(false);
    const verified = applyHistoryVerification({
      item,
      status: "CONFIRMED",
      actorUserId: "rn-1",
    });
    expect(verified.provenance.verified).toBe(true);
    expect(verified.provenance.verificationStatus).toBe("CONFIRMED");
  });

  it("shell wires durable nursing admission API and head-to-toe reuse", () => {
    expect(shellSrc).toContain("fetchNursingAdmissionDocumentation");
    expect(shellSrc).toContain("verifyNursingAdmissionPreloadItem");
    expect(shellSrc).toContain("signNursingAdmission");
    expect(shellSrc).toContain("admission-nurse-sign");
    expect(opsApiSrc).toContain("nursing-admission");
    expect(HEAD_TO_TOE_SYSTEM_KEYS.length).toBeGreaterThanOrEqual(12);
  });
});
