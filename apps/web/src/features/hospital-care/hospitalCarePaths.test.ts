import { describe, expect, it } from "vitest";
import {
  HOSPITAL_CARE_HOME,
  HOSPITAL_CARE_OBSERVATION,
  HOSPITAL_CARE_PLACEMENT_QUEUE,
  HOSPITAL_CARE_SECTIONS,
} from "./hospitalCarePaths";

describe("hospitalCarePaths D3CA", () => {
  it("keeps Hospital Care home on canonical hospitalisation route", () => {
    expect(HOSPITAL_CARE_HOME).toBe("/app/hospitalisation");
  });

  it("exposes placement queue and observation under hospitalisation", () => {
    expect(HOSPITAL_CARE_PLACEMENT_QUEUE).toContain("/hospitalisation/");
    expect(HOSPITAL_CARE_OBSERVATION).toContain("/observation");
  });

  it("lists seven primary sections including home", () => {
    expect(HOSPITAL_CARE_SECTIONS).toHaveLength(7);
    expect(HOSPITAL_CARE_SECTIONS.map((s) => s.id)).toContain("home");
    expect(HOSPITAL_CARE_SECTIONS.map((s) => s.id)).toContain("placementQueue");
  });
});
