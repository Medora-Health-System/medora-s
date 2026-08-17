import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NURSING_ADMISSION_STAGES, NURSING_ADMISSION_SECTION_INTEGRATIONS } from "@medora/shared";
import { formatNursingAdmissionClinicalValue } from "./NursingAdmissionPrintSummaryModal";

const shell = readFileSync(new URL("./InpatientAdmissionClinicalShell.tsx", import.meta.url), "utf8");
const overview = readFileSync(new URL("./InpatientOverviewView.tsx", import.meta.url), "utf8");
const activeWorkspace = readFileSync(new URL("./InpatientActiveWorkspaceView.tsx", import.meta.url), "utf8");
const summary = readFileSync(new URL("./NursingAdmissionPrintSummaryModal.tsx", import.meta.url), "utf8");

describe("INP.1B.4 nursing admission simplification", () => {
  it("presents exactly six stages without a twenty-section navigation escape hatch", () => {
    expect(NURSING_ADMISSION_STAGES).toHaveLength(6);
    expect(shell).not.toContain("INPATIENT_ADMISSION_CLINICAL_SECTIONS.map((section");
    expect(shell).toContain("NURSING_ADMISSION_STAGES.map");
  });

  it("preserves one explicit writer or verification/projection authority for every duplicate-sensitive domain", () => {
    const mapped = new Map(NURSING_ADMISSION_SECTION_INTEGRATIONS.map((x) => [x.sectionKey, x]));
    const expected = {
      MEDICAL_HISTORY: "LONGITUDINAL_MEDICAL_HISTORY", SURGICAL_HISTORY: "LONGITUDINAL_SURGICAL_HISTORY",
      HOME_MEDICATIONS: "HOME_MEDICATION_RECON", ALLERGIES: "ALLERGY", SOCIAL_HISTORY: "LONGITUDINAL_MEDICAL_HISTORY",
      PAIN: "PAIN_EDOC13", FALL_SAFETY: "FALL_SAFETY_EDOC14", SKIN_WOUND: "SKIN_WOUND_EDOC20",
      LINES_DRAINS_DEVICES: "DEVICE_LINE_EDOC17", EDUCATION_COMMUNICATION: "EDUCATION_EDOC22",
    } as const;
    for (const [section, authority] of Object.entries(expected)) expect(mapped.get(section as never)?.authoritativeDomain).toBe(authority);
    expect(mapped.get("FUNCTIONAL_MOBILITY")?.authoritativeDomain).toBe("FALL_SAFETY_EDOC14");
    expect(mapped.get("IDENTITY_DEMOGRAPHICS")?.readMode).toBe("READ_ONLY_PROJECTION");
  });

  it("renders canonical clinical values in human-readable English and French", () => {
    expect(formatNursingAdmissionClinicalValue("EMERGENCY_DEPARTMENT", "en")).toBe("Emergency Department");
    expect(formatNursingAdmissionClinicalValue("WHEELCHAIR", "en")).toBe("Wheelchair");
    expect(formatNursingAdmissionClinicalValue("NO_CONCERN", "en")).toBe("No concern identified");
    expect(formatNursingAdmissionClinicalValue("AAOX4", "en")).toBe("Alert and oriented ×4");
    expect(formatNursingAdmissionClinicalValue("EMERGENCY_DEPARTMENT", "fr")).toBe("Service d’urgence");
    expect(formatNursingAdmissionClinicalValue("NO_CONCERN", "fr")).toBe("Aucune préoccupation identifiée");
    expect(formatNursingAdmissionClinicalValue("AAOX4", "fr")).toBe("Alerte et orienté ×4");
  });

  it("projects three Overview states and routes its stage-aware action to the admission query section", () => {
    expect(overview).toContain('admissionAssessmentComplete === true');
    expect(overview).toContain('nursing.notStarted');
    expect(overview).toContain('nursing.inProgress');
    expect(overview).toContain('nursing.startAdmission');
    expect(overview).toContain('nursing.continueAdmission');
    expect(overview).toContain('nursing.reviewAdmission');
    expect(overview).toContain('onNavigateSection?.("admission")');
    expect(activeWorkspace).toContain('qs.set("section"');
  });

  it("renders a legal summary without raw records, identifiers, diagnostics, or field dumps", () => {
    expect(summary).not.toContain("summary.encounter?.id");
    expect(summary).not.toContain("documentRevision");
    expect(summary).not.toContain("authoritativeDomain");
    expect(summary).not.toContain("domainRefCount");
    expect(summary).not.toContain("loadError");
    expect(summary).not.toContain("Linked records");
    expect(summary).not.toContain("JSON.stringify");
    for (const forbidden of ["ADMISSION_OWNED", "LONGITUDINAL_MEDICAL_HISTORY", "EDOC", "D4A", "D4B", "V1", "V2", "Linked records", "Authoritative ", "Document revision:", "field=value"]) expect(summary).not.toContain(forbidden);
    expect(summary).not.toContain("summary.signature?.signedByUserId");
    expect(summary).not.toContain("a.createdByUserId");
    expect(formatNursingAdmissionClinicalValue("2026-08-12T08:14:00.000Z", "en")).not.toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(summary).toContain("Intl.DateTimeFormat");
    expect(summary).toContain("Évaluation infirmière à l’admission");
  });
});
