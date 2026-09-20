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
    expect(source).toContain('anchor.dataset.testid === "clinic-care-nursing-evaluation-link"');
    expect(source).toContain('anchor.dataset.testid === "clinic-care-nursing-open-intake-chart"');
    expect(source).toContain('anchor.dataset.testid === "clinic-care-nursing-notes-link"');
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
    expect(source).toContain('presentationMode="CLINIC_NURSING_MINIMAL"');
    expect(source).toContain("<EmergencyErNotesPanel");
    expect(source).not.toContain("Documentation stays on this page and saves to the encounter for Summary.");
    expect(source).not.toContain("La documentación permanece en esta página");
  });

  it("labels the Clinic Nursing content as Evaluation and uses audited vitals attribution", () => {
    const triage = readFileSync(join(__dirname, "../emergency/EmergencyTriagePanel.tsx"), "utf8");
    expect(triage).toContain('? "Evaluación"');
    expect(triage).toContain("fetchLatestVitalsHistoryEntry(encounter.id, facilityId)");
    expect(triage).toContain("savedEntry?.recordedBy?.displayName");
    expect(triage).toContain("savedEntry?.recordedBy?.roleTitle");
    expect(triage).toContain("savedEntry?.recordedAt");
    expect(triage).not.toContain("fetchAuthMeSession");
  });
});


describe("Clinic-only nursing and admission scope", () => {
  const triage = readFileSync(join(__dirname, "../emergency/EmergencyTriagePanel.tsx"), "utf8");
  const sections = readFileSync(join(__dirname, "../emergency/EmergencyTriageV1Sections.tsx"), "utf8");
  it("limits Clinic Nursing intake to onset, completion, compact vitals, and sections 3 and 4", () => {
    const minimal = triage.split(') : clinicNursingMinimal ? (')[1]?.split(') : (')[0] ?? "";
    expect(minimal).toContain('data-testid="clinic-nursing-minimal-intake"');
    expect(minimal).toContain("formData.onsetAt");
    expect(minimal).toContain("formData.triageCompleteAt");
    expect(minimal).toContain("<EmergencyTriageVitalsCompactSection");
    expect(minimal).toContain("clinicMinimalSections />");
    expect(minimal).not.toContain("sectionScreenings");
    expect(sections).toContain("{!clinicMinimalSections ? (<>");
    expect(sections).toContain('t("erTriage.v1.s3Title")');
  });
  it("does not change ED or inpatient triage presentation defaults", () => {
    expect(triage).toContain('presentationMode = "FULL_ED_TRIAGE"');
    expect(triage).toContain('presentationMode === "CLINIC_NURSING_MINIMAL"');
    expect(triage).toContain('presentationMode !== "FULL_ED_TRIAGE"');
  });
});
