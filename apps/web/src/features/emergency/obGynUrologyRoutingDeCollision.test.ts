import { describe, expect, it } from "vitest";
import { resolveProviderDischargeTemplateForDiagnosis } from "./providerDischargeTemplateRegistry";

describe("obGynUrologyRoutingDeCollision — Phase 17", () => {
  it("routes O02.81 to pregnancy unknown location, not ectopic O00 family", () => {
    const pul = resolveProviderDischargeTemplateForDiagnosis({
      code: "O02.81",
      displayName: "Pregnancy of unknown location",
    });
    const ectopic = resolveProviderDischargeTemplateForDiagnosis({
      code: "O00.90",
      displayName: "Ectopic pregnancy, unspecified",
    });
    expect(pul.template.id).toBe("pregnancy_unknown_location_v1");
    expect(ectopic.template.id).toBe("ectopic_pregnancy_post_acute_v1");
    expect(pul.template.id).not.toBe(ectopic.template.id);
  });

  it("routes O20.0 to threatened_abortion_v1 (Phase 17), not legacy Batch 7 miscarriage template", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "O20.0",
      displayName: "Threatened abortion",
    });
    expect(resolved.template.id).toBe("threatened_abortion_v1");
    expect(resolved.template.id).not.toBe("obgyn_threatened_miscarriage_precautions_v1");
  });

  it("routes O03 spontaneous abortion to early pregnancy loss post-acute", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "O03.9",
      displayName: "Spontaneous abortion, unspecified",
    });
    expect(resolved.template.id).toBe("early_pregnancy_loss_post_acute_v1");
  });

  it("routes HELLP O14.2 to hypertensive pregnancy post-acute", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "O14.20",
      displayName: "HELLP syndrome, unspecified trimester",
    });
    expect(resolved.template.id).toBe("hypertensive_pregnancy_post_acute_v1");
  });

  it("routes ovarian torsion N83.51 ahead of ovarian cyst N83.2", () => {
    const torsion = resolveProviderDischargeTemplateForDiagnosis({
      code: "N83.511",
      displayName: "Torsion of ovary and ovarian pedicle",
    });
    const cyst = resolveProviderDischargeTemplateForDiagnosis({
      code: "N83.202",
      displayName: "Unspecified ovarian cyst, left side",
    });
    expect(torsion.template.id).toBe("ovarian_torsion_post_acute_v1");
    expect(cyst.template.id).toBe("ovarian_cyst_v1");
  });

  it("routes PID N73.9 separately from tubo-ovarian abscess N70.03", () => {
    const pid = resolveProviderDischargeTemplateForDiagnosis({
      code: "N73.9",
      displayName: "Female pelvic inflammatory disease, unspecified",
    });
    const toa = resolveProviderDischargeTemplateForDiagnosis({
      code: "N70.03",
      displayName: "Acute salpingitis and oophoritis",
    });
    expect(pid.template.id).toBe("pelvic_inflammatory_disease_v1");
    expect(toa.template.id).toBe("tubo_ovarian_abscess_post_acute_v1");
  });

  it("routes N76 vaginitis to Phase 17 vaginitis_v1", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "N76.0",
      displayName: "Acute vaginitis",
    });
    expect(resolved.template.id).toBe("vaginitis_v1");
  });

  it("routes stone N20 vs obstruction N13 vs pyelonephritis N10 to distinct families", () => {
    const stone = resolveProviderDischargeTemplateForDiagnosis({ code: "N20.0", displayName: "Calculus of kidney" });
    const obstruct = resolveProviderDischargeTemplateForDiagnosis({
      code: "N13.2",
      displayName: "Hydronephrosis with renal and ureteral calculous obstruction",
    });
    const pyelo = resolveProviderDischargeTemplateForDiagnosis({
      code: "N10",
      displayName: "Acute pyelonephritis",
    });
    expect(stone.template.id).toBe("kidney_stone_v1");
    expect(obstruct.template.id).toBe("obstructing_ureteral_stone_post_acute_v1");
    expect(pyelo.template.id).toBe("pyelonephritis_v1");
    expect(pyelo.template.id).not.toBe("urology_pyelonephritis_followup_v1");
  });

  it("routes N30 cystitis and keeps N39.0 on legacy uti_v1", () => {
    const cystitis = resolveProviderDischargeTemplateForDiagnosis({
      code: "N30.00",
      displayName: "Acute cystitis without hematuria",
    });
    const uti = resolveProviderDischargeTemplateForDiagnosis({
      code: "N39.0",
      displayName: "Urinary tract infection, site not specified",
    });
    expect(cystitis.template.id).toBe("cystitis_v1");
    expect(uti.template.id).toBe("uti_v1");
  });

  it("routes testicular torsion N44 vs epididymitis N45 distinctly", () => {
    const torsion = resolveProviderDischargeTemplateForDiagnosis({
      code: "N44.00",
      displayName: "Torsion of testis",
    });
    const epididymitis = resolveProviderDischargeTemplateForDiagnosis({
      code: "N45.1",
      displayName: "Epididymitis",
    });
    expect(torsion.template.id).toBe("testicular_torsion_post_acute_v1");
    expect(epididymitis.template.id).toBe("epididymitis_v1");
  });

  it("keeps N49.3 Fournier on Phase 13 necrotizing soft tissue infection", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "N49.3",
      displayName: "Fournier gangrene",
    });
    expect(resolved.template.id).toBe("necrotizing_soft_tissue_infection_post_acute_v1");
    expect(resolved.template.id).not.toBe("epididymitis_v1");
    expect(resolved.template.id).not.toBe("orchitis_v1");
  });

  it("routes priapism N48.33 and paraphimosis N47.2 to Phase 17 urology families", () => {
    const priapism = resolveProviderDischargeTemplateForDiagnosis({
      code: "N48.33",
      displayName: "Priapism, drug-induced",
    });
    const paraphimosis = resolveProviderDischargeTemplateForDiagnosis({
      code: "N47.2",
      displayName: "Paraphimosis",
    });
    expect(priapism.template.id).toBe("priapism_post_acute_v1");
    expect(paraphimosis.template.id).toBe("paraphimosis_post_acute_v1");
  });

  it("high-risk obstetric families never resolve as early_pregnancy_bleeding_v1 for O00 or O14", () => {
    for (const code of ["O00.90", "O14.00", "O72.1"]) {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code, displayName: code });
      expect(resolved.template.id).not.toBe("early_pregnancy_bleeding_v1");
    }
  });

  it("does not let alcohol intoxication steal obstetric keyword routing", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "O21.9",
      displayName: "Hyperemesis gravidarum, unspecified",
    });
    expect(resolved.template.id).toBe("hyperemesis_gravidarum_v1");
    expect(resolved.template.id).not.toMatch(/alcohol|intoxication/);
  });
});
