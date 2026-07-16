import { describe, expect, it } from "vitest";
import {
  dermatologicEmergencyRedFlagWarnings,
  isDermatologicLifeThreateningFlagged,
  resolveDermatologicEmergencyRedFlags,
} from "./dermatologicEmergencyRedFlagEngine";

describe("dermatologicEmergencyRedFlagEngine", () => {
  it("detects Stevens-Johnson syndrome / toxic epidermal necrolysis concern", () => {
    const result = resolveDermatologicEmergencyRedFlags({
      displayName: "Stevens-Johnson syndrome with epidermal detachment and positive Nikolsky sign",
    });
    expect(result.categories).toContain("sjs_ten");
    expect(result.prompts.some((p) => /does not autonomously diagnose/.test(p))).toBe(true);
  });

  it("detects DRESS syndrome concern", () => {
    const result = resolveDermatologicEmergencyRedFlags({
      displayName: "DRESS syndrome with facial edema and eosinophilia",
    });
    expect(result.categories).toContain("dress");
  });

  it("detects acute generalized exanthematous pustulosis (AGEP) concern", () => {
    const result = resolveDermatologicEmergencyRedFlags({ displayName: "Acute generalized exanthematous pustulosis" });
    expect(result.categories).toContain("agep");
  });

  it("detects meningococcal-type rash concern", () => {
    const result = resolveDermatologicEmergencyRedFlags({
      displayName: "Nonblanching rash with fever and neck stiffness",
    });
    expect(result.categories).toContain("meningococcal_type_rash");
    expect(isDermatologicLifeThreateningFlagged({ displayName: "Nonblanching rash with fever and neck stiffness" })).toBe(
      true
    );
  });

  it("detects purpura fulminans concern", () => {
    const result = resolveDermatologicEmergencyRedFlags({ displayName: "Purpura fulminans" });
    expect(result.categories).toContain("purpura_fulminans");
  });

  it("detects petechiae/purpura with systemic symptoms", () => {
    const result = resolveDermatologicEmergencyRedFlags({ displayName: "Petechiae with fever and thrombocytopenia" });
    expect(result.categories).toContain("petechiae_purpura_systemic");
  });

  it("detects disseminated infection concern", () => {
    const result = resolveDermatologicEmergencyRedFlags({ displayName: "Disseminated gonococcal infection" });
    expect(result.categories).toContain("disseminated_infection");
  });

  it("detects severe erythroderma concern", () => {
    const result = resolveDermatologicEmergencyRedFlags({ displayName: "Erythroderma involving the whole body" });
    expect(result.categories).toContain("severe_erythroderma");
  });

  it("detects necrotizing infection overlap concern", () => {
    const result = resolveDermatologicEmergencyRedFlags({
      displayName: "Skin necrosis with pain out of proportion to exam",
    });
    expect(result.categories).toContain("necrotizing_overlap");
  });

  it("detects eczema herpeticum concern", () => {
    const result = resolveDermatologicEmergencyRedFlags({
      displayName: "Eczema herpeticum with punched-out erosions on atopic dermatitis",
    });
    expect(result.categories).toContain("eczema_herpeticum");
  });

  it("detects disseminated herpes zoster/HSV concern", () => {
    const result = resolveDermatologicEmergencyRedFlags({ displayName: "Disseminated herpes zoster in an immunocompromised patient" });
    expect(result.categories).toContain("disseminated_hsv_zoster");
  });

  it("detects severe mucosal/ocular involvement concern", () => {
    const result = resolveDermatologicEmergencyRedFlags({ displayName: "Severe mucosal involvement with conjunctival involvement" });
    expect(result.categories).toContain("severe_mucosal_ocular");
  });

  it("detects airway/angioedema overlap concern", () => {
    const result = resolveDermatologicEmergencyRedFlags({ displayName: "Angioedema with tongue swelling and stridor" });
    expect(result.categories).toContain("airway_angioedema_overlap");
  });

  it("detects neonatal herpes concern", () => {
    const result = resolveDermatologicEmergencyRedFlags({
      displayName: "Neonate with vesicular rash, fever, and lethargy",
    });
    expect(result.categories).toContain("neonatal_herpes_concern");
  });

  it("detects generalized pustular psoriasis concern", () => {
    const result = resolveDermatologicEmergencyRedFlags({ displayName: "Generalized pustular psoriasis, von Zumbusch type" });
    expect(result.categories).toContain("generalized_pustular_psoriasis");
  });

  it("returns no categories for a benign, uncomplicated presentation", () => {
    const result = resolveDermatologicEmergencyRedFlags({ displayName: "Mild localized contact dermatitis" });
    expect(result.categories).toEqual([]);
    expect(result.prompts).toEqual([]);
    expect(isDermatologicLifeThreateningFlagged({ displayName: "Mild localized contact dermatitis" })).toBe(false);
  });

  it("never suggests an autonomous diagnosis, medication order, biopsy, admission, transfer, or consult in any prompt", () => {
    const warnings = dermatologicEmergencyRedFlagWarnings({ displayName: "Stevens-Johnson syndrome, DRESS syndrome, purpura fulminans" });
    expect(warnings.length).toBeGreaterThan(0);
    for (const warning of warnings) {
      expect(warning).toMatch(
        /does not autonomously diagnose, order medications, perform a biopsy, admit, transfer, or request a consult/
      );
    }
  });
});
