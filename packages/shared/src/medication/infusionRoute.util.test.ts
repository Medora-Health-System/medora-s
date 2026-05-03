import { describe, expect, it } from "vitest";
import { isIvpbInfusionRoute, isMedicationInfusionCandidate } from "./infusionRoute.util.js";

describe("isIvpbInfusionRoute", () => {
  it("accepts IVPB and infusion hints", () => {
    expect(isIvpbInfusionRoute("IVPB")).toBe(true);
    expect(isIvpbInfusionRoute("  ivpb  ")).toBe(true);
    expect(isIvpbInfusionRoute("IV piggyback")).toBe(true);
    expect(isIvpbInfusionRoute("continuous infusion")).toBe(true);
  });

  it("rejects IV push / bolus / plain IVP", () => {
    expect(isIvpbInfusionRoute("IVP")).toBe(false);
    expect(isIvpbInfusionRoute("IV push")).toBe(false);
    expect(isIvpbInfusionRoute("IV bolus")).toBe(false);
    expect(isIvpbInfusionRoute("")).toBe(false);
    expect(isIvpbInfusionRoute(null)).toBe(false);
  });
});

describe("isMedicationInfusionCandidate", () => {
  it("classifies common IV fluids without IVPB route", () => {
    expect(
      isMedicationInfusionCandidate({
        route: null,
        medicationLabel: "Normal Saline 1000 mL",
        code: "NS1000",
        genericName: null,
      })
    ).toBe(true);
    expect(
      isMedicationInfusionCandidate({
        route: "IV",
        medicationLabel: "Lactated Ringer 1L",
        code: null,
        genericName: null,
      })
    ).toBe(true);
    expect(
      isMedicationInfusionCandidate({
        route: null,
        medicationLabel: "D5W 500 mL",
        code: null,
        genericName: "dextrose",
      })
    ).toBe(true);
  });

  it("classifies IV antibiotics with IV route", () => {
    expect(
      isMedicationInfusionCandidate({
        route: "IV",
        medicationLabel: "Ceftriaxone 1g",
        code: "CEFTRIAXONE-1G",
        genericName: "ceftriaxone",
      })
    ).toBe(true);
    expect(
      isMedicationInfusionCandidate({
        route: "IV",
        medicationLabel: "Vancomycin",
        code: "VANC",
        genericName: null,
      })
    ).toBe(true);
  });

  it("honors metadata administrationType INFUSION", () => {
    expect(
      isMedicationInfusionCandidate({
        route: "IV",
        medicationLabel: "Unknown drug",
        metadata: { administrationType: "INFUSION" },
      })
    ).toBe(true);
  });

  it("rejects IV push / bolus route and PO", () => {
    expect(
      isMedicationInfusionCandidate({
        route: "IV push",
        medicationLabel: "Ceftriaxone",
        code: null,
        genericName: null,
      })
    ).toBe(false);
    expect(
      isMedicationInfusionCandidate({
        route: "IVP",
        medicationLabel: "Normal saline",
        code: null,
        genericName: null,
      })
    ).toBe(false);
    expect(
      isMedicationInfusionCandidate({
        route: "PO",
        medicationLabel: "Metronidazole",
        code: null,
        genericName: "metronidazole",
      })
    ).toBe(false);
  });

  it("treats large-volume NS / LR with misleading IVP route as infusion (catalog quirk)", () => {
    expect(
      isMedicationInfusionCandidate({
        route: "IVP",
        medicationLabel: "Normal saline 0.9% 1 L",
        code: "NS09-1000",
        genericName: "sodium chloride",
      })
    ).toBe(true);
    expect(
      isMedicationInfusionCandidate({
        route: "IVP",
        medicationLabel: "Sodium chloride 1000 mL",
        code: null,
        genericName: null,
      })
    ).toBe(true);
    expect(
      isMedicationInfusionCandidate({
        route: "IVP",
        medicationLabel: "Lactated Ringer 1 L",
        code: null,
        genericName: null,
      })
    ).toBe(true);
  });

  it("classifies IV antibiotics with injectable route", () => {
    expect(
      isMedicationInfusionCandidate({
        route: "injectable",
        medicationLabel: "Ceftriaxone 1 g",
        code: "CEF-1G",
        genericName: "ceftriaxone",
      })
    ).toBe(true);
    expect(
      isMedicationInfusionCandidate({
        route: "Injectable",
        medicationLabel: "Vancomycin",
        code: "VANC",
        genericName: null,
      })
    ).toBe(true);
  });

  it("rejects typical IV push medications even with IVP route", () => {
    expect(
      isMedicationInfusionCandidate({
        route: "IVP",
        medicationLabel: "Ondansetron 4 mg",
        code: null,
        genericName: null,
      })
    ).toBe(false);
    expect(
      isMedicationInfusionCandidate({
        route: "IVP",
        medicationLabel: "Morphine 2 mg",
        code: null,
        genericName: null,
      })
    ).toBe(false);
    expect(
      isMedicationInfusionCandidate({
        route: "IVP",
        medicationLabel: "Hydromorphone 0.5 mg",
        code: null,
        genericName: null,
      })
    ).toBe(false);
  });

  it("rejects unknown IV drug without infusion route or catalog hints", () => {
    expect(
      isMedicationInfusionCandidate({
        route: "IV",
        medicationLabel: "Vitamin C",
        code: "VITC",
        genericName: null,
      })
    ).toBe(false);
  });
});
