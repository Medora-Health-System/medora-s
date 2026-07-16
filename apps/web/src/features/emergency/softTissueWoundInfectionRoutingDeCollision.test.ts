import { describe, expect, it } from "vitest";
import { resolveProviderDischargeTemplateForDiagnosis } from "./providerDischargeTemplateRegistry";

describe("softTissueWoundInfectionRoutingDeCollision — Phase 13", () => {
  it("routes cutaneous abscess away from nonpurulent cellulitis_v1", () => {
    const abscess = resolveProviderDischargeTemplateForDiagnosis({
      code: "L02.91",
      displayName: "Cutaneous abscess, unspecified",
    });
    const cellulitis = resolveProviderDischargeTemplateForDiagnosis({
      code: "L03.90",
      displayName: "Cellulitis, unspecified",
    });
    expect(abscess.template.id).toBe("abscess_without_drainage_v1");
    expect(cellulitis.template.id).toBe("cellulitis_v1");
    expect(abscess.template.id).not.toBe(cellulitis.template.id);
  });

  it("routes necrotizing fasciitis away from routine cellulitis", () => {
    const nsti = resolveProviderDischargeTemplateForDiagnosis({
      code: "M72.6",
      displayName: "Necrotizing fasciitis",
    });
    expect(nsti.template.id).toBe("necrotizing_soft_tissue_infection_post_acute_v1");
    expect(nsti.template.id).not.toBe("cellulitis_v1");
  });

  it("routes T81.4 postoperative infection separately from generic wound", () => {
    const ssi = resolveProviderDischargeTemplateForDiagnosis({
      code: "T81.41XA",
      displayName: "Infection following a procedure, surgical site",
    });
    expect(ssi.template.id).toBe("postoperative_wound_infection_v1");
  });

  it("routes T81.3 dehiscence separately from infection", () => {
    const deh = resolveProviderDischargeTemplateForDiagnosis({
      code: "T81.31XA",
      displayName: "Disruption of external operation (surgical) wound, not elsewhere classified",
    });
    expect(deh.template.id).toBe("wound_dehiscence_post_acute_v1");
  });

  it("routes diabetic foot ulcer codes to diabetic foot infection family", () => {
    const dfi = resolveProviderDischargeTemplateForDiagnosis({
      code: "E11.621",
      displayName: "Type 2 diabetes mellitus with foot ulcer",
    });
    expect(dfi.template.id).toBe("diabetic_foot_infection_v1");
  });

  it("preserves preseptal cellulitis eye ownership (L03.213)", () => {
    const preseptal = resolveProviderDischargeTemplateForDiagnosis({
      code: "L03.213",
      displayName: "Periorbital cellulitis",
    });
    expect(preseptal.template.id).toBe("preseptal_cellulitis_v1");
  });

  it("routes erysipelas to erysipelas_v1", () => {
    const erys = resolveProviderDischargeTemplateForDiagnosis({
      code: "A46",
      displayName: "Erysipelas",
    });
    expect(erys.template.id).toBe("erysipelas_v1");
  });

  it("routes pilonidal abscess by L05.0", () => {
    const pil = resolveProviderDischargeTemplateForDiagnosis({
      code: "L05.01",
      displayName: "Pilonidal cyst with abscess",
    });
    expect(pil.template.id).toBe("pilonidal_abscess_v1");
  });

  it("routes gas gangrene and Fournier to necrotizing post-acute family", () => {
    expect(
      resolveProviderDischargeTemplateForDiagnosis({ code: "A48.0", displayName: "Gas gangrene" }).template.id,
    ).toBe("necrotizing_soft_tissue_infection_post_acute_v1");
    expect(
      resolveProviderDischargeTemplateForDiagnosis({ code: "N49.3", displayName: "Fournier gangrene" }).template.id,
    ).toBe("necrotizing_soft_tissue_infection_post_acute_v1");
  });

  it("routes pyomyositis away from cellulitis", () => {
    expect(
      resolveProviderDischargeTemplateForDiagnosis({ code: "M60.000", displayName: "Infective myositis" }).template.id,
    ).toBe("pyomyositis_post_acute_v1");
  });
});
