import { describe, expect, it } from "vitest";
import { resolveProviderDischargeTemplateForDiagnosis } from "./providerDischargeTemplateRegistry";

describe("dermatologyRoutingDeCollision — Phase 14", () => {
  it("preserves Phase 13 soft tissue ownership (L02 abscess, L03 cellulitis, A46 erysipelas)", () => {
    expect(
      resolveProviderDischargeTemplateForDiagnosis({ code: "L02.91", displayName: "Cutaneous abscess" }).template.id,
    ).toBe("abscess_without_drainage_v1");
    expect(
      resolveProviderDischargeTemplateForDiagnosis({ code: "L03.90", displayName: "Cellulitis" }).template.id,
    ).toBe("cellulitis_v1");
    expect(
      resolveProviderDischargeTemplateForDiagnosis({ code: "A46", displayName: "Erysipelas" }).template.id,
    ).toBe("erysipelas_v1");
  });

  it("preserves Phase 13 necrotizing soft tissue infection ownership", () => {
    expect(
      resolveProviderDischargeTemplateForDiagnosis({ code: "M72.6", displayName: "Necrotizing fasciitis" }).template
        .id,
    ).toBe("necrotizing_soft_tissue_infection_post_acute_v1");
  });

  it("preserves hidradenitis suppurativa ownership (L73.2) for both acute-flare and chronic framing", () => {
    const flare = resolveProviderDischargeTemplateForDiagnosis({ code: "L73.2", displayName: "Hidradenitis flare" });
    const chronic = resolveProviderDischargeTemplateForDiagnosis({
      code: "L73.2",
      displayName: "Chronic hidradenitis suppurativa",
    });
    expect(flare.template.id).toBe("hidradenitis_flare_v1");
    expect(chronic.template.id).toBe("hidradenitis_flare_v1");
  });

  it("routes herpes simplex and herpes zoster to distinct templates — zero HSV/zoster collision", () => {
    const hsv = resolveProviderDischargeTemplateForDiagnosis({ code: "B00.9", displayName: "Herpes simplex" });
    const zoster = resolveProviderDischargeTemplateForDiagnosis({ code: "B02.9", displayName: "Herpes zoster" });
    expect(hsv.template.id).toBe("herpes_simplex_v1");
    expect(zoster.template.id).toBe("herpes_zoster_v1");
    expect(hsv.template.id).not.toBe(zoster.template.id);
  });

  it("routes ophthalmic zoster to the eye-owned post-acute template, not routine herpes_zoster_v1", () => {
    const ophthalmic = resolveProviderDischargeTemplateForDiagnosis({
      code: "B02.3",
      displayName: "Zoster ocular disease",
    });
    expect(ophthalmic.template.id).toBe("ophthalmic_zoster_post_acute_v1");
    expect(ophthalmic.template.id).not.toBe("herpes_zoster_v1");
  });

  it("preserves ENT ownership of Ramsay Hunt / otic zoster (B02.2) — never dermatology-owned", () => {
    const ramsayHunt = resolveProviderDischargeTemplateForDiagnosis({
      code: "B02.2",
      displayName: "Ramsay Hunt syndrome",
    });
    expect(ramsayHunt.template.id).toBe("ramsay_hunt_followup_v1");
    expect(ramsayHunt.template.id).not.toBe("herpes_zoster_v1");
    expect(ramsayHunt.template.id).not.toBe("ophthalmic_zoster_post_acute_v1");
  });

  it("routes fungal infections away from dermatitis templates", () => {
    const tinea = resolveProviderDischargeTemplateForDiagnosis({ code: "B35.4", displayName: "Tinea corporis" });
    const candida = resolveProviderDischargeTemplateForDiagnosis({ code: "B37.2", displayName: "Candidal intertrigo" });
    expect(tinea.template.id).toBe("tinea_corporis_v1");
    expect(candida.template.id).toBe("candidal_intertrigo_v1");
    expect(tinea.template.id).not.toBe("atopic_dermatitis_v1");
    expect(candida.template.id).not.toBe("atopic_dermatitis_v1");
  });

  it("distinguishes all four tinea subtypes and tinea versicolor", () => {
    expect(resolveProviderDischargeTemplateForDiagnosis({ code: "B35.0", displayName: "Tinea capitis" }).template.id).toBe(
      "tinea_capitis_v1",
    );
    expect(resolveProviderDischargeTemplateForDiagnosis({ code: "B35.6", displayName: "Tinea cruris" }).template.id).toBe(
      "tinea_cruris_v1",
    );
    expect(resolveProviderDischargeTemplateForDiagnosis({ code: "B35.3", displayName: "Tinea pedis" }).template.id).toBe(
      "tinea_pedis_v1",
    );
    expect(
      resolveProviderDischargeTemplateForDiagnosis({ code: "B36.0", displayName: "Tinea versicolor" }).template.id,
    ).toBe("tinea_versicolor_v1");
  });

  it("routes SJS/TEN away from routine/uncomplicated drug eruption", () => {
    const sjs = resolveProviderDischargeTemplateForDiagnosis({ code: "L51.1", displayName: "Stevens-Johnson syndrome" });
    const ten = resolveProviderDischargeTemplateForDiagnosis({
      code: "L51.2",
      displayName: "Toxic epidermal necrolysis",
    });
    const drugRash = resolveProviderDischargeTemplateForDiagnosis({ code: "L27.0", displayName: "Drug eruption" });
    expect(sjs.template.id).toBe("sjs_ten_post_acute_v1");
    expect(ten.template.id).toBe("sjs_ten_post_acute_v1");
    expect(drugRash.template.id).toBe("drug_eruption_v1");
    expect(sjs.template.id).not.toBe(drugRash.template.id);
  });

  it("routes DRESS syndrome away from routine drug rash via keyword-based matching", () => {
    const dress = resolveProviderDischargeTemplateForDiagnosis({
      displayName: "DRESS syndrome post-acute care",
    });
    expect(dress.template.id).toBe("dress_post_acute_v1");
    expect(dress.template.id).not.toBe("drug_eruption_v1");
  });

  it("routes erythema multiforme minor away from SJS/TEN", () => {
    const em = resolveProviderDischargeTemplateForDiagnosis({ code: "L51.9", displayName: "Erythema multiforme" });
    expect(em.template.id).toBe("erythema_multiforme_v1");
    expect(em.template.id).not.toBe("sjs_ten_post_acute_v1");
  });

  it("does not steal allergy-owned L50 urticaria/anaphylaxis ownership", () => {
    const hives = resolveProviderDischargeTemplateForDiagnosis({ code: "L50.9", displayName: "Urticaria" });
    expect(hives.template.id).toBe("allergic_reaction_v1");
    expect(hives.template.id).not.toBe("uncomplicated_urticaria_v1");
  });

  it("routes an uncomplicated urticaria phrase to the dermatology template via keyword, without an ICD collision", () => {
    const uncomplicated = resolveProviderDischargeTemplateForDiagnosis({ displayName: "Uncomplicated urticaria" });
    expect(uncomplicated.template.id).toBe("uncomplicated_urticaria_v1");
  });

  it("routes scabies and pediculosis to distinct parasitic templates", () => {
    const scabies = resolveProviderDischargeTemplateForDiagnosis({ code: "B86", displayName: "Scabies" });
    const lice = resolveProviderDischargeTemplateForDiagnosis({ code: "B85.0", displayName: "Pediculosis capitis" });
    expect(scabies.template.id).toBe("scabies_v1");
    expect(lice.template.id).toBe("pediculosis_v1");
    expect(scabies.template.id).not.toBe(lice.template.id);
  });

  it("routes a suspicious pigmented lesion without benign-reassurance neoplasm language", () => {
    const lesion = resolveProviderDischargeTemplateForDiagnosis({ displayName: "Suspicious skin lesion" });
    expect(lesion.template.id).toBe("suspicious_skin_lesion_v1");
  });

  it("has zero unexplained generic fallbacks for the required Phase 14 dermatology probe set", () => {
    const probes: Array<{ code?: string; displayName: string }> = [
      { code: "L23.9", displayName: "Allergic contact dermatitis" },
      { code: "L24.9", displayName: "Irritant contact dermatitis" },
      { code: "L20.9", displayName: "Atopic dermatitis" },
      { code: "L40.0", displayName: "Psoriasis vulgaris" },
      { code: "L71.9", displayName: "Rosacea" },
      { code: "L01.00", displayName: "Impetigo" },
      { code: "L73.9", displayName: "Folliculitis" },
      { code: "B00.9", displayName: "Herpes simplex" },
      { code: "B02.9", displayName: "Herpes zoster" },
      { code: "B01.9", displayName: "Varicella" },
      { code: "B08.1", displayName: "Molluscum contagiosum" },
      { code: "B09", displayName: "Viral exanthem" },
      { code: "L42", displayName: "Pityriasis rosea" },
      { code: "B37.2", displayName: "Candidal intertrigo" },
      { code: "B86", displayName: "Scabies" },
      { code: "B85.2", displayName: "Pediculosis" },
      { code: "L51.9", displayName: "Erythema multiforme" },
      { code: "L27.0", displayName: "Drug eruption" },
      { code: "L95.9", displayName: "Cutaneous vasculitis" },
      { displayName: "Suspicious skin lesion" },
    ];
    for (const probe of probes) {
      const result = resolveProviderDischargeTemplateForDiagnosis(probe);
      expect(result.template.id, `probe "${probe.displayName}" resolved to generic fallback`).not.toBe(
        "generic_ed_discharge_v1",
      );
    }
  });
});
