import { describe, expect, it } from "vitest";
import {
  buildSmartAdmissionProposals,
} from "./smartAdmissionProposalsD4a2.js";
import {
  markFieldPhysicianEdited,
  mergeProposalFieldWithoutOverwrite,
  readAdmissionPacketV1,
  replaceFieldWithUpdatedProposal,
  validateSmartAdmissionServiceLocCompatibility,
  isServiceLevelOfCareCompatible,
} from "./smartAdmissionPacketD4a2.js";
import {
  evaluateAdmissionSignRequirements,
  provenanceDisplayKey,
} from "./smartAdmissionClinicalHardeningD4a21.js";
import {
  evaluateAdaptiveNursingCompletion,
  isHomeNursingForbiddenForPathway,
  nursingSectionsForPathway,
  validateAdaptiveNursingAgainstDisposition,
} from "./adaptiveEdNursingExecutionD4a2.js";
import { mergeAdmissionSummaryFieldsPreservingNested } from "./admissionSummaryMerge.js";

describe("D4A.2.1 proposal sources and provenance", () => {
  it("marks proposals RULE_BASED with sourceType and no fabricated sources", () => {
    const packet = buildSmartAdmissionProposals({
      chiefComplaint: "Abdominal pain",
      primaryDiagnosisDisplay: "K35.80 — Appendicitis",
      primaryDiagnosisId: "dx-1",
      activeMedicationOrderLines: [{ id: "ord-1", text: "Ceftriaxone 1g IV" }],
    });
    expect(packet.fields.admissionReason?.proposalMethod).toBe("RULE_BASED");
    expect(packet.fields.admissionReason?.sources.every((s) => s.sourceType)).toBe(true);
    expect(
      packet.fields.admissionReason?.sources.some((s) => s.sourceType === "DIAGNOSIS" && s.sourceId === "dx-1")
    ).toBe(true);
    expect(packet.structuredInitialPlan?.items.some((i) => i.status === "ACTIVE_ORDER")).toBe(true);
    expect(packet.conditionStatus).toBeNull();
  });

  it("loads backward-compatible D4A.2 packets without sourceType", () => {
    const summary = {
      admissionPacketV1: {
        version: 1,
        fields: {
          admissionReason: {
            value: "Legacy reason",
            origin: "SYSTEM_PROPOSAL",
            sources: [{ kind: "CHIEF_COMPLAINT", label: "Chief complaint", excerpt: "Fever" }],
          },
        },
      },
    };
    const packet = readAdmissionPacketV1(summary);
    expect(packet.fields.admissionReason?.value).toBe("Legacy reason");
    expect(packet.fields.admissionReason?.sources[0]?.sourceType).toBe("CHIEF_COMPLAINT");
    expect(packet.fields.admissionReason?.proposalMethod).toBe("RULE_BASED");
  });

  it("physician edit → PHYSICIAN_EDITED; accept unchanged keeps SYSTEM_PROPOSAL", () => {
    const proposed = buildSmartAdmissionProposals({
      chiefComplaint: "Fever",
      primaryDiagnosisDisplay: "J18.9",
    });
    const accepted = markFieldPhysicianEdited(
      proposed.fields.admissionReason,
      proposed.fields.admissionReason!.value
    );
    expect(accepted.origin).toBe("SYSTEM_PROPOSAL");
    expect(accepted.physicianConfirmed).toBe(true);
    expect(accepted.physicianAcceptedAt).toBeTruthy();

    const edited = markFieldPhysicianEdited(proposed.fields.admissionReason, "Custom physician text");
    expect(edited.origin).toBe("PHYSICIAN_EDITED");
    expect(provenanceDisplayKey(edited.origin)).toBe("EDITED_BY_PHYSICIAN");
  });

  it("never overwrites physician-edited text on refresh; supports explicit replace", () => {
    const proposed = buildSmartAdmissionProposals({
      chiefComplaint: "Fever",
      primaryDiagnosisDisplay: "J18.9",
    });
    const edited = markFieldPhysicianEdited(proposed.fields.admissionReason, "Keep me");
    const newer = buildSmartAdmissionProposals({
      chiefComplaint: "Fever and cough",
      primaryDiagnosisDisplay: "J18.9",
      abnormalResultLines: ["CXR infiltrate"],
    });
    const merge = mergeProposalFieldWithoutOverwrite(edited, newer.fields.admissionReason);
    expect(merge.field?.value).toBe("Keep me");
    expect(merge.newerProposalAvailable).toBe(true);
    const replaced = replaceFieldWithUpdatedProposal(edited, newer.fields.admissionReason!);
    expect(replaced.origin).toBe("SYSTEM_PROPOSAL");
    expect(replaced.priorPhysicianValue).toBe("Keep me");
  });

  it("marks discontinued orders distinctly and does not invent orders", () => {
    const packet = buildSmartAdmissionProposals({
      discontinuedOrderLines: [{ id: "ord-x", text: "Old morphine PCA" }],
      providerPlan: "Continue monitoring",
    });
    const disc = packet.structuredInitialPlan?.items.find((i) => i.status === "DISCONTINUED");
    expect(disc?.display).toContain("morphine");
    expect(disc?.selectedForNarrative).toBe(false);
  });
});

describe("D4A.2.1 SIGN validation + service/LOC", () => {
  it("allows incomplete DRAFT and requires fields on SIGN", () => {
    expect(
      evaluateAdmissionSignRequirements({
        mode: "DRAFT",
        reasonForAdmission: "",
      }).ok
    ).toBe(true);
    const sign = evaluateAdmissionSignRequirements({
      mode: "SIGN",
      primaryDiagnosisId: "dx-1",
      resolvedDiagnosisIds: new Set(["dx-1"]),
      admittingServiceCode: "HOSPITAL_MEDICINE",
      levelOfCareCode: "MEDICAL_SURGICAL",
      conditionStatus: "STABLE",
      reasonForAdmission: "Needs IV abx",
      initialPlanNarrative: "IV Abx",
      responsiblePhysicianName: "Dr A",
      encounterEditable: true,
      actorAuthorized: true,
    });
    expect(sign.ok).toBe(true);
  });

  it("rejects invalid service/LOC and duplicate diagnosis selection", () => {
    expect(isServiceLevelOfCareCompatible("CRITICAL_CARE", "MEDICAL_SURGICAL")).toBe(false);
    expect(isServiceLevelOfCareCompatible("HOSPITAL_MEDICINE", "TELEMETRY")).toBe(true);
    expect(isServiceLevelOfCareCompatible("OBSTETRICS", "LABOR_AND_DELIVERY")).toBe(true);
    expect(
      validateSmartAdmissionServiceLocCompatibility({
        admittingServiceCode: "PEDIATRICS",
        levelOfCareCode: "LABOR_AND_DELIVERY",
      }).errors
    ).toContain("INVALID_SERVICE_LEVEL_OF_CARE_COMBINATION");
    expect(
      evaluateAdmissionSignRequirements({
        mode: "SIGN",
        primaryDiagnosisId: "dx-1",
        secondaryDiagnosisIds: ["dx-1"],
        resolvedDiagnosisIds: new Set(["dx-1"]),
        admittingServiceCode: "HOSPITAL_MEDICINE",
        levelOfCareCode: "MEDICAL_SURGICAL",
        conditionStatus: "STABLE",
        reasonForAdmission: "x",
        initialPlanNarrative: "y",
        responsiblePhysicianName: "Dr A",
      }).errors
    ).toContain("ADMISSION_DUPLICATE_DIAGNOSIS_SELECTION");
  });

  it("preserves admissionCorrelation when merging packet", () => {
    const merged = mergeAdmissionSummaryFieldsPreservingNested(
      {
        admissionCorrelation: { correlationId: "c1", status: "ACTIVE" },
        unrelatedKey: true,
      },
      {
        admissionReason: "Reason",
        serviceUnit: "HOSPITAL_MEDICINE",
        careLevel: "MEDICAL_SURGICAL",
      },
      { primaryDiagnosisId: "dx-1", secondaryDiagnosisIds: [] },
      buildSmartAdmissionProposals({ chiefComplaint: "Pain", primaryDiagnosisDisplay: "R10.9" })
    );
    expect(merged.admissionCorrelation).toEqual({ correlationId: "c1", status: "ACTIVE" });
    expect(merged.unrelatedKey).toBe(true);
    expect(merged.admissionPacketV1).toBeTruthy();
  });
});

describe("D4A.2.1 adaptive nursing completion contracts", () => {
  it("forbids HOME nursing for ADMISSION and requires signed decision", () => {
    expect(isHomeNursingForbiddenForPathway("ADMISSION")).toBe(true);
    expect(nursingSectionsForPathway("HOME")).toContain("dischargeVitals");
    expect(
      validateAdaptiveNursingAgainstDisposition({
        physicianPathway: "ADMISSION",
        nursingPathway: "HOME",
        admissionDecisionSigned: true,
        homeNursingPresent: true,
      }).errors
    ).toContain("HOME_NURSING_WITH_NON_HOME_DISPOSITION");
  });

  it("rejects incomplete completion and transfer under AMA", () => {
    const incomplete = evaluateAdaptiveNursingCompletion({
      pathway: "ADMISSION",
      sections: { handoff: "done" },
      physicianPathway: "ADMISSION",
      admissionDecisionSigned: true,
      completing: true,
    });
    expect(incomplete.ok).toBe(false);
    expect(incomplete.missingCodes.length).toBeGreaterThan(0);

    expect(
      validateAdaptiveNursingAgainstDisposition({
        physicianPathway: "AMA",
        nursingPathway: "TRANSFER",
        admissionDecisionSigned: false,
        acceptingFacility: "Hospital B",
      }).errors
    ).toContain("TRANSFER_UNDER_AMA_DECISION");
  });

  it("accepts complete admission departure when signed", () => {
    const sections = Object.fromEntries(
      nursingSectionsForPathway("ADMISSION").map((id) => [id, "documented"])
    );
    const ok = evaluateAdaptiveNursingCompletion({
      pathway: "ADMISSION",
      sections,
      physicianPathway: "ADMISSION",
      admissionDecisionSigned: true,
      completing: true,
    });
    expect(ok.ok).toBe(true);
    expect(ok.complete).toBe(true);
  });
});
