import { describe, expect, it } from "vitest";
import {
  eyeEmergencyRedFlagWarnings,
  isIopContraindicatedByRedFlags,
  resolveEyeEmergencyRedFlags,
} from "./eyeEmergencyRedFlagEngine";

describe("eyeEmergencyRedFlagEngine", () => {
  it("does not invent red flags from empty documentation", () => {
    expect(resolveEyeEmergencyRedFlags({}).categories).toEqual([]);
    expect(eyeEmergencyRedFlagWarnings({})).toEqual([]);
    expect(isIopContraindicatedByRedFlags({})).toBe(false);
  });

  it("screens open globe concern and flags IOP measurement as contraindicated", () => {
    const result = resolveEyeEmergencyRedFlags({ documentedFlags: ["teardrop pupil", "suspected open globe"] });
    expect(result.categories).toContain("open_globe");
    expect(result.prompts.join(" ").toLowerCase()).toMatch(/contraindicated/);
    expect(isIopContraindicatedByRedFlags({ documentedFlags: ["open globe suspected"] })).toBe(true);
  });

  it("screens acute angle-closure glaucoma concern", () => {
    const result = resolveEyeEmergencyRedFlags({ documentedFlags: ["halos around lights", "fixed mid-dilated pupil"] });
    expect(result.categories).toContain("acute_glaucoma");
  });

  it("screens retinal detachment concern", () => {
    const result = resolveEyeEmergencyRedFlags({ documentedFlags: ["curtain coming down over vision"] });
    expect(result.categories).toContain("retinal_detachment");
  });

  it("screens retinal vascular occlusion concern", () => {
    const result = resolveEyeEmergencyRedFlags({ documentedFlags: ["sudden painless monocular vision loss"] });
    expect(result.categories).toContain("retinal_vascular");
    expect(result.categories).toContain("vision_loss");
  });

  it("screens orbital cellulitis concern distinct from preseptal cellulitis", () => {
    const result = resolveEyeEmergencyRedFlags({
      documentedFlags: ["proptosis with pain", "painful restriction of extraocular movement"],
    });
    expect(result.categories).toContain("orbital_cellulitis");
  });

  it("screens endophthalmitis concern", () => {
    const result = resolveEyeEmergencyRedFlags({
      documentedFlags: ["severe pain after eye surgery", "hypopyon after injection"],
    });
    expect(result.categories).toContain("endophthalmitis");
  });

  it("screens chemical injury concern and prioritizes irrigation over testing", () => {
    const result = resolveEyeEmergencyRedFlags({ documentedFlags: ["alkali exposure to eye"] });
    expect(result.categories).toContain("chemical_injury");
    expect(result.prompts.join(" ").toLowerCase()).toMatch(/irrigation/);
  });

  it("screens corneal ulcer concern distinct from simple corneal abrasion", () => {
    const result = resolveEyeEmergencyRedFlags({ documentedFlags: ["corneal ulcer", "hypopyon"] });
    expect(result.categories).toContain("corneal_ulcer");
    expect(result.prompts.join(" ").toLowerCase()).toMatch(/not treated with a routine abrasion/);
  });

  it("screens orbital compartment syndrome concern after trauma", () => {
    const result = resolveEyeEmergencyRedFlags({ documentedFlags: ["retrobulbar hemorrhage", "tense proptotic orbit"] });
    expect(result.categories).toContain("orbital_compartment");
  });

  it("screens contact-lens-associated keratitis concern", () => {
    const result = resolveEyeEmergencyRedFlags({ documentedFlags: ["overnight contact lens wear", "contact lens keratitis"] });
    expect(result.categories).toContain("contact_lens_keratitis");
  });

  it("never auto-diagnoses or orders tests from red-flag prompts", () => {
    const prompts = eyeEmergencyRedFlagWarnings({ documentedFlags: ["open globe suspected", "chemical splash to eye"] }).join(" ");
    expect(prompts.toLowerCase()).not.toMatch(/diagnosed|confirmed|order ct now|transfer now|consult now/);
  });
});
