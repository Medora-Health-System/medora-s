import { describe, expect, it } from "vitest";
import { adaptEyeTraumaComplaintIntel, isIopDocumentationRequired, resolveEyeTraumaContext } from "./eyeTraumaClinicalIntelligence";
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const baseIntel = {
  hpi: ["hpi.chemical", "hpi.hyphema", "hpi.cornealFb"],
  rosRedFlags: ["rf.openGlobe", "rf.hyphema"],
  mdmPlanSummary: ["plan.ophthalmology", "plan.return"],
} as ProviderDocumentationComplaintIntelligence;

describe("eyeTraumaClinicalIntelligence", () => {
  it("resolves corneal_fb and conjunctival_fb branches distinctly", () => {
    expect(resolveEyeTraumaContext({ displayName: "Foreign body in cornea" }).branches).toContain("corneal_fb");
    const conjunctival = resolveEyeTraumaContext({ displayName: "Foreign body in conjunctival sac" });
    expect(conjunctival.branches).toContain("conjunctival_fb");
    expect(conjunctival.branches).not.toContain("corneal_fb");
  });

  it("resolves chemical and thermal_uv branches", () => {
    expect(resolveEyeTraumaContext({ displayName: "Alkali exposure to eye" }).branches).toContain("chemical");
    expect(resolveEyeTraumaContext({ displayName: "Photokeratitis from welding" }).branches).toContain("thermal_uv");
  });

  it("resolves open_globe, hyphema, and traumatic_iritis branches", () => {
    expect(resolveEyeTraumaContext({ displayName: "Open globe injury" }).branches).toContain("open_globe");
    expect(resolveEyeTraumaContext({ displayName: "Traumatic hyphema" }).branches).toContain("hyphema");
    expect(resolveEyeTraumaContext({ displayName: "Traumatic iritis" }).branches).toContain("traumatic_iritis");
  });

  it("resolves eyelid_laceration, canalicular, retrobulbar, and orbital_compartment branches", () => {
    expect(resolveEyeTraumaContext({ displayName: "Eyelid laceration" }).branches).toContain("eyelid_laceration");
    expect(resolveEyeTraumaContext({ displayName: "Canalicular laceration" }).branches).toContain("canalicular");
    expect(resolveEyeTraumaContext({ displayName: "Retrobulbar hemorrhage" }).branches).toContain("retrobulbar");
    expect(resolveEyeTraumaContext({ displayName: "Orbital compartment syndrome" }).branches).toContain("orbital_compartment");
  });

  it("resolves abrasion_from_trauma but never alongside open_globe", () => {
    expect(resolveEyeTraumaContext({ displayName: "Corneal abrasion after blunt trauma" }).branches).toContain(
      "abrasion_from_trauma",
    );
    const globe = resolveEyeTraumaContext({ displayName: "Open globe with corneal abrasion" });
    expect(globe.branches).toContain("open_globe");
    expect(globe.branches).not.toContain("abrasion_from_trauma");
  });

  it("never assigns an automatic discharge family for open globe, retrobulbar hemorrhage, or orbital compartment syndrome", () => {
    expect(resolveEyeTraumaContext({ displayName: "Open globe injury" }).dischargeFamilyId).toBeNull();
    expect(resolveEyeTraumaContext({ displayName: "Retrobulbar hemorrhage" }).dischargeFamilyId).toBeNull();
    expect(resolveEyeTraumaContext({ displayName: "Orbital compartment syndrome" }).dischargeFamilyId).toBeNull();
  });

  it("withholds a discharge family for chemical and canalicular injury unless follow-up context is documented", () => {
    expect(resolveEyeTraumaContext({ displayName: "Chemical eye injury" }).dischargeFamilyId).toBeNull();
    expect(resolveEyeTraumaContext({ displayName: "Chemical eye injury, follow-up visit" }).dischargeFamilyId).toBe(
      "chemical_eye_injury_followup",
    );
    expect(resolveEyeTraumaContext({ displayName: "Canalicular laceration" }).dischargeFamilyId).toBeNull();
    expect(resolveEyeTraumaContext({ displayName: "Canalicular laceration, follow-up" }).dischargeFamilyId).toBe(
      "canalicular_injury_followup",
    );
  });

  it("routes hyphema, traumatic iritis, eyelid laceration, and foreign body branches to advisory follow-up families", () => {
    expect(resolveEyeTraumaContext({ displayName: "Traumatic hyphema" }).dischargeFamilyId).toBe("hyphema_followup");
    expect(resolveEyeTraumaContext({ displayName: "Traumatic iritis" }).dischargeFamilyId).toBe("traumatic_iritis_followup");
    expect(resolveEyeTraumaContext({ displayName: "Eyelid laceration" }).dischargeFamilyId).toBe("eyelid_laceration_followup");
    expect(resolveEyeTraumaContext({ displayName: "Foreign body in cornea" }).dischargeFamilyId).toBe(
      "corneal_foreign_body_followup",
    );
    expect(resolveEyeTraumaContext({ displayName: "Photokeratitis from welding" }).dischargeFamilyId).toBe(
      "photokeratitis_followup",
    );
  });

  it("never requires IOP documentation when the open_globe branch is active", () => {
    expect(isIopDocumentationRequired(["open_globe"])).toBe(false);
    expect(isIopDocumentationRequired(["hyphema"])).toBe(true);
    expect(isIopDocumentationRequired([])).toBe(true);
  });

  it("adapts documentation order to prioritize hyphema without changing IOP policy or diagnosis ownership", () => {
    const adapted = adaptEyeTraumaComplaintIntel(baseIntel, {
      branches: ["open_globe", "hyphema"],
      redFlagCategories: ["open_globe"],
    });
    expect(adapted.hpi?.[0]?.toLowerCase()).toContain("hyphema");
  });
});
