import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(__dirname, "ClinicCareNursingSinglePageWorkspace.tsx"), "utf8");
const page = readFileSync(join(__dirname, "../../../app/app/clinic-care/nursing/page.tsx"), "utf8");

describe("Clinic nursing single-page documentation", () => {
  it("keeps the nursing route on the single-page wrapper", () => {
    expect(page).toContain("ClinicCareNursingSinglePageWorkspace");
    expect(page).not.toContain("ClinicCareNursingWorkspaceView />");
  });

  it("suppresses the redundant nursing subtitle", () => {
    expect(source).toContain('[data-testid="clinic-care-nursing-workspace"] h2 + p');
    expect(source).toContain("display: none !important");
  });

  it("recognizes the actual triage/history query links and keeps documentation inline", () => {
    expect(source).toContain('url.searchParams.get("tab")');
    expect(source).toContain('tab === "triage" || tab === "history"');
    expect(source).toContain('anchor.dataset.testid === "clinic-care-nursing-medrec-link"');
    expect(source).toContain('anchor.dataset.testid === "clinic-care-nursing-open-intake-chart"');
    expect(source).toContain('openInlineTool("notes"');
    expect(source).not.toContain('href.startsWith("/app/")');
  });

  it("keeps Start Intake on the Nursing board", () => {
    expect(source).toContain('button?.dataset.testid === "clinic-care-nursing-start-intake"');
    expect(source).toContain('patchEncounterWorkflowState(facilityId, encounterId, "TRIAGE")');
    expect(source).toContain('openInlineTool(\n        "intake"');
  });

  it("discards stale encounter fetch results when drawers are closed or switched", () => {
    expect(source).toContain("requestSequenceRef");
    expect(source).toContain("requestSequenceRef.current !== requestSequence");
    expect(source).toContain("requestSequenceRef.current += 1");
  });

  it("refreshes the operational board after drawer documentation saves", () => {
    expect(source).toContain("const [boardRevision, setBoardRevision]");
    expect(source).toContain("onSaved={handleDrawerSaved}");
    expect(source).toContain("<ClinicCareNursingWorkspaceView key={boardRevision} />");
  });

  it("normalizes nullable API patient ids for the shared triage contract", () => {
    expect(source).toContain("type EncounterApiShape");
    expect(source).toContain("id: value.patient.id ?? undefined");
  });

  it("reuses the enterprise intake and note engines so saved work remains part of the encounter summary source", () => {
    expect(source).toContain("<EmergencyTriagePanel");
    expect(source).toContain('presentationMode="SIMPLE_CLINIC_INTAKE"');
    expect(source).toContain("<EmergencyErNotesPanel");
    expect(source).toContain("Documentation stays on this page and saves to the encounter for Summary.");
  });
});
