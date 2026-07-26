/**
 * MEDUI.D4B.2 — Enterprise nursing clinical workspace UI smoke tests.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("EnterpriseNursingClinicalWorkspaceD4b2", () => {
  const src = readFileSync(
    join(__dirname, "EnterpriseNursingClinicalWorkspaceD4b2.tsx"),
    "utf8"
  );
  const inpatientHost = readFileSync(
    join(__dirname, "../inpatient-workspace/InpatientNursingAssessmentSection.tsx"),
    "utf8"
  );

  it("composes D4B.1 primitives and EDOC hub without a second signature engine", () => {
    expect(src).toContain("EnterpriseClinicalDocumentStatusBadge");
    expect(src).toContain("ClinicalDocumentationHub");
    expect(src).toContain("enterpriseNursingClinicalWorkspaceD4b2.");
    expect(src).toContain("nursingWorkspaceSectionsForCareSetting");
    expect(src).not.toContain("createNursingSignatureEngine");
    expect(src).not.toContain("NursingRapidReassessmentPanel");
  });

  it("is hosted by inpatient nursing assessment section", () => {
    expect(inpatientHost).toContain("EnterpriseNursingClinicalWorkspaceD4b2");
    expect(inpatientHost).toContain("EmergencyNursingReassessmentPanel");
    expect(inpatientHost).toContain("InpatientNursingHandoffPanel");
    expect(inpatientHost).not.toContain("NursingRapidReassessmentPanel");
  });
});
