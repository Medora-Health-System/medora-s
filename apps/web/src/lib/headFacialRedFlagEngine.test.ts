import { describe, expect, it } from "vitest";
import { headFacialRedFlagWarnings, resolveHeadFacialRedFlags } from "./headFacialRedFlagEngine";

describe("headFacialRedFlagEngine", () => {
  it("does not invent red flags from empty documentation", () => {
    expect(resolveHeadFacialRedFlags({}).categories).toEqual([]);
    expect(headFacialRedFlagWarnings({})).toEqual([]);
  });

  it("screens intracranial emergency concern from GCS decline and pupil findings", () => {
    const result = resolveHeadFacialRedFlags({
      documentedFlags: ["GCS decline", "fixed dilated pupil", "repeated vomiting"],
    });
    expect(result.categories).toContain("intracranial_emergency");
    expect(result.prompts.length).toBeGreaterThan(0);
  });

  it("screens anticoagulated head trauma risk", () => {
    const result = resolveHeadFacialRedFlags({
      documentedFlags: ["takes apixaban", "fall with head strike"],
    });
    expect(result.categories).toContain("anticoagulated_head");
  });

  it("screens basilar skull fracture signs", () => {
    const result = resolveHeadFacialRedFlags({
      documentedFlags: ["Battle sign", "hemotympanum"],
    });
    expect(result.categories).toContain("basilar_skull");
  });

  it("screens airway/ocular emergency concern", () => {
    const result = resolveHeadFacialRedFlags({
      documentedFlags: ["open globe suspected", "vision loss"],
    });
    expect(result.categories).toContain("airway_ocular");
  });

  it("screens septal hematoma / CSF leak concern distinct from simple nasal fracture", () => {
    const result = resolveHeadFacialRedFlags({
      displayName: "Nasal septal hematoma",
    });
    expect(result.categories).toContain("septal_hematoma_csf");
  });

  it("screens non-accidental trauma concern", () => {
    const result = resolveHeadFacialRedFlags({
      documentedFlags: ["mechanism inconsistent with injury", "caregiver concern"],
    });
    expect(result.categories).toContain("non_accidental_trauma");
  });

  it("never auto-diagnoses from red-flag prompts", () => {
    const prompts = headFacialRedFlagWarnings({ documentedFlags: ["Battle sign", "hemotympanum"] }).join(" ");
    expect(prompts.toLowerCase()).not.toMatch(/diagnosed|confirmed|order ct now|transfer now/);
  });
});
