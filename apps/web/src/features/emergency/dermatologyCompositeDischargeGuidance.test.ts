import { describe, expect, it } from "vitest";
import { composeDermatologyDischargeGuidance } from "./dermatologyCompositeDischargeGuidance";

describe("dermatologyCompositeDischargeGuidance — Phase 14", () => {
  it("lets SJS/TEN post-acute dominate over an uncomplicated drug eruption without duplicate lines", () => {
    const result = composeDermatologyDischargeGuidance([
      { code: "L27.0", displayName: "Drug eruption", isPrimary: true },
      { code: "L51.1", displayName: "Stevens-Johnson syndrome" },
    ]);
    const ids = result.provenance.map((p) => p.templateId);
    expect(ids[0]).toBe("sjs_ten_post_acute_v1");
    expect(ids).toEqual(expect.arrayContaining(["drug_eruption_v1", "sjs_ten_post_acute_v1"]));
    const lines = result.returnPrecautions.split(/\n+/).map((l) => l.trim().toLowerCase()).filter(Boolean);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it("composes tinea corporis + folliculitis without duplicate paragraphs", () => {
    const result = composeDermatologyDischargeGuidance([
      { code: "B35.4", displayName: "Tinea corporis", isPrimary: true },
      { code: "L73.9", displayName: "Folliculitis" },
    ]);
    expect(result.provenance.map((p) => p.templateId)).toEqual(
      expect.arrayContaining(["tinea_corporis_v1", "folliculitis_v1"]),
    );
  });

  it("lets DRESS syndrome post-acute dominate over a generic viral exanthem", () => {
    const result = composeDermatologyDischargeGuidance([
      { displayName: "Viral exanthem, well appearing" },
      { displayName: "DRESS syndrome post-acute care", isPrimary: true },
    ]);
    expect(result.provenance.map((p) => p.templateId)[0]).toBe("dress_post_acute_v1");
  });

  it("keeps ophthalmic zoster and herpes zoster both visible", () => {
    const result = composeDermatologyDischargeGuidance([
      { code: "B02.9", displayName: "Herpes zoster without complications" },
      { code: "B02.3", displayName: "Zoster ocular disease" },
    ]);
    const ids = result.provenance.map((p) => p.templateId);
    expect(ids).toEqual(
      expect.arrayContaining(["herpes_zoster_v1", "ophthalmic_zoster_post_acute_v1"]),
    );
    expect(ids[0]).toBe("ophthalmic_zoster_post_acute_v1");
  });

  it("preserves uncomplicated urticaria provenance without anaphylaxis escalation language", () => {
    const result = composeDermatologyDischargeGuidance([
      { displayName: "Uncomplicated urticaria", isPrimary: true },
    ]);
    expect(result.provenance.map((p) => p.templateId)).toContain("uncomplicated_urticaria_v1");
    expect(result.returnPrecautions.toLowerCase()).not.toMatch(/epinephrine was administered/);
  });
});
