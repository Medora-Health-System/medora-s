import {
  buildIvFluidSeedBodyFromSources,
  resolveIvFluidSeedBody,
} from "../../prisma/helpers/seed-enterprise-iv-fluids-catalog";

describe("seedEnterpriseIvFluidsCatalog resolveIvFluidSeedBody", () => {
  it("resolves SODIUM_CHLORIDE_0_9_250_ML_PERFUSION_INTRAVEINEUSE with NS search tokens", () => {
    const resolved = resolveIvFluidSeedBody("SODIUM_CHLORIDE_0_9_250_ML_PERFUSION_INTRAVEINEUSE");
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    expect(resolved.catalogCode).toBe("SODIUM_CHLORIDE_0_9_250_ML_PERFUSION_INTRAVEINEUSE");
    expect(resolved.body.displayNameEn).toBe("NS 0.9% 250 mL");
    expect(resolved.body.route).toBe("intraveineuse");
    expect(resolved.body.dosageForm).toBe("perfusion");
    expect(resolved.body.searchText).toMatch(/ns/);
    expect(resolved.body.searchText).toMatch(/normal saline/);
    expect(resolved.billingSourcePresent).toBe(true);
    expect(resolved.body.billingCodeDefault).toBe("J7030");
  });

  it("resolves PLASMALYTE_1000_ML_PERFUSION_INTRAVEINEUSE", () => {
    const resolved = resolveIvFluidSeedBody("PLASMALYTE_1000_ML_PERFUSION_INTRAVEINEUSE");
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    expect(resolved.body.displayNameEn).toBe("Plasma-Lyte 1000 mL");
    expect(resolved.body.genericName).toBe("Plasma-Lyte");
    expect(resolved.body.route).toBe("intraveineuse");
    expect(resolved.body.searchText).toMatch(/plasmalyte/);
  });

  it("resolves NORMOSOL_1000_ML_PERFUSION_INTRAVEINEUSE", () => {
    const resolved = resolveIvFluidSeedBody("NORMOSOL_1000_ML_PERFUSION_INTRAVEINEUSE");
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    expect(resolved.body.displayNameEn).toBe("Normosol 1000 mL");
    expect(resolved.body.genericName).toBe("Normosol");
    expect(resolved.body.searchText).toMatch(/normosol/);
  });

  it("does not crash when optional billing metadata is absent", () => {
    const resolved = buildIvFluidSeedBodyFromSources({
      catalogCode: "SODIUM_CHLORIDE_0_9_250_ML_PERFUSION_INTRAVEINEUSE",
      aliasEntry: {
        genericName: "Sodium chloride",
        displayHint: "NS 0.9% 250 mL",
        aliases: ["ns", "normal saline"],
        searchTerms: ["250 ml"],
      },
      formulary: {
        genericName: "Sodium chloride",
        displayNameFr: "Chlorure de sodium",
        displayNameEn: "Normal saline",
        strength: "0.9% 250 mL",
        dosageForm: "perfusion",
        route: "intraveineuse",
      },
    });

    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.billingSourcePresent).toBe(false);
    expect(resolved.body.billingCodeDefault).toBeNull();
    expect(resolved.body.ndc11).toBeNull();
    expect(resolved.body.displayNameEn).toBe("NS 0.9% 250 mL");
    expect(resolved.body.searchText).toMatch(/ns/);
  });

  it("fails clearly when required metadata is missing", () => {
    const unknown = resolveIvFluidSeedBody("TOTALLY_UNKNOWN_IV_FLUID_CODE");
    expect(unknown.ok).toBe(false);
    if (unknown.ok) return;
    expect(unknown.reason).toBe("missing_formulary_orderability_and_alias");

    const missingRoute = buildIvFluidSeedBodyFromSources({
      catalogCode: "TEST_IV_FLUID",
      aliasEntry: { displayHint: "Test fluid", genericName: "Test" },
      formulary: { dosageForm: "perfusion", genericName: "Test", displayNameEn: "Test fluid" },
    });
    expect(missingRoute.ok).toBe(false);
    if (missingRoute.ok) return;
    expect(missingRoute.reason).toBe("missing_required_route");
  });
});
