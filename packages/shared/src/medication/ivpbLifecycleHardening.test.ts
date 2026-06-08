import { describe, expect, it } from "vitest";
import { isMedicationInfusionCandidate } from "./infusionRoute.util.js";
import { isStructuredMedicationOrderRouteIvpb } from "./medicationOrderRoute.js";
import { resolveScheduleClassification } from "./medicationScheduleClassification.js";

/** M1.8B.7B — IVPB route must always require infusion START/STOP lifecycle. */
const IVPB_MEDICATION_CASES = [
  {
    id: "heparin",
    medicationLabel: "Heparin 5000 units",
    code: "HEPARIN",
    genericName: "Heparin",
    catalogAdministrationType: "PUSH",
  },
  {
    id: "vancomycin",
    medicationLabel: "Vancomycin 1 g",
    code: "VANCOMYCIN",
    genericName: "Vancomycin",
    catalogAdministrationType: "PUSH",
  },
  {
    id: "ceftriaxone",
    medicationLabel: "Ceftriaxone 1 g",
    code: "CEFTRIAXONE",
    genericName: "Ceftriaxone",
    catalogAdministrationType: "PUSH",
  },
  {
    id: "cefepime",
    medicationLabel: "Cefepime 2 g",
    code: "CEFEPIME",
    genericName: "Cefepime",
    catalogAdministrationType: "PUSH",
  },
  {
    id: "potassium",
    medicationLabel: "Potassium chloride 20 mEq",
    code: "POTASSIUM_CHLORIDE",
    genericName: "Potassium Chloride",
    catalogAdministrationType: "PUSH",
  },
  {
    id: "magnesium",
    medicationLabel: "Magnesium sulfate 2 g",
    code: "MAGNESIUM_SULFATE",
    genericName: "Magnesium Sulfate",
    catalogAdministrationType: "PUSH",
  },
] as const;

describe("M1.8B.7B IVPB lifecycle hardening", () => {
  it("isStructuredMedicationOrderRouteIvpb matches canonical enum only", () => {
    expect(isStructuredMedicationOrderRouteIvpb("IVPB")).toBe(true);
    expect(isStructuredMedicationOrderRouteIvpb("ivpb")).toBe(true);
    expect(isStructuredMedicationOrderRouteIvpb("IVP")).toBe(false);
    expect(isStructuredMedicationOrderRouteIvpb("IV piggyback")).toBe(false);
    expect(isStructuredMedicationOrderRouteIvpb(null)).toBe(false);
  });

  describe.each(IVPB_MEDICATION_CASES)("$id IVPB", (med) => {
    it("requires infusion lifecycle (isMedicationInfusionCandidate)", () => {
      expect(
        isMedicationInfusionCandidate({
          route: "IVPB",
          medicationLabel: med.medicationLabel,
          code: med.code,
          genericName: med.genericName,
          catalogAdministrationType: med.catalogAdministrationType,
        })
      ).toBe(true);
    });

    it("resolves scheduleClassification to INFUSION_LIFECYCLE", () => {
      expect(
        resolveScheduleClassification({
          frequencyCode: "BID",
          orderRoute: "IVPB",
          catalog: {
            catalogCode: med.code,
            genericName: med.genericName,
            administrationType: med.catalogAdministrationType,
          },
        })
      ).toBe("INFUSION_LIFECYCLE");
    });
  });

  describe("regression — non-IVPB routes unchanged", () => {
    it("heparin IVP is not infusion lifecycle via route alone", () => {
      expect(
        isMedicationInfusionCandidate({
          route: "IVP",
          medicationLabel: "Heparin",
          code: "HEPARIN",
          genericName: "Heparin",
          catalogAdministrationType: "PUSH",
        })
      ).toBe(false);
    });

    it("insulin SQ is not infusion lifecycle", () => {
      expect(
        isMedicationInfusionCandidate({
          route: "SQ",
          medicationLabel: "Regular Insulin",
          code: "REGULAR_INSULIN",
          genericName: "Regular Insulin",
          catalogAdministrationType: "SQ",
        })
      ).toBe(false);
    });

    it("blood product INFUSION catalog remains infusion lifecycle without IVPB route", () => {
      expect(
        isMedicationInfusionCandidate({
          route: "IVP",
          medicationLabel: "PRBC",
          code: "PRBC_TRANSFUSION",
          genericName: "Packed Red Blood Cells",
          catalogAdministrationType: "INFUSION",
          metadata: { therapeuticClass: "BLOOD_PRODUCT" },
        })
      ).toBe(true);
    });

    it("NOW frequency PO medication stays DIRECT_MAR classification", () => {
      expect(
        resolveScheduleClassification({
          frequencyCode: "NOW",
          orderRoute: "PO",
        })
      ).toBe("DIRECT_MAR");
    });

    it("NOW + IVPB overrides to INFUSION_LIFECYCLE", () => {
      expect(
        resolveScheduleClassification({
          frequencyCode: "NOW",
          orderRoute: "IVPB",
        })
      ).toBe("INFUSION_LIFECYCLE");
    });
  });
});
