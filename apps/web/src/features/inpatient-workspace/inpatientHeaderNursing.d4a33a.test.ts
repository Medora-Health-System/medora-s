/**
 * MEDUI.D4A.3.3A — Final hardening certification (source-level).
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import { INPATIENT_NURSING_STICKY_NAV_SECTIONS } from "./inpatientWorkspaceSections";
import { INPATIENT_ISOLATION_PRECAUTIONS as SHARED_ISO } from "@medora/shared";

const root = join(__dirname);
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("MEDUI.D4A.3.3A final hardening", () => {
  it("allergy editor persists via patient clinical-history PATCH (enterprise SSoT)", () => {
    const editors = read("InpatientClinicalStatusEditors.tsx");
    expect(editors).toContain("clinical-history-profile/allergies");
    expect(editors).toContain("markInactive");
    expect(editors).toContain("reactivate");
    expect(editors).toContain("ALLERGY_VERIFICATION_STATUSES");
    expect(editors).toContain("ALLERGY_SEVERITIES");
    const api = readFileSync(
      join(root, "../../../../api/src/patients/patient-clinical-history.service.ts"),
      "utf8"
    );
    expect(api).toContain("patchAllergies");
    expect(api).toContain("ENTERPRISE_ALLERGIES_PATCHED");
    expect(api).toContain("allergySectionAuditSnapshot");
  });

  it("isolation selector exposes Enhanced Contact and COVID as first-class enums", () => {
    expect(SHARED_ISO).toContain("ENHANCED_CONTACT");
    expect(SHARED_ISO).toContain("COVID");
    const editors = read("InpatientClinicalStatusEditors.tsx");
    expect(editors).toContain("ENHANCED_CONTACT");
    expect(editors).toContain('"COVID"');
    expect(editors).toContain("ISOLATION_UI");
  });

  it("team execution wires PCT + enterprise workflow/orders/MAR counts", () => {
    const team = read("InpatientNursingTeamExecutionPanel.tsx");
    expect(team).toContain("fetchHospitalAssignmentProjection");
    expect(team).toContain("technicianName");
    expect(team).toContain("fetchEncounterWorkflowDoc");
    expect(team).toContain("ordersOutstanding");
    expect(team).toContain("marPending");
    const active = read("InpatientActiveWorkspaceView.tsx");
    expect(active).toContain("assignedPctName");
  });

  it("handoff extends ErHandoffV1 with unit/signature/history/print", () => {
    const handoff = read("InpatientNursingHandoffPanel.tsx");
    expect(handoff).toContain("appendErHandoffHistory");
    expect(handoff).toContain("receivingUnit");
    expect(handoff).toContain("careTransferred");
    expect(handoff).toContain("electronicSignature");
    expect(handoff).toContain("printHandoff");
    expect(handoff).toContain("generateReport");
    const shared = readFileSync(
      join(root, "../../../../../packages/shared/src/erHandoffV1.ts"),
      "utf8"
    );
    expect(shared).toContain("receivingUnit");
    expect(shared).toContain("history?");
  });

  it("discharge print auto-synthesizes when summary empty", () => {
    const panel = read("InpatientWorkspacePanel.tsx");
    expect(panel).toContain("hasMeaningfulDischargeSummary");
    expect(panel).toContain("synthesizeInpatientDischargeSummaryDraft");
    expect(panel).toContain("dischargeSummaryJson: draft");
  });

  it("clinical status cards expose click-to-edit a11y affordances", () => {
    const header = read("EnterpriseHospitalPatientHeader.tsx");
    expect(header).toContain("InteractiveStatusButton");
    expect(header).toContain("inpatientHeaderNursingD4a33.clickToEdit");
    expect(header).toContain("onKeyDown");
    expect(header).toContain("maxWidth: 210");
    expect(header).toContain("maxWidth: 200");
  });

  it("longitudinal overview remains deleted; nursing sticky has no Timeline/Summary", () => {
    expect(existsSync(join(root, "InpatientLongitudinalOverviewStrip.tsx"))).toBe(false);
    const ids = INPATIENT_NURSING_STICKY_NAV_SECTIONS.map((s) => s.id);
    expect(ids).not.toContain("timeline");
    expect(ids).not.toContain("summary");
    expect(ids).toContain("notes");
    expect(ids).toContain("nursing");
  });

  it("clinical-ops audit records previous/next for code/isolation", () => {
    const svc = readFileSync(
      join(root, "../../../../api/src/encounters/inpatient-operations.service.ts"),
      "utf8"
    );
    expect(svc).toContain("codeStatus: { previous:");
    expect(svc).toContain("isolation: { previous:");
    expect(svc).toContain("activeAllergiesSummary");
  });

  it("mirrors D4A.3.3A i18n EN/FR keys", () => {
    expect(Object.keys(en.inpatientHeaderNursingD4a33.allergyEditor.verifications)).toEqual(
      Object.keys(fr.inpatientHeaderNursingD4a33.allergyEditor.verifications)
    );
    expect(fr.inpatientHeaderNursingD4a33.isolationEditor.options.COVID).toMatch(/COVID/i);
    expect(fr.inpatientHeaderNursingD4a33.clickToEdit).toBeTruthy();
  });
});
