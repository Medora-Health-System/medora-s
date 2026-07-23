import { describe, expect, it } from "vitest";
import {
  buildSmartAdmissionProposals,
  recommendAdmittingServiceFromContext,
  recommendLevelOfCareFromContext,
} from "./smartAdmissionProposalsD4a2.js";
import {
  markFieldPhysicianEdited,
  validateSmartAdmissionServiceLocCompatibility,
} from "./smartAdmissionPacketD4a2.js";
import {
  isHomeNursingForbiddenForPathway,
  nursingSectionsForPathway,
  validateAdaptiveNursingAgainstDisposition,
  admissionNursingDepartureRequirementsMet,
} from "./adaptiveEdNursingExecutionD4a2.js";
import { inferPlacementEncounterTypeFromCareLevel } from "./admissionSummaryMerge.js";

describe("D4A.2 smart admission proposals", () => {
  it("builds reason/plan only from documented sources (no fabrication)", () => {
    const packet = buildSmartAdmissionProposals({
      chiefComplaint: "Chest pain",
      primaryDiagnosisDisplay: "I21.9 — AMI",
      abnormalResultLines: ["Troponin elevated"],
      activeMedicationOrderLines: ["Aspirin 325 mg"],
      providerPlan: "Admit for ACS pathway",
    });
    expect(packet.fields.admissionReason?.origin).toBe("SYSTEM_PROPOSAL");
    expect(packet.fields.admissionReason?.value).toContain("Chest pain");
    expect(packet.fields.admissionReason?.value).toContain("Troponin");
    expect(packet.fields.admissionReason?.sources.some((s) => s.kind === "CHIEF_COMPLAINT")).toBe(
      true
    );
    expect(packet.fields.initialPlan?.value).toContain("Active order");
    expect(packet.fields.initialPlan?.value).toContain("Aspirin");
    expect(packet.structuredInitialPlan?.items.some((i) => i.status === "ACTIVE_ORDER")).toBe(true);
    expect(packet.conditionStatus).toBeNull();
  });

  it("does not invent reason when chart is empty", () => {
    const packet = buildSmartAdmissionProposals({});
    expect(packet.fields.admissionReason).toBeUndefined();
    expect(packet.fields.initialPlan).toBeUndefined();
  });

  it("persists physician edits as PHYSICIAN_EDITED", () => {
    const proposed = buildSmartAdmissionProposals({
      chiefComplaint: "Fever",
      primaryDiagnosisDisplay: "J18.9",
    });
    const edited = markFieldPhysicianEdited(
      proposed.fields.admissionReason,
      "Physician final reason text"
    );
    expect(edited.origin).toBe("PHYSICIAN_EDITED");
    expect(edited.value).toBe("Physician final reason text");
    expect(edited.physicianConfirmed).toBe(true);
  });

  it("recommends service/LOC from documented cues only", () => {
    expect(
      recommendAdmittingServiceFromContext({
        primaryDiagnosisDisplay: "STEMI",
      }).code
    ).toBe("CARDIOLOGY");
    expect(
      recommendLevelOfCareFromContext({
        providerPlan: "Needs ICU vasopressors",
      }).code
    ).toBe("INTENSIVE_CARE");
  });

  it("validates service and level-of-care compatibility", () => {
    expect(
      validateSmartAdmissionServiceLocCompatibility({
        admittingServiceCode: "OTHER",
        admittingServiceOtherClarification: "",
        levelOfCareCode: "MEDICAL_SURGICAL",
      }).ok
    ).toBe(false);
    expect(
      validateSmartAdmissionServiceLocCompatibility({
        admittingServiceCode: "HOSPITAL_MEDICINE",
        levelOfCareCode: "MEDICAL_SURGICAL",
        requestedUnitCode: "MS",
      }).ok
    ).toBe(true);
    expect(
      validateSmartAdmissionServiceLocCompatibility({
        admittingServiceCode: "CRITICAL_CARE",
        levelOfCareCode: "MEDICAL_SURGICAL",
      }).errors
    ).toContain("SERVICE_LOC_INCOMPATIBLE");
  });

  it("maps OBSERVATION care level code to placement OBSERVATION", () => {
    expect(inferPlacementEncounterTypeFromCareLevel("OBSERVATION")).toBe("OBSERVATION");
    expect(inferPlacementEncounterTypeFromCareLevel("MEDICAL_SURGICAL")).toBe("INPATIENT");
  });
});

describe("D4A.2 adaptive nursing", () => {
  it("forbids HOME nursing for non-HOME pathways and exposes pathway sections", () => {
    expect(isHomeNursingForbiddenForPathway("ADMISSION")).toBe(true);
    expect(isHomeNursingForbiddenForPathway("TRANSFER")).toBe(true);
    expect(isHomeNursingForbiddenForPathway("HOME")).toBe(false);
    expect(nursingSectionsForPathway("ADMISSION")).toContain("handoff");
    expect(nursingSectionsForPathway("TRANSFER")).toContain("acceptingFacility");
    expect(nursingSectionsForPathway("AMA")).toContain("risksExplained");
    expect(nursingSectionsForPathway("LWBS")).toContain("attemptsToLocate");
    // D4A.2.1 — HOME completion contract fields exist for evaluators; UI still hides HOME form for non-HOME.
    expect(nursingSectionsForPathway("HOME")).toContain("dischargeVitals");
  });

  it("blocks contradictory nursing states", () => {
    expect(
      validateAdaptiveNursingAgainstDisposition({
        physicianPathway: "ADMISSION",
        nursingPathway: "ADMISSION",
        admissionDecisionSigned: false,
      }).errors
    ).toContain("ADMISSION_NURSING_WITHOUT_SIGNED_DECISION");
    expect(
      validateAdaptiveNursingAgainstDisposition({
        physicianPathway: "TRANSFER",
        nursingPathway: "TRANSFER",
        admissionDecisionSigned: true,
        acceptingFacility: "",
      }).errors
    ).toContain("TRANSFER_WITHOUT_ACCEPTING_FACILITY");
    expect(
      validateAdaptiveNursingAgainstDisposition({
        physicianPathway: "ADMISSION",
        nursingPathway: "HOME",
        admissionDecisionSigned: true,
        homeNursingPresent: true,
      }).errors
    ).toContain("HOME_NURSING_WITH_NON_HOME_DISPOSITION");
  });

  it("requires admission departure fields before completion", () => {
    const filled = Object.fromEntries(
      nursingSectionsForPathway("ADMISSION").map((id) => [id, "documented"])
    );
    expect(admissionNursingDepartureRequirementsMet(filled)).toBe(true);
    expect(admissionNursingDepartureRequirementsMet({ handoff: "x" })).toBe(false);
  });
});
