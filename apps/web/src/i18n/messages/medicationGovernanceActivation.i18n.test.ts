import { describe, expect, it } from "vitest";
import en from "./en";
import fr from "./fr";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("medicationGovernanceActivation i18n (19G)", () => {
  it("mirrors keys between en and fr", () => {
    const enKeys = Object.keys(en.medicationGovernanceActivation).sort();
    const frKeys = Object.keys(fr.medicationGovernanceActivation).sort();
    expect(frKeys).toEqual(enKeys);
  });

  it("French page title is French; English title is English", () => {
    expect(en.medicationGovernanceActivation.title).toMatch(/activation/i);
    expect(fr.medicationGovernanceActivation.title).toMatch(/Activation formulier/);
    expect(en.medicationGovernanceActivation.title).not.toMatch(/établissement/);
    expect(fr.medicationGovernanceActivation.refresh).toBe("Actualiser");
  });

  it("mirrors governance blocker keys between en and fr (19G.2B)", () => {
    const enBlockers = Object.keys(en.medicationGovernanceActivation.blocker).sort();
    const frBlockers = Object.keys(fr.medicationGovernanceActivation.blocker).sort();
    expect(frBlockers).toEqual(enBlockers);
    expect(fr.medicationGovernanceActivation.governanceReviewRequired).toMatch(
      /Revue de gouvernance/
    );
    expect(en.medicationGovernanceActivation.governanceReviewRequired).toMatch(
      /Governance review required/
    );
  });

  it("activation page uses i18n keys (no hardcoded French chrome)", () => {
    const pageSource = readFileSync(
      join(process.cwd(), "app/app/admin/medication-governance/activation/page.tsx"),
      "utf8"
    );
    expect(pageSource).toMatch(/medicationGovernanceActivation\./);
    expect(pageSource).not.toMatch(/Chargement\.\.\./);
    expect(pageSource).not.toMatch(/Actualiser/);
  });
});
