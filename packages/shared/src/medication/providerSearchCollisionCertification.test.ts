import { describe, expect, it } from "vitest";
import {
  buildProviderSearchDuplicateInventoryReport,
  certifyProviderSearchCollisions,
} from "./providerSearchCanonicalization.js";

describe("ProviderSearchCollisionCertification", () => {
  it("certifies canonical search result set as safe", () => {
    const cert = certifyProviderSearchCollisions();
    expect(cert.decision).toBe("SAFE");
    expect(cert.blockers).toEqual([]);
  });

  it("retains current product search decision as unsafe evidence", () => {
    const cert = certifyProviderSearchCollisions();
    expect(cert.currentProductSearchDecision).toBe("UNSAFE");
  });

  it("reports canonical result count", () => {
    expect(certifyProviderSearchCollisions().canonicalSearchResultCount).toBeGreaterThan(0);
  });

  it("eliminates duplicate family rows in canonical result", () => {
    expect(certifyProviderSearchCollisions().duplicateFamilyRows).toBe(0);
  });

  it("reports exact duplicate search row inventory", () => {
    const cert = certifyProviderSearchCollisions();
    expect(cert.exactDuplicateSearchRows).toBeGreaterThanOrEqual(0);
  });

  it("reports near-identical search row inventory", () => {
    const cert = certifyProviderSearchCollisions();
    expect(cert.nearIdenticalSearchRows).toBeGreaterThan(0);
  });

  it("reports brand/generic collision inventory", () => {
    const cert = certifyProviderSearchCollisions();
    expect(cert.brandGenericCollisions).toBeGreaterThan(0);
  });

  it("reports strength-family collision inventory", () => {
    const cert = certifyProviderSearchCollisions();
    expect(cert.strengthFamilyCollisions).toBeGreaterThan(0);
  });

  it("reports route-family collision inventory", () => {
    const cert = certifyProviderSearchCollisions();
    expect(cert.routeFamilyCollisions).toBeGreaterThan(0);
  });

  it("reports formulation-family collision inventory", () => {
    const cert = certifyProviderSearchCollisions();
    expect(cert.formulationFamilyCollisions).toBeGreaterThan(0);
  });

  it("duplicate inventory includes amoxicillin duplicate example", () => {
    const report = buildProviderSearchDuplicateInventoryReport();
    expect(report.examples.some((example) => example.includes("AMOXICILLIN_500"))).toBe(true);
  });

  it("duplicate inventory includes doxycycline duplicate example", () => {
    const report = buildProviderSearchDuplicateInventoryReport();
    expect(report.examples.some((example) => example.includes("DOXYCYCLINE_100_MG"))).toBe(true);
  });
});
