import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONNECTED_INPATIENT_ADMISSION_INTAKE_CERTIFICATION_ID,
  PATIENT_SEARCH_MIN_MEANINGFUL_CHARS,
  admissionIntakeMayCreatePatient,
  canStartInpatientEncounterFromIntake,
  isBedSelectableForAdmissionIntake,
  patientSearchQueryIsEligible,
  resolveAuthoritativePatientId,
  typedPatientTextIsAuthoritativeIdentity,
  INPATIENT_ADMISSION_CLINICAL_SECTIONS,
} from "@medora/shared";

const intakeSrc = readFileSync(
  join(__dirname, "HospitalAdmissionIntakeView.tsx"),
  "utf8"
);
const searchSrc = readFileSync(
  join(
    __dirname,
    "../../components/patients/PatientSearchAndSelect.tsx"
  ),
  "utf8"
);
const shellSrc = readFileSync(
  join(
    __dirname,
    "../inpatient-workspace/InpatientAdmissionClinicalShell.tsx"
  ),
  "utf8"
);
const registrationSrc = readFileSync(
  join(__dirname, "../../../app/app/registration/page.tsx"),
  "utf8"
);

describe("D4A.0 connected inpatient admission intake (web)", () => {
  it("certification id is stable", () => {
    expect(CONNECTED_INPATIENT_ADMISSION_INTAKE_CERTIFICATION_ID).toBe(
      "MEDUI.CONNECTED_INPATIENT_ADMISSION_INTAKE.D4A0"
    );
  });

  it("shares PatientSearchAndSelect between Registration and Admission Intake", () => {
    expect(registrationSrc).toContain("PatientSearchAndSelect");
    expect(intakeSrc).toContain("PatientSearchAndSelect");
    expect(searchSrc).toContain("patientSearchQueryIsEligible");
  });

  it("requires 3 meaningful characters and never treats typed text as identity", () => {
    expect(PATIENT_SEARCH_MIN_MEANINGFUL_CHARS).toBe(3);
    expect(patientSearchQueryIsEligible("ab")).toBe(false);
    expect(patientSearchQueryIsEligible("abc")).toBe(true);
    expect(typedPatientTextIsAuthoritativeIdentity()).toBe(false);
    expect(admissionIntakeMayCreatePatient()).toBe(false);
    expect(
      resolveAuthoritativePatientId({
        selectedPatientId: null,
        typedQuery: "Jesenia Rodriguez",
      })
    ).toBeNull();
  });

  it("keeps Start Inpatient Encounter gated on selected patient, confirmation, bed, and clinical fields", () => {
    expect(
      canStartInpatientEncounterFromIntake({
        selectedPatientId: null,
        demographicsConfirmed: true,
        admissionSource: "DIRECT",
        requestedUnit: "MS",
        assignedBedKey: "MS:1",
        admissionDiagnosis: "Pneumonia",
        reasonForAdmission: "Hypoxia",
        admittingService: "HOSPITAL_MEDICINE",
        requestedLevelOfCare: "MEDICAL_SURGICAL",
      })
    ).toBe(false);
    expect(
      canStartInpatientEncounterFromIntake({
        selectedPatientId: "p-1",
        demographicsConfirmed: false,
        admissionSource: "DIRECT",
        requestedUnit: "MS",
        assignedBedKey: "MS:1",
        admissionDiagnosis: "Pneumonia",
        reasonForAdmission: "Hypoxia",
        admittingService: "HOSPITAL_MEDICINE",
        requestedLevelOfCare: "MEDICAL_SURGICAL",
      })
    ).toBe(false);
    expect(
      canStartInpatientEncounterFromIntake({
        selectedPatientId: "p-1",
        demographicsConfirmed: true,
        admissionSource: "DIRECT",
        requestedUnit: "MS",
        assignedBedKey: "MS:1",
        admissionDiagnosis: "Pneumonia",
        reasonForAdmission: "Hypoxia",
        admittingService: "HOSPITAL_MEDICINE",
        requestedLevelOfCare: "MEDICAL_SURGICAL",
      })
    ).toBe(true);
    expect(intakeSrc).toContain("assigned-bed-select");
    expect(intakeSrc).toContain("confirm-patient-demographics");
    expect(intakeSrc).toContain("start-inpatient-encounter");
    expect(intakeSrc).toContain("open-registration");
    expect(intakeSrc).not.toContain("bedOptional");
  });

  it("only AVAILABLE beds are selectable for admission intake", () => {
    expect(isBedSelectableForAdmissionIntake("AVAILABLE")).toBe(true);
    expect(isBedSelectableForAdmissionIntake("OCCUPIED")).toBe(false);
    expect(isBedSelectableForAdmissionIntake("DIRTY")).toBe(false);
    expect(isBedSelectableForAdmissionIntake("CLEANING")).toBe(false);
    expect(isBedSelectableForAdmissionIntake("BLOCKED")).toBe(false);
    expect(isBedSelectableForAdmissionIntake("RESERVED")).toBe(false);
  });

  it("redirects to inpatient admission section and mounts clinical shell", () => {
    expect(intakeSrc).toContain("?section=admission");
    expect(shellSrc).toContain("inpatient-admission-clinical-shell");
    expect(INPATIENT_ADMISSION_CLINICAL_SECTIONS.length).toBeGreaterThanOrEqual(20);
  });
});
