import { inferMedicationAdministrationCpt } from "./medication-admin-cpt.util";

describe("medication-admin-cpt.util (M1.8B.3 SQ billing)", () => {
  it("infers 96372 for SQ order route", () => {
    const result = inferMedicationAdministrationCpt({ administrationRoute: "SQ" });
    expect(result?.cpt).toBe("96372");
  });

  it("infers 96372 for SC and sous-cutanée catalog fallback", () => {
    expect(inferMedicationAdministrationCpt({ administrationRoute: "SC" })?.cpt).toBe("96372");
    expect(inferMedicationAdministrationCpt({ catalogRoute: "sous-cutanée" })?.cpt).toBe("96372");
  });

  it("preserves IV push billing", () => {
    expect(inferMedicationAdministrationCpt({ administrationRoute: "IVP push" })?.cpt).toBe("96374");
  });

  it("preserves IM billing", () => {
    expect(inferMedicationAdministrationCpt({ administrationRoute: "IM" })?.cpt).toBe("96372");
  });
});
