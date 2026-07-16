import { describe, expect, it } from "vitest";
import {
  adaptAllergicInflammatoryDermatologyIntel,
  resolveAllergicInflammatoryDermatologyContext,
} from "./allergicInflammatoryDermatologyClinicalIntelligence";

describe("allergicInflammatoryDermatologyClinicalIntelligence", () => {
  it("resolves allergic contact dermatitis and allows routine discharge", () => {
    const context = resolveAllergicInflammatoryDermatologyContext({ displayName: "Allergic contact dermatitis, poison ivy exposure" });
    expect(context.branches).toContain("allergic_contact_dermatitis");
    expect(context.dischargeFamilyId).not.toBeNull();
  });

  it("resolves irritant contact dermatitis branch", () => {
    const context = resolveAllergicInflammatoryDermatologyContext({ displayName: "Irritant contact dermatitis of the hands" });
    expect(context.branches).toContain("irritant_contact_dermatitis");
  });

  it("resolves atopic dermatitis and eczema flare branches", () => {
    const context = resolveAllergicInflammatoryDermatologyContext({ displayName: "Atopic dermatitis, eczema flare" });
    expect(context.branches).toContain("atopic_dermatitis");
    expect(context.branches).toContain("eczema_flare");
  });

  it("resolves uncomplicated urticaria and allows routine discharge", () => {
    const context = resolveAllergicInflammatoryDermatologyContext({ displayName: "Urticaria, hives without airway involvement" });
    expect(context.branches).toContain("urticaria");
    expect(context.dischargeFamilyId).not.toBeNull();
  });

  it("withholds routine discharge for angioedema with airway involvement unless documented as follow-up", () => {
    const airway = resolveAllergicInflammatoryDermatologyContext({
      displayName: "Angioedema with tongue swelling and throat tightness",
    });
    const airwayFollowUp = resolveAllergicInflammatoryDermatologyContext({
      displayName: "Angioedema with throat tightness, follow-up recheck",
    });
    expect(airway.branches).toContain("angioedema_overlap");
    expect(airway.dischargeFamilyId).toBeNull();
    expect(airwayFollowUp.dischargeFamilyId).not.toBeNull();
  });

  it("allows routine discharge for uncomplicated angioedema without airway involvement", () => {
    const context = resolveAllergicInflammatoryDermatologyContext({ displayName: "Angioedema of the lip, no airway concern" });
    expect(context.branches).toContain("angioedema_overlap");
    expect(context.dischargeFamilyId).not.toBeNull();
  });

  it("resolves plaque psoriasis branch and allows routine discharge", () => {
    const context = resolveAllergicInflammatoryDermatologyContext({ displayName: "Plaque psoriasis flare" });
    expect(context.branches).toContain("psoriasis_plaque");
    expect(context.dischargeFamilyId).not.toBeNull();
  });

  it("withholds routine discharge for pustular/erythrodermic psoriasis unless documented as follow-up", () => {
    const pustular = resolveAllergicInflammatoryDermatologyContext({ displayName: "Generalized pustular psoriasis" });
    const pustularFollowUp = resolveAllergicInflammatoryDermatologyContext({
      displayName: "Generalized pustular psoriasis, follow-up recheck",
    });
    expect(pustular.branches).toContain("psoriasis_pustular_or_erythrodermic");
    expect(pustular.dischargeFamilyId).toBeNull();
    expect(pustularFollowUp.dischargeFamilyId).not.toBeNull();
  });

  it("resolves rosacea, seborrheic dermatitis, and intertrigo branches", () => {
    expect(resolveAllergicInflammatoryDermatologyContext({ displayName: "Rosacea" }).branches).toContain("rosacea");
    expect(
      resolveAllergicInflammatoryDermatologyContext({ displayName: "Seborrheic dermatitis of the scalp" }).branches
    ).toContain("seborrheic_dermatitis");
    expect(resolveAllergicInflammatoryDermatologyContext({ displayName: "Intertrigo of the skin folds" }).branches).toContain(
      "intertrigo"
    );
  });

  it("adapts (reorders) chip order without changing chip content", () => {
    const intel = { hpi: ["a", "angioedema overlap noted"], rosRedFlags: ["b"], mdmPlanSummary: ["c"] };
    const context = resolveAllergicInflammatoryDermatologyContext({ displayName: "angioedema with throat tightness" });
    const adapted = adaptAllergicInflammatoryDermatologyIntel(intel, context);
    expect(adapted.hpi?.slice().sort()).toEqual(intel.hpi.slice().sort());
  });
});
