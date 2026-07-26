/**
 * MEDUI.D4B.3 — Enterprise technician / nursing-assistant workspace UI smoke tests.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("EnterpriseTechnicianNursingAssistantWorkspaceD4b3", () => {
  const src = readFileSync(
    join(__dirname, "EnterpriseTechnicianNursingAssistantWorkspaceD4b3.tsx"),
    "utf8"
  );
  const hospitalHost = readFileSync(
    join(__dirname, "../hospitalization/HospitalTechnicianActiveWorkspaceView.tsx"),
    "utf8"
  );
  const controller = readFileSync(
    join(__dirname, "../../../../../apps/api/src/encounters/inpatient-operations.controller.ts"),
    "utf8"
  );

  it("composes D4B.1 primitives and existing engines without a second signature engine", () => {
    expect(src).toContain("EnterpriseClinicalDocumentStatusBadge");
    expect(src).toContain("ClinicalDocumentationHub");
    expect(src).toContain("enterpriseTechnicianNursingAssistantWorkspaceD4b3.");
    expect(src).toContain("technicianWorkspaceSectionsForCareSetting");
    expect(src).not.toContain("createTechnicianSignatureEngine");
    expect(src).not.toContain("nursing.admission_assessment");
  });

  it("is hosted by hospital technician active workspace with task + vitals adapters", () => {
    expect(hospitalHost).toContain("EnterpriseTechnicianNursingAssistantWorkspaceD4b3");
    expect(hospitalHost).toContain("InpatientTechnicianTasksPanel");
    expect(hospitalHost).toContain("EmergencyQuickVitalsEditor");
  });

  it("keeps PATIENT_CARE_TECH on technician-tasks RBAC", () => {
    expect(controller).toContain("technician-tasks");
    expect(controller).toContain("RoleCode.PATIENT_CARE_TECH");
  });
});
