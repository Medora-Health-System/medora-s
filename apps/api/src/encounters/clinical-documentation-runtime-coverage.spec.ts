/**
 * EDOC.TEST.2 — Universal clinical documentation runtime coverage (197 AVAILABLE cards).
 */

import {
  CLINICAL_DOCUMENTATION_CARDS,
  EDOC23B_FOUNDATION_CATALOG_COMPLETION_CARD_IDS,
  EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS,
  EDOC8_HIGH_ALERT_INFUSION_DOCUMENTATION_CARD_IDS,
  EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS,
  EDOC10_PROCEDURAL_SEDATION_DOCUMENTATION_CARD_IDS,
  ensureClinicalDocumentationLegalDisplaySummary,
  summarizeClinicalDocumentationPayload,
  validatePayloadForCard,
  assertRegistryRuntimeCoverageIntegrity,
} from "@medora/shared";
import {
  assertClinicalDocumentationAuditSafety,
  assertClinicalDocumentationRuntimeCoverage,
  clinicalDocumentationPayloadUsesLegalFallback,
  SENSITIVE_RUNTIME_AUDIT_CARD_IDS,
} from "./clinical-documentation-runtime-coverage.harness";
import {
  assertRuntimeCoverageFixtureIntegrity,
  getClinicalDocumentationRuntimeCoverageFixtures,
  RUNTIME_COVERAGE_SUPPLEMENTAL_PAYLOADS,
} from "./clinical-documentation-runtime-coverage.fixtures";
import {
  EDOC23B_FOUNDATION_COMPLETION_FIXTURES,
  EDOC_TEST1_ALL_HIGH_RISK_FIXTURES,
} from "./clinical-documentation-legal-coverage.fixtures";
import { assertClinicalDocumentationLegalCoverage } from "./clinical-documentation-legal-coverage.harness";

const RUNTIME_FIXTURES = getClinicalDocumentationRuntimeCoverageFixtures();

describe("Clinical documentation runtime coverage (EDOC.TEST.2)", () => {
  it("registry integrity — 197 AVAILABLE cards with complete fixtures", () => {
    const available = CLINICAL_DOCUMENTATION_CARDS.filter(
      (c) => c.implementationStatus === "AVAILABLE"
    );
    expect(available.length).toBe(197);
    expect(RUNTIME_FIXTURES.length).toBe(197);
    expect(() => assertRuntimeCoverageFixtureIntegrity()).not.toThrow();
    assertRegistryRuntimeCoverageIntegrity(
      available.map((c) => c.id),
      RUNTIME_FIXTURES.map((f) => f.cardId)
    );
  });

  it("legal + supplemental fixture counts", () => {
    expect(EDOC_TEST1_ALL_HIGH_RISK_FIXTURES.length).toBe(36);
    expect(EDOC23B_FOUNDATION_COMPLETION_FIXTURES.length).toBe(16);
    expect(RUNTIME_COVERAGE_SUPPLEMENTAL_PAYLOADS.length).toBe(145);
  });

  it.each(RUNTIME_FIXTURES.map((f) => [f.cardId, f] as const))(
    "payload validates — %s",
    (_cardId, fixture) => {
      const result = validatePayloadForCard(fixture.cardId, fixture.payload);
      expect(result.ok).toBe(true);
    }
  );

  it.each(RUNTIME_FIXTURES.map((f) => [f.cardId, f] as const))(
    "dedicated EN summary — %s",
    (_cardId, fixture) => {
      const lines = summarizeClinicalDocumentationPayload(fixture.cardId, fixture.payload, "en");
      expect(lines.length).toBeGreaterThan(0);
    }
  );

  it.each(RUNTIME_FIXTURES.map((f) => [f.cardId, f] as const))(
    "legal display summary — %s",
    (_cardId, fixture) => {
      const en = ensureClinicalDocumentationLegalDisplaySummary(fixture.cardId, fixture.payload, "en");
      const fr = ensureClinicalDocumentationLegalDisplaySummary(fixture.cardId, fixture.payload, "fr");
      expect(en.length).toBeGreaterThan(0);
      expect(fr.length).toBeGreaterThan(0);
    }
  );

  it("fallback count on valid payloads is zero", () => {
    const fallbackCards = RUNTIME_FIXTURES.filter((f) =>
      clinicalDocumentationPayloadUsesLegalFallback(f.cardId, f.payload, "en")
    );
    expect(fallbackCards.map((f) => f.cardId)).toEqual([]);
  });

  it.each(RUNTIME_FIXTURES.map((f) => [f.cardId, f] as const))(
    "runtime harness save/export — %s",
    async (_cardId, fixture) => {
      await assertClinicalDocumentationRuntimeCoverage(fixture);
    },
    120_000
  );

  it.each(
    RUNTIME_FIXTURES.filter((f) => SENSITIVE_RUNTIME_AUDIT_CARD_IDS.has(f.cardId)).map(
      (f) => [f.cardId, f] as const
    )
  )("audit PHI safety — %s", async (_cardId, fixture) => {
    await assertClinicalDocumentationAuditSafety(fixture.cardId, fixture.payload, fixture.category);
  });

  it("coverage dashboard — 197 GREEN", () => {
    const rows = RUNTIME_FIXTURES.map((f) => {
      const validation = validatePayloadForCard(f.cardId, f.payload);
      const summary = summarizeClinicalDocumentationPayload(f.cardId, f.payload, "en");
      const legal = ensureClinicalDocumentationLegalDisplaySummary(f.cardId, f.payload, "en");
      const status =
        validation.ok && summary.length > 0 && legal.length > 0 ? "GREEN" : "RED";
      return { cardId: f.cardId, status };
    });
    expect(rows.every((r) => r.status === "GREEN")).toBe(true);
    expect(rows.length).toBe(197);
  });

  describe("regression — EDOC.LEGAL.1, TEST.1, 23B", () => {
    it("EDOC.TEST.1 high-risk sample still passes legal harness", async () => {
      const sample = EDOC_TEST1_ALL_HIGH_RISK_FIXTURES[0]!;
      await assertClinicalDocumentationLegalCoverage({
        ...sample,
        entryId: "edoc-test2-regression-test1",
      });
    });

    it("EDOC.23B foundation sample still passes legal harness", async () => {
      const sample = EDOC23B_FOUNDATION_COMPLETION_FIXTURES[0]!;
      await assertClinicalDocumentationLegalCoverage({
        ...sample,
        entryId: "edoc-test2-regression-23b",
      });
    });

    it("module card id sets unchanged", () => {
      expect(EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS.length).toBeGreaterThan(0);
      expect(EDOC8_HIGH_ALERT_INFUSION_DOCUMENTATION_CARD_IDS.length).toBeGreaterThan(0);
      expect(EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS.length).toBeGreaterThan(0);
      expect(EDOC10_PROCEDURAL_SEDATION_DOCUMENTATION_CARD_IDS.length).toBeGreaterThan(0);
      expect(EDOC23B_FOUNDATION_CATALOG_COMPLETION_CARD_IDS.length).toBe(16);
    });
  });
});
