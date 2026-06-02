import { describe, expect, it } from "vitest";
import { ENTERPRISE_WAVE1_BILLING_MANIFEST } from "./enterpriseWave1BillingManifest.js";
import { ENTERPRISE_WAVE1_FORMULARY_MANIFEST } from "./enterpriseWave1FormularyManifest.js";
import {
  assertEnterpriseWave1BillingManifest,
  validateWave1MedicationBillingReadiness,
} from "./enterpriseWave1BillingValidation.js";
import {
  assertEnterpriseWave1FormularyManifest,
  validateEnterpriseWave1FormularyManifest,
} from "./enterpriseWave1FormularyValidation.js";
import { validateWave1SearchPair } from "./enterpriseWave1SearchValidation.js";

describe("enterprise wave1 formulary manifest", () => {
  it("has aligned formulary and billing row counts", () => {
    expect(ENTERPRISE_WAVE1_BILLING_MANIFEST.length).toBe(ENTERPRISE_WAVE1_FORMULARY_MANIFEST.length);
    expect(ENTERPRISE_WAVE1_FORMULARY_MANIFEST.length).toBeGreaterThanOrEqual(40);
  });

  it("passes structural validation", () => {
    expect(validateEnterpriseWave1FormularyManifest()).toEqual([]);
    expect(() => assertEnterpriseWave1FormularyManifest()).not.toThrow();
    expect(() => assertEnterpriseWave1BillingManifest()).not.toThrow();
  });

  it("marks billing ready when profile, NDC, and HCPCS present", () => {
    const code = ENTERPRISE_WAVE1_FORMULARY_MANIFEST[0]!.catalogCode;
    const billing = ENTERPRISE_WAVE1_BILLING_MANIFEST[0]!;
    const result = validateWave1MedicationBillingReadiness(code, {
      catalogCode: code,
      billingCodeDefault: billing.hcpcs,
      ndc11: billing.ndc11,
      packageNdc11: billing.ndc11,
      billingProfileHcpcs: billing.hcpcs,
      hasBillingProfile: true,
    });
    expect(result.billingPass).toBe(true);
    expect(result.pass).toBe(true);
  });

  it("fails when MedicationBillingProfile missing", () => {
    const code = ENTERPRISE_WAVE1_FORMULARY_MANIFEST[0]!.catalogCode;
    const result = validateWave1MedicationBillingReadiness(code, {
      catalogCode: code,
      hasBillingProfile: false,
    });
    expect(result.billingPass).toBe(false);
    expect(result.failures.some((f) => f.includes("MedicationBillingProfile"))).toBe(true);
  });
});

describe("enterprise wave1 search pairs", () => {
  it("resolves warfarin/coumadin on manifest aliases", () => {
    const catalogs = ENTERPRISE_WAVE1_FORMULARY_MANIFEST.filter((e) =>
      e.genericName.toLowerCase().includes("warfarin")
    ).map((e) => ({
      catalogCode: e.catalogCode,
      genericName: e.genericName,
      aliases: e.aliases,
    }));
    const pair = validateWave1SearchPair(catalogs, { generic: "warfarin", brand: "coumadin" });
    expect(pair.pass).toBe(true);
  });
});
