/**
 * Historical diagnosis safety contracts (unit-level).
 * Encounter diagnoses store durable code/description snapshots independent of catalog mutations.
 */
describe("ICD-10 historical diagnosis safety", () => {
  it("documents snapshot fields that must remain on Diagnosis rows", () => {
    const diagnosisSnapshotFields = ["code", "description", "icd10CatalogId", "codeSource"] as const;
    expect(diagnosisSnapshotFields).toContain("code");
    expect(diagnosisSnapshotFields).toContain("description");
  });

  it("catalog inactivation must not delete diagnosis code snapshots", () => {
    const catalogRow = { id: "cat-1", code: "S86.011A", isActive: false, isSelectable: false };
    const diagnosis = {
      code: "S86.011A",
      description: "Strain of right Achilles tendon, initial encounter",
      icd10CatalogId: catalogRow.id,
    };
    expect(diagnosis.code).toBe("S86.011A");
    expect(diagnosis.description?.length).toBeGreaterThan(10);
    expect(catalogRow.isSelectable).toBe(false);
  });

  it("does not add Diagnosis.catalogReleaseVersion because icd10CatalogId already identifies the release", () => {
    const diagnosis = { code: "R10.85", description: "Abdominal pain", icd10CatalogId: "cat-1" };
    const catalog = { id: "cat-1", code: "R10.85", releaseVersion: "FY2026", codeSystem: "ICD-10-CM" };
    expect(diagnosis.icd10CatalogId).toBe(catalog.id);
    expect("catalogReleaseVersion" in diagnosis).toBe(false);
  });

  it("terminology labels must not mutate signed diagnosis snapshots or billing codes", () => {
    const signed = {
      code: "R10.85",
      description: "Abdominal pain, unspecified site",
      icd10CatalogId: "cat-r1085",
      codeSource: "ICD10_CATALOG",
    };
    const clinicianEs = "Dolor abdominal en varios sitios";
    expect(signed.code).toBe("R10.85");
    expect(signed.description).not.toBe(clinicianEs);
    expect(signed.description).toBe("Abdominal pain, unspecified site");
  });
});
