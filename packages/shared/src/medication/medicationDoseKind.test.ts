import { describe, expect, it } from "vitest";
import {
  MEDICATION_DOSE_KINDS,
  isMedicationDoseKind,
  parseMedicationDoseKind,
} from "./medicationDoseKind.js";

describe("medicationDoseKind (M1.8B.7F.1)", () => {
  it("exposes stable allowed values", () => {
    expect(MEDICATION_DOSE_KINDS).toEqual([
      "FIXED_ADMINISTRATION",
      "IVPB_SESSION",
      "PRN_EVENT",
    ]);
  });

  it("does not allow CONTINUOUS_SESSION", () => {
    expect(isMedicationDoseKind("CONTINUOUS_SESSION")).toBe(false);
    expect(parseMedicationDoseKind("CONTINUOUS_SESSION")).toBeNull();
  });

  it("parses known kinds case-insensitively", () => {
    expect(parseMedicationDoseKind("ivpb_session")).toBe("IVPB_SESSION");
    expect(parseMedicationDoseKind("PRN_EVENT")).toBe("PRN_EVENT");
  });
});
