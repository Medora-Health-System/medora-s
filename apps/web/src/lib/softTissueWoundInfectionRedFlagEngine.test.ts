import { describe, expect, it } from "vitest";
import {
  isSoftTissueLimbOrLifeThreateningFlagged,
  resolveSoftTissueWoundInfectionRedFlags,
  softTissueWoundInfectionRedFlagWarnings,
} from "./softTissueWoundInfectionRedFlagEngine";

describe("softTissueWoundInfectionRedFlagEngine", () => {
  it("does not invent red flags from empty documentation", () => {
    expect(resolveSoftTissueWoundInfectionRedFlags({}).categories).toEqual([]);
    expect(softTissueWoundInfectionRedFlagWarnings({})).toEqual([]);
    expect(isSoftTissueLimbOrLifeThreateningFlagged({})).toBe(false);
  });

  it("screens necrotizing soft tissue infection concern and references LRINEC as documentation-only", () => {
    const result = resolveSoftTissueWoundInfectionRedFlags({
      documentedFlags: ["pain out of proportion to exam", "rapidly progressive skin necrosis"],
    });
    expect(result.categories).toContain("necrotizing_soft_tissue_infection");
    expect(result.prompts.join(" ").toLowerCase()).toMatch(/lrinec/);
    expect(result.prompts.join(" ").toLowerCase()).toMatch(/never an autonomous rule-out/);
    expect(isSoftTissueLimbOrLifeThreateningFlagged({ documentedFlags: ["necrotizing fasciitis"] })).toBe(true);
  });

  it("screens gas gangrene concern distinct from routine cellulitis", () => {
    const result = resolveSoftTissueWoundInfectionRedFlags({ documentedFlags: ["crepitus palpable", "subcutaneous gas"] });
    expect(result.categories).toContain("gas_gangrene");
    expect(isSoftTissueLimbOrLifeThreateningFlagged({ documentedFlags: ["gas gangrene"] })).toBe(true);
  });

  it("screens Fournier gangrene concern", () => {
    const result = resolveSoftTissueWoundInfectionRedFlags({ documentedFlags: ["fournier's gangrene"] });
    expect(result.categories).toContain("fournier_gangrene");
    expect(isSoftTissueLimbOrLifeThreateningFlagged({ documentedFlags: ["fournier's gangrene"] })).toBe(true);
  });

  it("screens flexor tenosynovitis concern via Kanavel-sign language, documentation only", () => {
    const result = resolveSoftTissueWoundInfectionRedFlags({
      documentedFlags: ["finger held in flexion", "tenderness along the flexor tendon sheath"],
    });
    expect(result.categories).toContain("flexor_tenosynovitis");
    expect(result.prompts.join(" ").toLowerCase()).toMatch(/not an automated diagnosis/);
  });

  it("screens deep space hand infection concern distinct from a superficial felon", () => {
    const result = resolveSoftTissueWoundInfectionRedFlags({ documentedFlags: ["palmar space infection"] });
    expect(result.categories).toContain("deep_space_hand_infection");
  });

  it("screens diabetic foot limb-threat concern", () => {
    const result = resolveSoftTissueWoundInfectionRedFlags({ documentedFlags: ["diabetic foot infection with gangrene"] });
    expect(result.categories).toContain("diabetic_foot_limb_threat");
    expect(isSoftTissueLimbOrLifeThreateningFlagged({ documentedFlags: ["diabetic foot infection with gangrene"] })).toBe(
      true
    );
  });

  it("screens fascial dehiscence / evisceration concern", () => {
    const result = resolveSoftTissueWoundInfectionRedFlags({ documentedFlags: ["abdominal wound separated with bowel visible"] });
    expect(result.categories).toContain("fascial_dehiscence_evisceration");
    expect(result.prompts.join(" ").toLowerCase()).toMatch(/moist sterile dressing/);
  });

  it("screens septic arthritis concern distinct from reactive arthritis", () => {
    const result = resolveSoftTissueWoundInfectionRedFlags({ documentedFlags: ["monoarticular swelling with fever"] });
    expect(result.categories).toContain("septic_arthritis_concern");
  });

  it("screens osteomyelitis concern", () => {
    const result = resolveSoftTissueWoundInfectionRedFlags({ documentedFlags: ["chronic non-healing ulcer with exposed bone"] });
    expect(result.categories).toContain("osteomyelitis_concern");
  });

  it("screens systemic toxicity/sepsis concern without duplicating dedicated sepsis screening", () => {
    const result = resolveSoftTissueWoundInfectionRedFlags({ documentedFlags: ["toxic appearing with wound infection"] });
    expect(result.categories).toContain("systemic_toxicity_sepsis");
    expect(result.prompts.join(" ").toLowerCase()).toMatch(/not duplicated here/);
  });

  it("screens herpetic whitlow concern and states I&D is not indicated", () => {
    const result = resolveSoftTissueWoundInfectionRedFlags({ documentedFlags: ["vesicular lesions on the fingertip"] });
    expect(result.categories).toContain("herpetic_whitlow_no_drainage");
    expect(result.prompts.join(" ").toLowerCase()).toMatch(/incision and drainage is not indicated/);
  });

  it("never autonomously orders antibiotics, I&D, admission, transfer, or a consult in any prompt", () => {
    const prompts = softTissueWoundInfectionRedFlagWarnings({
      documentedFlags: [
        "necrotizing fasciitis",
        "gas gangrene",
        "fournier's gangrene",
        "fascial dehiscence with evisceration",
        "toxic appearing with wound infection",
        "herpetic whitlow",
      ],
    }).join(" ");
    expect(prompts.toLowerCase()).toMatch(
      /does not autonomously order antibiotics, incision and drainage \(i&d\), admission, transfer, or a consult/
    );
  });
});
