import { describe, expect, it } from "vitest";
import { adaptFacialTraumaComplaintIntel, resolveFacialTraumaContext } from "./facialTraumaClinicalIntelligence";
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

const baseIntel = {
  hpi: ["hpi.nasal", "hpi.septalHematoma", "hpi.dental"],
  rosRedFlags: ["rf.septalHematoma", "rf.laceration"],
  mdmPlanSummary: ["plan.ent", "plan.return"],
} as ProviderDocumentationComplaintIntelligence;

describe("facialTraumaClinicalIntelligence", () => {
  it("resolves nasal, orbital, zygomatic, and maxillary branches", () => {
    expect(resolveFacialTraumaContext({ code: "S02.2", displayName: "Nasal bone fracture" }).branches).toContain("nasal");
    expect(resolveFacialTraumaContext({ displayName: "Orbital floor fracture" }).branches).toContain("orbital");
    expect(resolveFacialTraumaContext({ displayName: "Zygomatic fracture" }).branches).toContain("zygomatic");
    expect(resolveFacialTraumaContext({ displayName: "Maxillary fracture" }).branches).toContain("maxillary");
  });

  it("resolves mandibular, Le Fort, dental, and jaw dislocation branches", () => {
    expect(resolveFacialTraumaContext({ displayName: "Mandible fracture" }).branches).toContain("mandibular");
    expect(resolveFacialTraumaContext({ displayName: "Le Fort II fracture" }).branches).toContain("lefort");
    expect(resolveFacialTraumaContext({ displayName: "Tooth avulsion" }).branches).toContain("dental");
    expect(resolveFacialTraumaContext({ displayName: "TMJ dislocation" }).branches).toContain("jaw_dislocation");
  });

  it("resolves ear, septal hematoma, facial laceration, and facial nerve branches", () => {
    expect(resolveFacialTraumaContext({ displayName: "Auricular hematoma" }).branches).toContain("ear");
    expect(resolveFacialTraumaContext({ displayName: "Nasal septal hematoma" }).branches).toContain("septal_hematoma");
    expect(resolveFacialTraumaContext({ displayName: "Facial laceration" }).branches).toContain("facial_laceration");
    expect(resolveFacialTraumaContext({ displayName: "Facial nerve injury" }).branches).toContain("facial_nerve");
  });

  it("never routes septal hematoma to the generic nasal-fracture discharge family", () => {
    const septal = resolveFacialTraumaContext({ code: "S02.2", displayName: "Nasal fracture with septal hematoma" });
    expect(septal.branches).toContain("nasal");
    expect(septal.branches).toContain("septal_hematoma");
    expect(septal.dischargeFamilyId).toBeNull();
    expect(septal.dischargeFamilyId).not.toBe("nasal_fracture_followup");
  });

  it("routes uncomplicated nasal fracture to nasal_fracture_followup", () => {
    expect(resolveFacialTraumaContext({ code: "S02.2", displayName: "Nasal bone fracture" }).dischargeFamilyId).toBe(
      "nasal_fracture_followup",
    );
  });

  it("preserves eye ownership for orbital fracture discharge routing", () => {
    expect(resolveFacialTraumaContext({ displayName: "Orbital floor fracture" }).dischargeFamilyId).toBe(
      "orbital_fracture_eye_followup",
    );
  });

  it("preserves dental ownership for dental injury discharge routing", () => {
    expect(resolveFacialTraumaContext({ displayName: "Tooth avulsion" }).dischargeFamilyId).toBe(
      "dental_avulsion_fracture_followup",
    );
  });

  it("routes jaw dislocation to jaw_dislocation_post_reduction", () => {
    expect(resolveFacialTraumaContext({ displayName: "TMJ dislocation" }).dischargeFamilyId).toBe(
      "jaw_dislocation_post_reduction",
    );
  });

  it("keeps Le Fort, mandibular, facial nerve, and auricular hematoma away from routine discharge", () => {
    expect(resolveFacialTraumaContext({ displayName: "Le Fort III fracture" }).dischargeFamilyId).toBeNull();
    expect(resolveFacialTraumaContext({ displayName: "Mandible fracture" }).dischargeFamilyId).toBeNull();
    expect(resolveFacialTraumaContext({ displayName: "Facial nerve injury" }).dischargeFamilyId).toBeNull();
    expect(resolveFacialTraumaContext({ displayName: "Auricular hematoma" }).dischargeFamilyId).toBeNull();
  });

  it("adapts documentation order to prioritize septal hematoma without changing diagnosis ownership", () => {
    const adapted = adaptFacialTraumaComplaintIntel(baseIntel, {
      branches: ["septal_hematoma", "nasal"],
      redFlagCategories: ["septal_hematoma_csf"],
    });
    expect(adapted.hpi?.[0]?.toLowerCase()).toContain("septalhematoma");
  });
});
