import { describe, expect, it } from "vitest";
import {
  isIncompleteMedicationOrderDisplayLabel,
  isStrengthOnlyMedicationLabel,
  resolveMedicationOrderIdentity,
} from "./medicationOrderIdentity.js";

describe("medicationOrderIdentity (M1.7A.6)", () => {
  const hydroCatalog = {
    code: "HYDROMORPHONE_2MG_ML_INJECTABLE",
    displayNameEn: null,
    displayNameFr: "Hydromorphone",
    genericName: "Hydromorphone",
    strength: "2 mg/mL",
  };

  it("active Hydromorphone catalog order resolves Hydromorphone 2 mg/mL", () => {
    const id = resolveMedicationOrderIdentity({
      catalogMedication: hydroCatalog,
      orderLine: {
        catalogItemType: "MEDICATION",
        manualLabel: null,
        manualSecondaryText: null,
        strength: "2 mg/mL",
      },
    });
    expect(id.displayLabelEn).toBe("Hydromorphone 2 mg/mL");
    expect(id.displayLabelFr).toBe("Hydromorphone 2 mg/mL");
    expect(id.medicationNameEn).toBe("Hydromorphone");
    expect(id.source).not.toBe("fallback");
  });

  it("rejects strength-only poisoned display and resolves from code INN", () => {
    const id = resolveMedicationOrderIdentity({
      catalogMedication: {
        code: "HYDROMORPHONE_2MG_ML_INJECTABLE",
        displayNameEn: "2 mg/mL",
        displayNameFr: "2 mg/mL",
        genericName: null,
        strength: "2 mg/mL",
      },
      orderLine: {
        catalogItemType: "MEDICATION",
        strength: "2 mg/mL",
      },
    });
    expect(id.displayLabelEn).toBe("Hydromorphone 2 mg/mL");
    expect(id.source).toBe("catalog_code_inn");
  });

  it("MedicationProduct legacy catalog + concept resolves name + strength", () => {
    const id = resolveMedicationOrderIdentity({
      medicationProduct: {
        code: "HYDROMORPHONE_2MG_ML_INJECTABLE",
        strengthDisplay: "2 mg/mL",
        legacyCatalogMedication: {
          code: "HYDROMORPHONE_2MG_ML_INJECTABLE",
          displayNameEn: null,
          displayNameFr: null,
          genericName: null,
          strength: "2 mg/mL",
        },
        concept: { genericName: "Hydromorphone", displayName: "Hydromorphone" },
      },
      orderLine: { catalogItemType: "MEDICATION", strength: "2 mg/mL" },
    });
    expect(id.displayLabelEn).toBe("Hydromorphone 2 mg/mL");
    expect(id.source).toBe("medication_concept");
  });

  it("snapshot with full label recovers name when catalog sparse", () => {
    const id = resolveMedicationOrderIdentity({
      catalogMedication: { strength: "2 mg/mL" },
      snapshotLabel: "Hydromorphone 2 mg/mL",
      orderLine: { catalogItemType: "MEDICATION", strength: "2 mg/mL" },
    });
    expect(id.displayLabelEn).toBe("Hydromorphone 2 mg/mL");
    expect(id.source).toBe("snapshot");
  });

  it("strength-only label is incomplete", () => {
    expect(isStrengthOnlyMedicationLabel("2 mg/mL", ["2 mg/mL"])).toBe(true);
    expect(
      isIncompleteMedicationOrderDisplayLabel("2 mg/mL", {
        strengthCandidates: ["2 mg/mL"],
      })
    ).toBe(true);
  });

  it("unavailable label is incomplete", () => {
    expect(isIncompleteMedicationOrderDisplayLabel("Medication (label unavailable)")).toBe(
      true
    );
  });

  it("true unidentified medication uses fallback", () => {
    const id = resolveMedicationOrderIdentity({
      orderLine: { catalogItemType: "MEDICATION" },
    });
    expect(id.displayLabelEn).toBe("Medication (label unavailable)");
    expect(id.source).toBe("fallback");
  });

  it("MAR-style strength-only snapshot does not become final label without name", () => {
    const id = resolveMedicationOrderIdentity({
      catalogMedication: hydroCatalog,
      snapshotLabel: "2 mg/mL",
      orderLine: { catalogItemType: "MEDICATION", strength: "2 mg/mL" },
    });
    expect(id.displayLabelEn).toBe("Hydromorphone 2 mg/mL");
  });
});
