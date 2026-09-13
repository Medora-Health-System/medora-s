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

  it("prevents Clinic nursing links from navigating away and converts documentation links to inline tools", () => {
    expect(source).toContain("event.preventDefault()");
    expect(source).toContain("event.stopPropagation()");
    expect(source).toContain('anchor.dataset.testid === "clinic-care-nursing-medrec-link"');
    expect(source).toContain('href.includes("section=intake")');
    expect(source).toContain('openInlineTool("notes"');
  });

  it("reuses the enterprise intake and note engines so saved work remains part of the encounter summary source", () => {
    expect(source).toContain("<EmergencyTriagePanel");
    expect(source).toContain('presentationMode="SIMPLE_CLINIC_INTAKE"');
    expect(source).toContain("<EmergencyErNotesPanel");
    expect(source).toContain("Documentation stays on this page and saves to the encounter for Summary.");
  });
});
