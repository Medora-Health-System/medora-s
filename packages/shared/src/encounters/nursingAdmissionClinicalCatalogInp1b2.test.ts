import { describe, expect, it } from "vitest";
import {
  NURSING_ADMISSION_OPTION_CATALOGS,
  allNursingSectionSchemas,
  validateSectionAnswersForCompletion,
} from "./inpatientLifecycleNursingAdmissionD4a25.js";

describe("INP.1B.2 nursing admission clinical catalog", () => {
  it("gives every option-driven field canonical options", () => {
    for (const section of allNursingSectionSchemas()) {
      const keys = new Set<string>();
      for (const field of section.fields) {
        expect(keys.has(field.key), `${section.sectionId}.${field.key} duplicate editor`).toBe(false);
        keys.add(field.key);
        if (["select", "radio", "multiselect", "checkbox"].includes(field.control)) {
          expect(field.optionsKey, `${section.sectionId}.${field.key} option source`).toBeTruthy();
          expect(
            NURSING_ADMISSION_OPTION_CATALOGS[field.optionsKey!]?.length,
            `${section.sectionId}.${field.key} options`
          ).toBeGreaterThan(0);
        }
      }
    }
  });

  it("accepts canonical chip values and validates required completion", () => {
    const answers = {
      generalAppearance: ["ILL_APPEARING"],
      levelOfConsciousness: "ALERT",
      orientation: "AOX4",
      immediateConcerns: ["FALL_RISK"],
      immediateSafetyConcern: "YES",
      painPresent: "NO",
    };
    expect(validateSectionAnswersForCompletion({
      sectionId: "NURSING_ADMISSION_ASSESSMENT",
      answers,
      completionState: "COMPLETE",
    })).toEqual({ ok: true });
    expect(JSON.parse(JSON.stringify(answers))).toEqual(answers);
  });
});
