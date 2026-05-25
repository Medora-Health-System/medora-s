import { describe, expect, it } from "vitest";
import {
  buildEdClinicalTimeline,
  categoryLabelForEdClinicalTimeline,
  type EdClinicalTimelineSourceRow,
} from "./edClinicalTimeline.js";

describe("edClinicalTimeline", () => {
  it("sorts entries chronologically ascending", () => {
    const rows: EdClinicalTimelineSourceRow[] = [
      {
        id: "mar-1",
        category: "MEDICATION_ADMINISTRATION",
        timestampIso: "2026-05-18T11:00:00.000Z",
        actorName: "Marie Nurse",
        actorRoleTitle: "RN",
        summary: "Ketorolac administered IM.",
        sourceType: "MAR",
        sourceId: "mar-1",
      },
      {
        id: "triage-1",
        category: "TRIAGE",
        timestampIso: "2026-05-18T08:02:00.000Z",
        actorName: "Marie Nurse",
        actorRoleTitle: "RN",
        summary: "Initial triage completed.",
        sourceType: "TRIAGE",
        sourceId: "triage-1",
      },
    ];
    const result = buildEdClinicalTimeline(rows, "en");
    expect(result.dated.map((e) => e.id)).toEqual(["triage-1", "mar-1"]);
  });

  it("groups undated entries separately", () => {
    const result = buildEdClinicalTimeline(
      [
        {
          id: "undated-1",
          category: "PROVIDER_DOCUMENTATION",
          timestampIso: null,
          actorName: "Dr Test",
          actorRoleTitle: null,
          summary: "Provider note in progress.",
          sourceType: "PROVIDER",
          sourceId: "undated-1",
        },
        {
          id: "dated-1",
          category: "TRIAGE",
          timestampIso: "2026-05-18T08:00:00.000Z",
          actorName: "RN A",
          actorRoleTitle: null,
          summary: "Triage done.",
          sourceType: "TRIAGE",
          sourceId: "dated-1",
        },
      ],
      "en"
    );
    expect(result.dated).toHaveLength(1);
    expect(result.undated).toHaveLength(1);
    expect(result.undated[0]?.isUndated).toBe(true);
  });

  it("preserves saved French clinical text in summary", () => {
    const french = "Patient calme, douleur modérée.";
    const result = buildEdClinicalTimeline(
      [
        {
          id: "nursing-1",
          category: "INITIAL_NURSING_ASSESSMENT",
          timestampIso: "2026-05-18T09:00:00.000Z",
          actorName: "Marie",
          actorRoleTitle: "RN",
          summary: french,
          sourceType: "NURSING_EVAL",
          sourceId: "nursing-1",
        },
      ],
      "en"
    );
    expect(result.dated[0]?.summary).toBe(french);
  });

  it("English category labels do not contain French UI terms", () => {
    const label = categoryLabelForEdClinicalTimeline("INITIAL_NURSING_ASSESSMENT", "en");
    expect(label).toBe("Initial nursing assessment");
    expect(label).not.toMatch(/Évaluation|infirmière/);
  });

  it("truncates long summaries without altering saved prefix", () => {
    const long = "A".repeat(300);
    const result = buildEdClinicalTimeline(
      [
        {
          id: "x",
          category: "PROCEDURE_PROVIDER_NOTE",
          timestampIso: "2026-05-18T10:00:00.000Z",
          actorName: "Dr A",
          actorRoleTitle: "MD",
          summary: long,
          sourceType: "PROCEDURE",
          sourceId: "x",
        },
      ],
      "en"
    );
    expect(result.dated[0]?.summary.endsWith("…")).toBe(true);
    expect(result.dated[0]?.summary.startsWith("A")).toBe(true);
  });
});
