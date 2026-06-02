import { describe, expect, it } from "vitest";
import { ENTERPRISE_WAVE2_BILLING_MANIFEST } from "./enterpriseWave2BillingManifest.js";
import { ENTERPRISE_WAVE2_FORMULARY_MANIFEST } from "./enterpriseWave2FormularyManifest.js";
import {
  assertEnterpriseWave2FormularyManifest,
  validateEnterpriseWave2FormularyManifest,
} from "./enterpriseWave2FormularyValidation.js";
import {
  assertEnterpriseWave2BillingManifest,
  validateWave2BillingManifest,
  validateWave2MedicationBillingReadiness,
} from "./enterpriseWave2BillingValidation.js";
import {
  computeWave2SearchReadinessScore,
  validateWave2SearchPair,
} from "./enterpriseWave2SearchValidation.js";

describe("enterprise wave2 formulary M1.6D", () => {
  it("manifest passes structural validation", () => {
    expect(validateEnterpriseWave2FormularyManifest()).toEqual([]);
    expect(() => assertEnterpriseWave2FormularyManifest()).not.toThrow();
    expect(() => assertEnterpriseWave2BillingManifest()).not.toThrow();
    expect(validateWave2BillingManifest()).toEqual([]);
  });

  it("has 75+ medications aligned with billing", () => {
    expect(ENTERPRISE_WAVE2_FORMULARY_MANIFEST.length).toBeGreaterThanOrEqual(75);
    expect(ENTERPRISE_WAVE2_BILLING_MANIFEST.length).toBe(
      ENTERPRISE_WAVE2_FORMULARY_MANIFEST.length
    );
  });

  it("billing readiness passes for all rows when profiles present and inactive", () => {
    for (const entry of ENTERPRISE_WAVE2_FORMULARY_MANIFEST) {
      const billing = ENTERPRISE_WAVE2_BILLING_MANIFEST.find(
        (b) => b.catalogCode === entry.catalogCode
      )!;
      const result = validateWave2MedicationBillingReadiness(entry.catalogCode, {
        catalogCode: entry.catalogCode,
        billingCodeDefault: billing.hcpcs,
        ndc11: billing.ndc11,
        packageNdc11: billing.ndc11,
        billingProfileHcpcs: billing.hcpcs,
        hasBillingProfile: true,
        isActive: false,
        governanceStatus: "REVIEW_REQUIRED",
      });
      expect(result.billingPass).toBe(true);
      expect(result.activationPass).toBe(true);
    }
  });

  it("search pairs resolve on manifest aliases", () => {
    const catalogs = ENTERPRISE_WAVE2_FORMULARY_MANIFEST.map((e) => ({
      catalogCode: e.catalogCode,
      genericName: e.genericName,
      aliases: e.aliases.map((a) => a.toLowerCase()),
      searchText: [e.genericName, ...e.aliases].join(" ").toLowerCase(),
    }));
    const insulin = validateWave2SearchPair(catalogs, {
      generic: "insulin glargine",
      brand: "lantus",
    });
    expect(insulin.pass).toBe(true);
    const score = computeWave2SearchReadinessScore(
      catalogs,
      new Set(ENTERPRISE_WAVE2_FORMULARY_MANIFEST.map((e) => e.catalogCode))
    );
    expect(score).toBeGreaterThanOrEqual(95);
  });
});
