import {
  mergeManifestSearchText,
  resolveEnterpriseSeedCatalogIsActive,
  safeManifestMapLookup,
} from "../../prisma/helpers/seed-enterprise-medication-manifest.utils";

describe("seed-enterprise-medication-manifest", () => {
  it("resolveEnterpriseSeedCatalogIsActive follows active registry", () => {
    const registry = new Set(["MORPHINE_2_MG_ML_INJECTABLE_INTRAVEINEUSE"]);
    expect(resolveEnterpriseSeedCatalogIsActive("MORPHINE_2_MG_ML_INJECTABLE_INTRAVEINEUSE", registry, false)).toBe(
      true
    );
    expect(resolveEnterpriseSeedCatalogIsActive("CEFTRIAXONE_1_G_IV", registry, false)).toBe(false);
    expect(resolveEnterpriseSeedCatalogIsActive("CEFTRIAXONE_1_G_IV", registry, true)).toBe(true);
  });

  it("safeManifestMapLookup never throws on undefined map", () => {
    expect(safeManifestMapLookup(undefined, "CODE")).toBeUndefined();
    expect(safeManifestMapLookup({ CODE: { x: 1 } }, "CODE")).toEqual({ x: 1 });
  });

  it("mergeManifestSearchText is additive without dropping existing tokens", () => {
    expect(mergeManifestSearchText("morphine iv", ["pain", "morphine"], "additive")).toBe("morphine iv pain");
  });
});
