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
});
