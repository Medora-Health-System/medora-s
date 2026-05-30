/**
 * EDOC.TEST.2 — shared registry integrity (validators + EDOC module unions).
 * Runtime save/export proof lives in apps/api clinical-documentation-runtime-coverage.spec.ts.
 */

import { describe, expect, it } from "vitest";
import { CLINICAL_DOCUMENTATION_CARDS } from "./clinicalDocumentationRegistry.js";
import { assertRegistryAvailableCardsHavePayloadValidators } from "./clinicalDocumentationPayloadGovernance.js";
import {
  assertRegistryRuntimeCoverageIntegrity,
  listEdocModuleCardIds,
} from "./clinicalDocumentationRuntimeCoverageHarness.js";

describe("clinicalDocumentationRuntimeCoverageIntegrity (EDOC.TEST.2 shared)", () => {
  it("all AVAILABLE cards have registered payload validators (except basic structured generic)", () => {
    expect(() => assertRegistryAvailableCardsHavePayloadValidators()).not.toThrow();
  });

  it("every AVAILABLE card id is listed in an EDOC module union", () => {
    const available = CLINICAL_DOCUMENTATION_CARDS.filter(
      (c) => c.implementationStatus === "AVAILABLE"
    ).map((c) => c.id);
    expect(available.length).toBe(197);
    expect(() =>
      assertRegistryRuntimeCoverageIntegrity(available, available)
    ).not.toThrow();
    expect(listEdocModuleCardIds().length).toBeGreaterThanOrEqual(197);
  });
});
