import { describe, expect, it } from "vitest";
import {
  ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_ELIGIBLE,
  ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_MANIFEST,
  ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_STATS,
} from "./enterpriseFormularyPilotTrancheAManifest.js";
import {
  assertEnterpriseFormularyPilotTrancheAReady,
  computeEnterpriseFormularyPilotDashboard,
  validateEnterprisePilotActivationCandidate,
  validateTrancheAManifestStructure,
} from "./enterpriseFormularyPilotValidation.js";
import type { EnterprisePilotChainSnapshot } from "./enterpriseFormularyPilotTypes.js";

describe("enterprise formulary pilot M1.6F Tranche A", () => {
  it("manifest has 10–15 eligible Wave 1 chronic oral meds", () => {
    expect(ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_STATS.trancheTotal).toBeGreaterThanOrEqual(10);
    expect(ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_STATS.trancheTotal).toBeLessThanOrEqual(15);
    expect(ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_STATS.pilotEligible).toBe(
      ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_STATS.trancheTotal
    );
    expect(validateTrancheAManifestStructure()).toEqual([]);
    expect(() => assertEnterpriseFormularyPilotTrancheAReady()).not.toThrow();
  });

  it("includes preferred chronic staples", () => {
    const codes = new Set(ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_MANIFEST.map((e) => e.catalogCode));
    for (const code of [
      "AMLODIPINE_5_MG_COMPRIME_ORAL",
      "LOSARTAN_50",
      "LISINOPRIL_10",
      "METFORMIN_500",
      "OMEPRAZOLE_20",
      "SIMVASTATIN_20_MG_COMPRIME_ORAL",
      "ATORVASTATIN_20_MG_COMPRIME_ORAL",
    ]) {
      expect(codes.has(code)).toBe(true);
    }
  });

  it("validates complete chain as activation-ready", () => {
    const entry = ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_ELIGIBLE[0]!;
    const chain: EnterprisePilotChainSnapshot = {
      product: {
        productId: "p1",
        productCode: entry.catalogCode,
        legacyCatalogMedicationId: "cat-1",
        isActive: false,
        governanceStatus: "REVIEW_REQUIRED",
        governanceNotes: "ENTERPRISE_M16B_WAVE1_FORMULARY",
        baselineAvailable: false,
      },
      concept: { isActive: false },
      package: { id: "pkg1", isActive: false, ndc11: "00001000101" },
      catalog: {
        catalogId: "cat-1",
        catalogCode: entry.catalogCode,
        genericName: entry.genericName,
        billingCodeDefault: "J3490",
        ndc11: "00001000101",
      },
      safetyProfile: {
        isControlled: false,
        isHighAlert: false,
        lasaGroupId: null,
        requiresWitness: false,
      },
      billingProfileHcpcs: "J3490",
      billingRequiresManualReview: true,
      aliasCount: 2,
    };
    const issues = validateEnterprisePilotActivationCandidate(entry, chain);
    expect(issues.filter((i) => i.severity === "blocking")).toEqual([]);
  });

  it("blocks high-alert safety profile even if manifest eligible", () => {
    const entry = ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_ELIGIBLE[0]!;
    const chain: EnterprisePilotChainSnapshot = {
      product: {
        productId: "p1",
        productCode: entry.catalogCode,
        legacyCatalogMedicationId: "cat-1",
        isActive: false,
        governanceStatus: "REVIEW_REQUIRED",
        governanceNotes: "ENTERPRISE_M16B_WAVE1_FORMULARY",
        baselineAvailable: false,
      },
      concept: { isActive: false },
      package: { id: "pkg1", isActive: false, ndc11: "00001000101" },
      catalog: {
        catalogId: "cat-1",
        catalogCode: entry.catalogCode,
        genericName: entry.genericName,
        billingCodeDefault: "J3490",
        ndc11: "00001000101",
      },
      safetyProfile: {
        isControlled: false,
        isHighAlert: true,
        lasaGroupId: null,
        requiresWitness: false,
      },
      billingProfileHcpcs: "J3490",
      aliasCount: 1,
    };
    const issues = validateEnterprisePilotActivationCandidate(entry, chain);
    expect(issues.some((i) => i.kind === "HIGH_ALERT_SAFETY")).toBe(true);
  });

  it("dashboard reports pending vs activated", () => {
    const entry = ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_ELIGIBLE[0]!;
    const chain: EnterprisePilotChainSnapshot = {
      product: {
        productId: "p1",
        productCode: entry.catalogCode,
        legacyCatalogMedicationId: "cat-1",
        isActive: false,
        governanceStatus: "REVIEW_REQUIRED",
        governanceNotes: "ENTERPRISE_M16B_WAVE1_FORMULARY",
        baselineAvailable: false,
      },
      concept: { isActive: false },
      package: { id: "pkg1", isActive: false, ndc11: "00001000101" },
      catalog: {
        catalogId: "cat-1",
        catalogCode: entry.catalogCode,
        genericName: entry.genericName,
        billingCodeDefault: "J3490",
        ndc11: "00001000101",
      },
      safetyProfile: {
        isControlled: false,
        isHighAlert: false,
        lasaGroupId: null,
        requiresWitness: false,
      },
      billingProfileHcpcs: "J3490",
      aliasCount: 1,
    };
    const dashboard = computeEnterpriseFormularyPilotDashboard({
      trancheEntries: ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_MANIFEST,
      chainByCatalogCode: Object.fromEntries(
        ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_ELIGIBLE.map((e) => [
          e.catalogCode,
          e.catalogCode === entry.catalogCode ? chain : { ...chain, product: { ...chain.product!, productCode: e.catalogCode, governanceNotes: "ENTERPRISE_M16B_WAVE1_FORMULARY" } },
        ])
      ),
    });
    expect(dashboard.pilotEligible).toBe(12);
    expect(dashboard.pendingReviewCount).toBeGreaterThan(0);
    expect(dashboard.activationReadinessPct).toBe(100);
  });
});
