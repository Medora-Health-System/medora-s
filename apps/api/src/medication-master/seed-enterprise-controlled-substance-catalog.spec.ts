import {
  CONTROLLED_SUBSTANCE_WAVE_C_BRAND_ALIASES,
  buildControlledSubstanceSeedBodyFromSources,
  resolveControlledSubstanceWaveCSeedBody,
} from "../../prisma/helpers/seed-enterprise-controlled-substance-catalog";

describe("seedEnterpriseControlledSubstanceCatalog", () => {
  it("resolves Hydromorphone 0.5 seed body with controlled metadata and Dilaudid aliases", () => {
    const resolved = resolveControlledSubstanceWaveCSeedBody(
      "HYDROMORPHONE_0_5_MG_ML_INJECTABLE_INTRAVEINEUSE"
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    expect(resolved.body.isActive).toBe(true);
    expect(resolved.body.isControlled).toBe(true);
    expect(resolved.body.controlledSchedule).toBe("II");
    expect(resolved.body.requiresWitness).toBe(false);
    expect(resolved.body.requiresDoubleSign).toBe(false);
    expect(resolved.body.route).toBe("intraveineuse");
    expect(resolved.aliases).toEqual(expect.arrayContaining(["dilaudid", "hydromorphone"]));
    expect(resolved.body.searchText).toMatch(/hydromorphone/);
    expect(resolved.billingSourcePresent).toBe(true);
    expect(resolved.body.billingCodeDefault).toBe("J3490");
  });

  it("includes Norco and Hydrocodone aliases for hydrocodone/APAP rows", () => {
    const resolved = resolveControlledSubstanceWaveCSeedBody(
      "HYDROCODONE_ACETAMINOPHEN_5_325_COMPRIME_ORAL"
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.aliases).toEqual(
      expect.arrayContaining(["norco", "hydrocodone"])
    );
  });

  it("includes Percocet and Oxycodone aliases", () => {
    const resolved = resolveControlledSubstanceWaveCSeedBody(
      "OXYCODONE_ACETAMINOPHEN_5_325_COMPRIME_ORAL"
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.aliases).toEqual(
      expect.arrayContaining(["percocet", "oxycodone"])
    );
  });

  it("includes Tylenol #3 and Codeine aliases", () => {
    const resolved = resolveControlledSubstanceWaveCSeedBody(
      "ACETAMINOPHEN_CODEINE_300_30_COMPRIME_ORAL"
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.aliases).toEqual(
      expect.arrayContaining(["tylenol 3", "tylenol #3", "codeine"])
    );
  });

  it("includes Flexeril and Cyclobenzaprine aliases", () => {
    const resolved = resolveControlledSubstanceWaveCSeedBody("CYCLOBENZAPRINE_10_MG_COMPRIME_ORAL");
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.aliases).toEqual(
      expect.arrayContaining(["flexeril", "cyclobenzaprine"])
    );
  });

  it("includes Robaxin and Methocarbamol aliases", () => {
    const resolved = resolveControlledSubstanceWaveCSeedBody("METHOCARBAMOL_500_MG_COMPRIME_ORAL");
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.aliases).toEqual(
      expect.arrayContaining(["robaxin", "methocarbamol"])
    );
  });

  it("includes Lidocaine patch aliases", () => {
    const resolved = resolveControlledSubstanceWaveCSeedBody("LIDOCAINE_5_PATCH_TRANSDERMAL");
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.aliases).toEqual(
      expect.arrayContaining(["lidocaine patch", "lidocaine"])
    );
  });

  it("includes Voltaren and Diclofenac gel aliases", () => {
    const resolved = resolveControlledSubstanceWaveCSeedBody("DICLOFENAC_1_GEL_TOPICAL");
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.aliases).toEqual(
      expect.arrayContaining(["voltaren", "diclofenac gel", "diclofenac"])
    );
  });

  it("does not crash when optional billing metadata is absent", () => {
    const resolved = buildControlledSubstanceSeedBodyFromSources({
      catalogCode: "CYCLOBENZAPRINE_5_MG_COMPRIME_ORAL",
      extraAliases: CONTROLLED_SUBSTANCE_WAVE_C_BRAND_ALIASES.CYCLOBENZAPRINE_5_MG_COMPRIME_ORAL,
      formulary: {
        catalogCode: "CYCLOBENZAPRINE_5_MG_COMPRIME_ORAL",
        genericName: "Cyclobenzaprine",
        displayNameFr: "Cyclobenzaprine",
        displayNameEn: "Cyclobenzaprine",
        strength: "5 mg",
        dosageForm: "comprimé",
        route: "orale",
        therapeuticClass: "Relaxant musculaire",
        bucket: "CONTROLLED_SUBSTANCE_WAVE_C",
        mode: "CREATE",
        aliases: [{ text: "Flexeril 5 mg", language: "en", aliasType: "OTHER" }],
        searchTerms: ["cyclobenzaprine 5 mg"],
        governance: {
          isControlled: false,
          controlledSchedule: null,
          isHighAlert: false,
          requiresWitness: false,
          requiresDoubleSign: false,
          lasaGroupId: null,
          requiresPharmacyVerification: false,
          pyxisWasteWitnessExternalized: false,
        },
        isEssential: false,
        administrationType: "ORAL",
        billingClass: "THERAPEUTIC",
      },
    });

    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.billingSourcePresent).toBe(false);
    expect(resolved.body.billingCodeDefault).toBeNull();
    expect(resolved.body.isControlled).toBe(false);
    expect(resolved.body.requiresWitness).toBe(false);
  });

  it("fails clearly when required metadata is missing", () => {
    const resolved = resolveControlledSubstanceWaveCSeedBody("UNKNOWN_WAVE_C_CODE");
    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.reason).toBe("missing_formulary_manifest_row");
  });

  it("returns stable seed body on repeated resolution (idempotent upsert input)", () => {
    const first = resolveControlledSubstanceWaveCSeedBody("GABAPENTIN_300_MG_GELULE_ORALE");
    const second = resolveControlledSubstanceWaveCSeedBody("GABAPENTIN_300_MG_GELULE_ORALE");
    expect(first).toEqual(second);
  });
});
