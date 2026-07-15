import { describe, expect, it } from "vitest";
import {
  composeNursingDischargeNoteAppend,
  getNursingDischargeNoteText,
  NURSING_DISCHARGE_NOTE_PHRASES,
  NURSING_DISCHARGE_NOTE_TEMPLATES,
} from "./nursingDischargeNoteTemplates";

describe("nursingDischargeNoteTemplates", () => {
  it("exposes required premade complete templates", () => {
    const ids = new Set(NURSING_DISCHARGE_NOTE_TEMPLATES.map((t) => t.id));
    for (const id of [
      "comprehensive_stable",
      "brief_stable_home",
      "education_follow_up",
      "home_care_understanding",
      "reassessment_before_discharge",
      "plan_of_care_agreement",
      "clinically_stable",
      "wheelchair_discharge",
      "caregiver_discharge",
      "pediatric_discharge",
      "interpreter_assisted",
      "transfer",
      "ama",
      "refusal",
    ]) {
      expect(ids.has(id)).toBe(true);
      expect(getNursingDischargeNoteText(id, "en")?.length).toBeGreaterThan(20);
      expect(getNursingDischargeNoteText(id, "fr")?.length).toBeGreaterThan(20);
    }
  });

  it("exposes phrase chips without auto-inserting until selected", () => {
    expect(NURSING_DISCHARGE_NOTE_PHRASES.some((p) => p.id === "ao_x4")).toBe(true);
    expect(NURSING_DISCHARGE_NOTE_PHRASES.some((p) => p.id === "steady_gait")).toBe(true);
  });

  it("appends without erasing prior clinician edits", () => {
    const base = "Custom nurse observation about gait.";
    const next = composeNursingDischargeNoteAppend(base, "Patient verbalized understanding.");
    expect(next.startsWith(base)).toBe(true);
    expect(next).toContain("Patient verbalized understanding.");
  });

  it("prevents duplicate identical paragraphs", () => {
    const once = composeNursingDischargeNoteAppend("", "Steady gait.");
    const twice = composeNursingDischargeNoteAppend(once, "Steady gait.");
    expect(twice).toBe(once);
  });

  it("allows a fully custom note without templates", () => {
    const custom = "Patient discharged per plan after teaching.";
    expect(composeNursingDischargeNoteAppend("", custom)).toBe(custom);
  });
});
