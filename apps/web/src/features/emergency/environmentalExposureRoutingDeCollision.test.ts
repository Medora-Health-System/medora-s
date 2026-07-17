import { describe, expect, it } from "vitest";
import { resolveProviderDischargeTemplateForDiagnosis } from "./providerDischargeTemplateRegistry";

describe("environmentalExposureRoutingDeCollision — Phase 15", () => {
  it("routes heat exhaustion and heat stroke to distinct templates — fever/heat cross-routing = 0", () => {
    const exhaustion = resolveProviderDischargeTemplateForDiagnosis({
      code: "T67.5XXA",
      displayName: "Heat exhaustion, unspecified",
    });
    const stroke = resolveProviderDischargeTemplateForDiagnosis({
      code: "T67.01XA",
      displayName: "Heat stroke post-acute care",
    });
    const fever = resolveProviderDischargeTemplateForDiagnosis({
      code: "R50.9",
      displayName: "Fever, unspecified",
    });
    expect(exhaustion.template.id).toBe("heat_exhaustion_v1");
    expect(stroke.template.id).toBe("heat_stroke_post_acute_v1");
    expect(fever.template.id).not.toBe("heat_exhaustion_v1");
    expect(fever.template.id).not.toBe("heat_stroke_post_acute_v1");
  });

  it("preserves burn-phase frostbite ownership for bare frostbite ICD codes", () => {
    const frostbite = resolveProviderDischargeTemplateForDiagnosis({
      code: "T33.90XA",
      displayName: "Superficial frostbite of unspecified site",
    });
    expect(frostbite.template.id).toBe("frostbite_v1");
  });

  it("routes keyword-specific superficial/deep frostbite without stealing bare frostbite ownership", () => {
    const superficial = resolveProviderDischargeTemplateForDiagnosis({
      displayName: "Superficial frostbite of the toes",
    });
    const deep = resolveProviderDischargeTemplateForDiagnosis({
      displayName: "Deep frostbite with tissue necrosis post-acute care",
    });
    expect(superficial.template.id).toBe("superficial_frostbite_v1");
    expect(deep.template.id).toBe("deep_frostbite_post_acute_v1");
  });

  it("routes lightning (T75.0) and electrocution (T75.4) separately — trauma mechanism preserved", () => {
    const lightning = resolveProviderDischargeTemplateForDiagnosis({
      code: "T75.00XA",
      displayName: "Effects of lightning",
    });
    const electrocution = resolveProviderDischargeTemplateForDiagnosis({
      code: "T75.4XXA",
      displayName: "Electrocution",
    });
    expect(lightning.template.id).toBe("lightning_injury_post_acute_v1");
    expect(electrocution.template.id).toBe("burn_electrical_v1");
  });

  it("preserves submersion provenance on T75.1 and never uses dry/secondary drowning templates", () => {
    const submersion = resolveProviderDischargeTemplateForDiagnosis({
      code: "T75.1XXA",
      displayName: "Effects of drowning and nonfatal submersion",
    });
    expect(submersion.template.id).toBe("post_submersion_observation_v1");
    const text = JSON.stringify(submersion.template.suggestedText ?? {}).toLowerCase();
    expect(text).not.toContain("dry drowning");
    expect(text).not.toContain("secondary drowning");
  });

  it("preserves ENT ownership of otitic barotrauma (T70.0)", () => {
    const otitic = resolveProviderDischargeTemplateForDiagnosis({
      code: "T70.0XXA",
      displayName: "Otitic barotrauma",
    });
    expect(otitic.template.id).toBe("blast_ear_injury_v1");
    expect(otitic.template.id).not.toBe("barotrauma_v1");
  });

  it("routes AMS, HACE, and HAPE distinctly — altitude under-routing = 0", () => {
    const ams = resolveProviderDischargeTemplateForDiagnosis({
      code: "T70.20XA",
      displayName: "Acute mountain sickness",
    });
    const hace = resolveProviderDischargeTemplateForDiagnosis({
      displayName: "HACE post-acute care",
    });
    const hape = resolveProviderDischargeTemplateForDiagnosis({
      displayName: "HAPE post-acute care",
    });
    expect(ams.template.id).toBe("acute_mountain_sickness_v1");
    expect(hace.template.id).toBe("hace_post_acute_v1");
    expect(hape.template.id).toBe("hape_post_acute_v1");
  });

  it("routes decompression illness and does not fall back to generic dizziness", () => {
    const dci = resolveProviderDischargeTemplateForDiagnosis({
      code: "T70.3XXA",
      displayName: "Decompression sickness post-acute care",
    });
    expect(dci.template.id).toBe("decompression_illness_post_acute_v1");
  });

  it("distinguishes radiation exposure follow-up from radiation injury post-acute", () => {
    const exposure = resolveProviderDischargeTemplateForDiagnosis({
      code: "T66.XXXA",
      displayName: "Radiation exposure follow-up",
    });
    const injury = resolveProviderDischargeTemplateForDiagnosis({
      displayName: "Acute radiation syndrome post-acute care",
    });
    expect(exposure.template.id).toBe("radiation_exposure_followup_v1");
    expect(injury.template.id).toBe("radiation_injury_post_acute_v1");
  });

  it("does not claim carbon monoxide / toxicology ownership (T58 stays outside env families)", () => {
    const co = resolveProviderDischargeTemplateForDiagnosis({
      code: "T58.91XA",
      displayName: "Toxic effect of carbon monoxide",
    });
    expect(co.template.id).not.toBe("radiation_exposure_followup_v1");
    expect(co.template.id).not.toBe("heat_exhaustion_v1");
    expect(co.template.id).not.toBe("post_submersion_observation_v1");
  });

  it("preserves Phase 13/14 ownership (cellulitis, SJS/TEN)", () => {
    expect(
      resolveProviderDischargeTemplateForDiagnosis({ code: "L03.90", displayName: "Cellulitis" }).template.id,
    ).toBe("cellulitis_v1");
    expect(
      resolveProviderDischargeTemplateForDiagnosis({
        code: "L51.1",
        displayName: "Stevens-Johnson syndrome",
      }).template.id,
    ).toBe("sjs_ten_post_acute_v1");
  });

  it("routes chilblains and immersion foot distinctly from frostbite", () => {
    expect(
      resolveProviderDischargeTemplateForDiagnosis({ code: "T69.1XXA", displayName: "Chilblains" }).template.id,
    ).toBe("chilblains_pernio_v1");
    expect(
      resolveProviderDischargeTemplateForDiagnosis({
        code: "T69.029A",
        displayName: "Immersion foot, unspecified foot",
      }).template.id,
    ).toBe("immersion_foot_v1");
  });
});
