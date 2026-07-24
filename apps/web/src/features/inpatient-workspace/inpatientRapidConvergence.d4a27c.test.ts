/**
 * D4A.2.7C — Web rapid convergence smoke tests.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  INPATIENT_RAPID_CONVERGENCE_CERTIFICATION_ID,
  NURSING_ADMISSION_STAGES,
  INPATIENT_ADMISSION_CLINICAL_SECTIONS,
  allNursingAdmissionStageSectionIds,
  sentenceCaseClinicalLabel,
} from "@medora/shared";

const root = join(__dirname);

describe("D4A.2.7C inpatient rapid convergence (web)", () => {
  it("certification id is stable", () => {
    expect(INPATIENT_RAPID_CONVERGENCE_CERTIFICATION_ID).toBe(
      "MEDUI.INPATIENT_RAPID_CONVERGENCE.D4A2_7C"
    );
  });

  it("preserves 20 sections across six stages", () => {
    expect(INPATIENT_ADMISSION_CLINICAL_SECTIONS).toHaveLength(20);
    expect(NURSING_ADMISSION_STAGES).toHaveLength(6);
    expect(allNursingAdmissionStageSectionIds()).toHaveLength(20);
  });

  it("admission shell uses stage rail and single sticky footer", () => {
    const src = readFileSync(join(root, "InpatientAdmissionClinicalShell.tsx"), "utf8");
    expect(src).toContain("nursing-admission-stage-rail");
    expect(src).toContain("admission-sticky-footer");
    expect(src).not.toContain("admission-save-draft-top");
    expect(src).toContain("AdditionalClinicalDocumentationLauncher");
  });

  it("compact header maps SOURCE_UNAVAILABLE to governed empty (never Source unavailable chips)", () => {
    const src = readFileSync(join(root, "EnterpriseHospitalPatientHeader.tsx"), "utf8");
    expect(src).toContain("SOURCE_UNAVAILABLE");
    expect(src).toContain("inpatientCompactHeaderD4a32.notDocumented");
    expect(src).toContain("inpatientCompactHeaderD4a32.noVitalsDocumented");
    expect(src).not.toContain("sourceUnavailable");
    expect(src).not.toContain("indicatorStates");
  });

  it("rapid controls use i18n for Yes/No/Unknown", () => {
    const src = readFileSync(
      join(root, "rapid-documentation/ClinicalRapidControls.tsx"),
      "utf8"
    );
    expect(src).not.toContain("Oui / Yes");
    expect(src).toContain("inpatientRapidConvergenceD4a27c.yes");
    expect(src).toContain("ClinicalCarryForwardReview");
    expect(src).toContain("ClinicalNormalExceptionSelector");
  });

  it("observation workspace uses bootstrap API not generic encounter GET for header", () => {
    const src = readFileSync(
      join(root, "../observation-workspace/ObservationActiveWorkspaceView.tsx"),
      "utf8"
    );
    expect(src).toContain("fetchObservationWorkspaceBootstrap");
    expect(src).toContain("EnterpriseHospitalPatientHeader");
    expect(src).toContain("showAssignmentActions");
    expect(src).toContain("assignHospitalRoleToMe");
    expect(src).not.toMatch(/apiFetch\(`\/encounters\/\$\{encounterId\}`\)/);
  });

  it("terminology helper covers known concatenations", () => {
    expect(sentenceCaseClinicalLabel("Wristbandpresent")).toBe("Wristband present");
  });

  it("domain integration uses launcher instead of embedded hub catalog", () => {
    const src = readFileSync(join(root, "NursingAdmissionDomainIntegrationPanel.tsx"), "utf8");
    expect(src).toContain("AdditionalClinicalDocumentationLauncher");
    expect(src).not.toContain("ClinicalDocumentationHub");
  });
});
