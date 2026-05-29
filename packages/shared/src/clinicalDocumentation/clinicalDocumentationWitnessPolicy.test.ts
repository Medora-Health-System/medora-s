import { describe, expect, it } from "vitest";
import {
  DEFAULT_WITNESS_REQUIRED_CARD_IDS,
  parseFacilityClinicalDocumentationWitnessPolicy,
  resolveRequiresWitnessSignature,
} from "./clinicalDocumentationWitnessPolicy.js";

describe("clinicalDocumentationWitnessPolicy", () => {
  it("defaults witness for blood product verification and restraint initiation (EDOC.6/7)", () => {
    expect(resolveRequiresWitnessSignature("blood_product_verification")).toBe(true);
    expect(resolveRequiresWitnessSignature("safety_restraint_initial")).toBe(true);
    expect(resolveRequiresWitnessSignature("safety_restraint_reassessment")).toBe(false);
    expect(resolveRequiresWitnessSignature("obs_po_challenge")).toBe(false);
  });

  it("respects facility additional and disabled card ids", () => {
    const policy = parseFacilityClinicalDocumentationWitnessPolicy({
      additionalCardIds: ["obs_po_challenge"],
      disabledCardIds: ["blood_product_verification"],
    });
    expect(resolveRequiresWitnessSignature("obs_po_challenge", policy)).toBe(true);
    expect(resolveRequiresWitnessSignature("blood_product_verification", policy)).toBe(false);
  });

  it("lists expected default high-risk cards", () => {
    expect(DEFAULT_WITNESS_REQUIRED_CARD_IDS).toContain("blood_product_verification");
    expect(DEFAULT_WITNESS_REQUIRED_CARD_IDS).toContain("safety_belongings_checklist");
    expect(DEFAULT_WITNESS_REQUIRED_CARD_IDS).toContain("proc_sedation_monitoring");
  });
});
