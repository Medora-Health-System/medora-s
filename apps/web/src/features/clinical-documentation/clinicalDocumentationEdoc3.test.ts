import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("EDOC.3 observation documentation cards", () => {
  const hubSource = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const formSource = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationObservationForm.tsx"),
    "utf8"
  );
  const erNotesSource = readFileSync(
    join(webSrcRoot, "features/emergency/EmergencyErNotesPanel.tsx"),
    "utf8"
  );
  const naPanelSource = readFileSync(
    join(webSrcRoot, "features/emergency/EmergencyNursingReassessmentPanel.tsx"),
    "utf8"
  );

  it("hub wires observation forms and EDOC.2 POST", () => {
    expect(hubSource).toContain("ClinicalDocumentationObservationForm");
    expect(hubSource).toContain("isEdoc3ObservationFormCard");
    expect(hubSource).toContain("createClinicalDocumentationEntry");
    expect(hubSource).toContain("data-category={c.category}");
  });

  it("PO Challenge and Ambulation Trial forms render with save", () => {
    expect(formSource).toContain("clinical-documentation-po-challenge-form");
    expect(formSource).toContain("clinical-documentation-ambulation-form");
    expect(formSource).toContain("OBS_PO_CHALLENGE_CARD_ID");
    expect(formSource).toContain("OBS_AMBULATION_TRIAL_CARD_ID");
    expect(formSource).toContain("onSubmit");
  });

  it("foundation-only cards stay disabled in hub", () => {
    expect(hubSource).toContain('c.implementationStatus !== "AVAILABLE"');
  });

  it("tablet-friendly compact layout preserved", () => {
    expect(hubSource).toContain("overflowX: \"auto\"");
    expect(formSource).toContain("repeat(auto-fill, minmax(140px, 1fr))");
  });

  it("MEDNOTE and nursing reassessment unchanged", () => {
    expect(erNotesSource).toContain("encounterNotesApi");
    expect(erNotesSource).not.toContain("ClinicalDocumentationObservationForm");
    expect(naPanelSource).toContain("ClinicalDocumentationHub");
    expect(naPanelSource).not.toContain("ClinicalDocumentationObservationForm");
  });
});
