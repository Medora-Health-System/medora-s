/**
 * MEDUI.CLINICAL.INJURY_INTELLIGENCE_PHASE_4 — official routing smoke tests
 * (full catalog parity is certified by apps/api prisma/icd certifiers).
 */
import { describe, expect, it } from "vitest";
import { resolveClinicalConditionFamily } from "./providerDischargeConditionFamilyResolver";

describe("crush/amputation/foreign-body official routing", () => {
  it("routes crush hand/finger ahead of wound/laceration", () => {
    const r = resolveClinicalConditionFamily({
      code: "S67.21XA",
      displayName: "Crushing injury of right hand, initial encounter",
    });
    expect(r.familyId).toBe("trauma_crush_hand_finger");
  });

  it("routes prolonged compression / traumatic ischemia to crush prolonged family", () => {
    const r = resolveClinicalConditionFamily({
      code: "T79.6XXA",
      displayName: "Traumatic ischemia of muscle, initial encounter",
    });
    expect(r.familyId).toBe("trauma_crush_prolonged_compression");
  });

  it("routes finger amputation ahead of wound/laceration", () => {
    const r = resolveClinicalConditionFamily({
      code: "S68.110A",
      displayName: "Complete traumatic metacarpophalangeal amputation of right index finger, initial encounter",
    });
    expect(r.familyId).toBe("trauma_amputation_finger_thumb");
  });

  it("routes ocular foreign body ahead of wound/laceration", () => {
    const r = resolveClinicalConditionFamily({
      code: "T15.00XA",
      displayName: "Foreign body in cornea, unspecified eye, initial encounter",
    });
    expect(r.familyId).toBe("trauma_foreign_body_eye");
  });

  it("routes open-wound-with-FB hand code ahead of generic laceration", () => {
    const r = resolveClinicalConditionFamily({
      code: "S61.421A",
      displayName: "Laceration with foreign body of right hand, initial encounter",
    });
    expect(r.familyId).toBe("trauma_foreign_body_hand_finger");
  });

  it("routes nasal foreign body to ear/nose (not aspirated fallback alone)", () => {
    const r = resolveClinicalConditionFamily({
      code: "T17.0XXA",
      displayName: "Foreign body in nasal sinus, initial encounter",
    });
    expect(r.familyId).toBe("trauma_foreign_body_ear_nose");
  });
});
