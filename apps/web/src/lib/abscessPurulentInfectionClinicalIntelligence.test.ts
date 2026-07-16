import { describe, expect, it } from "vitest";
import { resolveAbscessPurulentInfectionContext } from "./abscessPurulentInfectionClinicalIntelligence";

describe("abscessPurulentInfectionClinicalIntelligence", () => {
  it("resolves a simple cutaneous abscess and allows routine discharge", () => {
    const context = resolveAbscessPurulentInfectionContext({ displayName: "Cutaneous abscess of the forearm" });
    expect(context.branches).toContain("cutaneous_abscess");
    expect(context.dischargeFamilyId).not.toBeNull();
  });

  it("resolves felon and paronychia branches", () => {
    const felon = resolveAbscessPurulentInfectionContext({ displayName: "Felon of the fingertip" });
    expect(felon.branches).toContain("felon");
    const paronychia = resolveAbscessPurulentInfectionContext({ displayName: "Paronychia of the nail fold" });
    expect(paronychia.branches).toContain("paronychia");
  });

  it("resolves furuncle vs. carbuncle distinctly", () => {
    const furuncle = resolveAbscessPurulentInfectionContext({ displayName: "Furuncle on the back" });
    expect(furuncle.branches).toContain("furuncle");
    const carbuncle = resolveAbscessPurulentInfectionContext({ displayName: "Carbuncle with multiple connected follicles" });
    expect(carbuncle.branches).toContain("carbuncle");
  });

  it("resolves pilonidal and hidradenitis-related abscess branches", () => {
    const pilonidal = resolveAbscessPurulentInfectionContext({ displayName: "Pilonidal abscess" });
    expect(pilonidal.branches).toContain("pilonidal_abscess");
    const hidradenitis = resolveAbscessPurulentInfectionContext({ displayName: "Hidradenitis suppurativa flare with abscess" });
    expect(hidradenitis.branches).toContain("hidradenitis_related_abscess");
  });

  it("never offers an I&D-oriented discharge family for herpetic whitlow concern", () => {
    const whitlow = resolveAbscessPurulentInfectionContext({ displayName: "Vesicular lesions on the fingertip, herpetic whitlow" });
    expect(whitlow.branches).toContain("herpetic_whitlow_concern");
    expect(whitlow.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for deep collection concern unless documented as follow-up", () => {
    const deepCollection = resolveAbscessPurulentInfectionContext({ displayName: "Deep space hand infection with abscess" });
    expect(deepCollection.branches).toContain("deep_collection_concern");
    expect(deepCollection.dischargeFamilyId).toBeNull();
    const followUp = resolveAbscessPurulentInfectionContext({ displayName: "Deep collection, follow-up recheck" });
    expect(followUp.dischargeFamilyId).not.toBeNull();
  });

  it("resolves perianal and postoperative abscess overlap branches", () => {
    const perianal = resolveAbscessPurulentInfectionContext({ displayName: "Perianal abscess" });
    expect(perianal.branches).toContain("perianal_overlap");
    const postop = resolveAbscessPurulentInfectionContext({ displayName: "Postoperative abscess at incision site" });
    expect(postop.branches).toContain("postoperative_abscess");
  });
});
