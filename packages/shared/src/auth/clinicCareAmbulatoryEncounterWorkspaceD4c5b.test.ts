/**
 * MEDUI.D4C.5B — shared ambulatory encounter workspace contracts.
 */

import { describe, expect, it } from "vitest";
import {
  CLINIC_CARE_AMBULATORY_ENCOUNTER_WORKSPACE_CERTIFICATION_ID,
  CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS,
  CLINIC_CARE_PROVIDER_QUEUE_GROUPS_D4C5B,
  clinicCareAmbulatoryActiveWorkspacePath,
  getVisibleClinicCareAmbulatoryWorkspaceSections,
  isAmbulatoryClinicalDataDocumentAllowed,
  projectClinicCareProviderQueueGroupD4c5b,
  resolveClinicCareAmbulatoryWorkflowTarget,
  shouldSuppressGlobalDashboardForClinicCare,
} from "./clinicCareAmbulatoryEncounterWorkspaceD4c5b.js";

describe("clinicCareAmbulatoryEncounterWorkspaceD4c5b", () => {
  it("exports certification + sections", () => {
    expect(CLINIC_CARE_AMBULATORY_ENCOUNTER_WORKSPACE_CERTIFICATION_ID).toBe("MEDUI.D4C.5B");
    expect(CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS).toHaveLength(12);
    expect(CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS).toContain("prescriptions");
    expect(clinicCareAmbulatoryActiveWorkspacePath("x", "orders")).toContain("section=orders");
  });

  it("expands provider queue + workflow targets", () => {
    expect(CLINIC_CARE_PROVIDER_QUEUE_GROUPS_D4C5B).toContain("WAITING");
    expect(projectClinicCareProviderQueueGroupD4c5b("WAITING")).toBe("WAITING");
    expect(resolveClinicCareAmbulatoryWorkflowTarget("START_CONSULTATION", "TRIAGE")).toBe(
      "IN_TREATMENT"
    );
  });

  it("filters clinical data + sidebar suppress helper", () => {
    expect(isAmbulatoryClinicalDataDocumentAllowed({ typeId: "COWS", careSettings: ["ED"] })).toBe(
      false
    );
    expect(getVisibleClinicCareAmbulatoryWorkspaceSections(["PROVIDER"]).length).toBe(12);
    expect(getVisibleClinicCareAmbulatoryWorkspaceSections(["PROVIDER"])).toContain("prescriptions");
    expect(
      shouldSuppressGlobalDashboardForClinicCare({
        ambulatoryFacility: true,
        clinicCareVisible: true,
        edVisible: false,
        hospitalVisible: false,
      })
    ).toBe(true);
  });
});
