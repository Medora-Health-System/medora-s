import { describe, expect, it } from "vitest";
import {
  buildCanonicalMedicationSearchResults,
  buildCanonicalSearchDesignReport,
  buildProviderSearchArchitectureAudit,
  buildProviderSearchDuplicateInventoryReport,
  buildProviderSearchMaturityProjectionReport,
  buildProviderSearchPerformanceReport,
  runProviderSearchCanonicalizationCertification,
} from "./providerSearchCanonicalization.js";

describe("MEDUI.MEDICATION.PROVIDER_SEARCH_CANONICALIZATION.1 canonical model", () => {
  it("documents current provider search architecture", () => {
    const audit = buildProviderSearchArchitectureAudit();
    expect(audit.currentRuntimeModel).toBe("PRODUCT_CENTRIC");
    expect(audit.targetRuntimeModel).toBe("CANONICAL_FAMILY_AWARE");
  });

  it("documents the provider medication search API endpoint", () => {
    expect(buildProviderSearchArchitectureAudit().apiEndpoint).toBe("GET /catalog/medications/search");
  });

  it("documents API to catalog service flow", () => {
    const audit = buildProviderSearchArchitectureAudit();
    expect(audit.flow.join(" -> ")).toContain("MedicationCatalogService.search");
  });

  it("documents order entry components", () => {
    const audit = buildProviderSearchArchitectureAudit();
    expect(audit.orderEntryComponents.some((path) => path.includes("CreateOrderModal"))).toBe(true);
  });

  it("documents medication picker components", () => {
    const audit = buildProviderSearchArchitectureAudit();
    expect(audit.medicationPickerComponents.some((path) => path.includes("SharedCatalogAutocomplete"))).toBe(true);
  });

  it("does not perform runtime mutation during architecture audit", () => {
    expect(buildProviderSearchArchitectureAudit().mutationPerformed).toBe(false);
  });

  it("builds canonical medication search results", () => {
    const results = buildCanonicalMedicationSearchResults();
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((row) => row.variants.length > 0)).toBe(true);
  });

  it("returns one canonical row per family", () => {
    const results = buildCanonicalMedicationSearchResults();
    expect(new Set(results.map((row) => row.familyKey)).size).toBe(results.length);
  });

  it("keeps product variants under the family result", () => {
    const amoxicillin = buildCanonicalMedicationSearchResults().find((row) => row.familyKey.includes("amoxicillin"));
    expect(amoxicillin).toBeDefined();
    expect(amoxicillin!.variants.length).toBeGreaterThan(1);
  });

  it("design report uses family-first/product-variant-second principles", () => {
    const report = buildCanonicalSearchDesignReport();
    expect(report.decision).toBe("DESIGNED");
    expect(report.designPrinciples.join(" ")).toContain("One provider-visible row");
    expect(report.example).toBeTruthy();
  });

  it("duplicate inventory reports current product-row risk", () => {
    const report = buildProviderSearchDuplicateInventoryReport();
    expect(report.productRowsAudited).toBeGreaterThan(report.canonicalFamiliesAudited);
    expect(report.currentProviderSearchDecision).toBe("UNSAFE");
  });

  it("performance report reduces provider-visible row count", () => {
    const report = buildProviderSearchPerformanceReport();
    expect(report.canonicalizedProviderSearchResultCount).toBeLessThan(report.currentProviderSearchResultCount);
    expect(report.duplicateReductionPct).toBeGreaterThan(0);
  });

  it("performance report declares no meaningful slowdown", () => {
    expect(buildProviderSearchPerformanceReport().estimatedLatencyImpact).toBe("NO_MEANINGFUL_SLOWDOWN");
  });

  it("maturity projection moves from 3.8 to 4.0", () => {
    const report = buildProviderSearchMaturityProjectionReport();
    expect(report.currentScore).toBe(3.8);
    expect(report.projectedAfterCanonicalProviderSearch).toBe(4.0);
  });

  it("maturity projection preserves remaining hospital formulary domains", () => {
    const report = buildProviderSearchMaturityProjectionReport();
    expect(report.remainingDomains).toContain("Tranche 3 ED");
    expect(report.remainingDomains).toContain("Vaccine completion");
  });

  it("orchestrator returns the provider search canonicalization ticket", () => {
    const report = runProviderSearchCanonicalizationCertification();
    expect(report.ticket).toBe("MEDUI.MEDICATION.PROVIDER_SEARCH_CANONICALIZATION.1");
  });

  it("orchestrator compatibility confirms no forbidden mutations", () => {
    const report = runProviderSearchCanonicalizationCertification();
    expect(report.compatibility.activationChanged).toBe(false);
    expect(report.compatibility.formularyStatusChanged).toBe(false);
    expect(report.compatibility.billingBehaviorChanged).toBe(false);
    expect(report.compatibility.marBehaviorChanged).toBe(false);
  });
});
