import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationModel";
import { GCS_FOUNDATION_STATUS, deriveGcsSeverityBand } from "@/lib/glasgowComaScaleFoundation";
import { resolveHeadInjuryContext } from "@/lib/headInjuryClinicalIntelligence";
import { resolveFacialTraumaContext } from "@/lib/facialTraumaClinicalIntelligence";

describe("headFacialTraumaEnterpriseClinicalContent — Phase 10", () => {
  it("exposes exactly one Head Injury / TBI and one Facial Trauma adaptive template", () => {
    const head = PROVIDER_DOCUMENTATION_TEMPLATES.filter((t) => t.id === "head_injury_adult_complaint_v1");
    const facial = PROVIDER_DOCUMENTATION_TEMPLATES.filter((t) => t.id === "facial_trauma_adult_complaint_v1");
    expect(head).toHaveLength(1);
    expect(facial).toHaveLength(1);
  });

  it("does not create separate visible templates for concussion, subdural, or nasal fracture", () => {
    expect(
      PROVIDER_DOCUMENTATION_TEMPLATES.some((t) =>
        /^(concussion|subdural|nasal_fracture|orbital_fracture|zygomatic_fracture|basilar_skull)_complaint/.test(t.id),
      ),
    ).toBe(false);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "head_injury_adult_complaint_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "facial_trauma_adult_complaint_v1")).toBe(true);
  });

  it("leaves existing head_injury and minor_head_injury_complaint_v1 templates unchanged", () => {
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "head_injury")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "minor_head_injury_complaint_v1")).toBe(true);
  });

  it("labels GCS as a structured documentation foundation without autonomous TBI severity claims", () => {
    expect(GCS_FOUNDATION_STATUS).toBe("STRUCTURED_FOUNDATION_READY");
    expect(deriveGcsSeverityBand(15)).toBe("MILD");
    expect(deriveGcsSeverityBand(10)).toBe("MODERATE");
    expect(deriveGcsSeverityBand(6)).toBe("SEVERE");
  });

  it("routes concussion/mild TBI distinctly from intracranial hemorrhage", () => {
    const concussion = resolveHeadInjuryContext({ code: "S06.0", displayName: "Concussion" });
    const ich = resolveHeadInjuryContext({
      code: "S06.5",
      displayName: "Traumatic subdural hemorrhage, follow-up",
      documentedFlags: ["known stable bleed on interval CT"],
    });
    expect(concussion.branches).toContain("concussion_mild_tbi");
    expect(concussion.dischargeFamilyId).toBe("concussion_mild_tbi");
    expect(ich.branches).toContain("ich");
    expect(ich.dischargeFamilyId).toBe("intracranial_hemorrhage_followup");
    expect(concussion.dischargeFamilyId).not.toBe(ich.dischargeFamilyId);
  });

  it("withholds a discharge family for acute/severe head injury pending clinician disposition", () => {
    const acuteIch = resolveHeadInjuryContext({ code: "S06.5", displayName: "Traumatic subdural hemorrhage" });
    const severe = resolveHeadInjuryContext({ code: "S06.2", displayName: "Severe traumatic brain injury" });
    expect(acuteIch.dischargeFamilyId).toBeNull();
    expect(severe.dischargeFamilyId).toBeNull();
  });

  it("keeps non-accidental trauma concern free of any discharge-family auto-routing", () => {
    const nat = resolveHeadInjuryContext({
      code: "S00.9",
      displayName: "Head injury",
      documentedFlags: ["mechanism inconsistent with reported injury", "concern for non-accidental trauma"],
    });
    expect(nat.branches).toContain("nat");
    expect(nat.dischargeFamilyId).toBeNull();
  });

  it("keeps septal hematoma from defaulting to the generic nasal fracture discharge family", () => {
    const septalHematoma = resolveFacialTraumaContext({ code: "S02.2", displayName: "Nasal septal hematoma" });
    const nasalFracture = resolveFacialTraumaContext({ code: "S02.2", displayName: "Nasal fracture" });
    expect(septalHematoma.branches).toContain("septal_hematoma");
    expect(septalHematoma.dischargeFamilyId).toBeNull();
    expect(nasalFracture.dischargeFamilyId).toBe("nasal_fracture_followup");
  });

  it("preserves eye and dental ownership in facial trauma discharge routing", () => {
    const orbital = resolveFacialTraumaContext({ code: "S02.3", displayName: "Orbital floor fracture" });
    const dental = resolveFacialTraumaContext({ code: "S02.5", displayName: "Tooth fracture" });
    expect(orbital.dischargeFamilyId).toBe("orbital_fracture_eye_followup");
    expect(dental.dischargeFamilyId).toBe("dental_avulsion_fracture_followup");
  });

  it("routes jaw dislocation to a post-reduction discharge family", () => {
    const jaw = resolveFacialTraumaContext({ code: "S03.0", displayName: "TMJ dislocation" });
    expect(jaw.dischargeFamilyId).toBe("jaw_dislocation_post_reduction");
  });
});
