import { describe, expect, it } from "vitest";
import { HOSPITAL_MEDICATION_COVERAGE_GROUPS } from "./hospitalMedicationCoverageManifest.js";
import {
  buildMedicationEngineMaturityReport,
  buildMedicationEngineSourceAudit,
  buildMedicationOrderabilityGovernanceDesign,
  buildMedicationOrderabilityPipelineAudit,
  CATALOG_BUT_NOT_ORDERABLE_ANSWER,
  quantifyMedicationOrderabilityGaps,
  runProviderMedicationCatalogMaturityAudit,
} from "./providerMedicationCatalogMaturityAudit.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import {
  isProviderOrderSearchCandidate,
  medicationHasDocumentedNonOrderableReason,
} from "./medicationOrderabilityGovernance.js";

describe("MEDUI.MEDICATION_CATALOG.MATURITY_AND_ORDERABILITY_AUDIT.1 — maturity", () => {
  it("01 — medication engine source audit runs", () => {
    const audit = buildMedicationEngineSourceAudit();
    expect(audit.length).toBeGreaterThan(10);
    expect(audit.some((r) => r.source.includes("Haiti"))).toBe(true);
    expect(audit.some((r) => r.fileOrModel.includes("order-catalog.controller"))).toBe(true);
  });

  it("02 — maturity report returns all required domains", () => {
    const report = buildMedicationEngineMaturityReport();
    expect(report.length).toBe(16);
    const domains = report.map((r) => r.domain);
    expect(domains).toContain("Provider order search");
    expect(domains).toContain("Controlled substance restrictions");
    expect(domains).toContain("Vaccine administration support");
    expect(report.every((r) => r.maturityScore >= 0 && r.maturityScore <= 5)).toBe(true);
  });

  it("03 — orderability pipeline audit explains catalog-but-not-orderable state", () => {
    const pipeline = buildMedicationOrderabilityPipelineAudit();
    expect(pipeline.length).toBeGreaterThanOrEqual(8);
    expect(CATALOG_BUT_NOT_ORDERABLE_ANSWER).toContain("orderSearchEnabled");
    expect(pipeline.some((s) => s.step.includes("Order search activation"))).toBe(true);
  });

  it("04 — gap quantification returns counts", () => {
    const gaps = quantifyMedicationOrderabilityGaps(buildUnifiedOrderabilityMap());
    const total = gaps.find((g) => g.category === "total_medication_master_rows");
    expect(total?.count).toBeGreaterThan(200);
    expect(gaps.find((g) => g.category === "orderable_rows")?.count).toBeGreaterThan(0);
    expect(gaps.find((g) => g.category === "restricted_rows")?.count).toBeGreaterThan(0);
  });

  it("05 — hospital core medication coverage groups exist", () => {
    const report = runProviderMedicationCatalogMaturityAudit();
    expect(report.hospitalCoverage.length).toBe(HOSPITAL_MEDICATION_COVERAGE_GROUPS.length);
    expect(HOSPITAL_MEDICATION_COVERAGE_GROUPS.length).toBeGreaterThanOrEqual(29);
    expect(report.hospitalCoverage.some((g) => g.groupId === "vaccines")).toBe(true);
    expect(report.hospitalCoverage.some((g) => g.groupId === "reversal_agents")).toBe(true);
  });

  it("06 — high-risk meds are not auto-activated", () => {
    const records = buildUnifiedOrderabilityMap();
    const highRisk = [...records.values()].filter((r) => r.requiresClinicalReview && r.orderabilityStatus === "RESTRICTED_WITH_REASON");
    expect(highRisk.length).toBeGreaterThan(0);
    expect(highRisk.every((r) => !isProviderOrderSearchCandidate(r))).toBe(true);
  });

  it("07 — restricted meds require reason", () => {
    const records = buildUnifiedOrderabilityMap();
    const restricted = [...records.values()].filter((r) => r.orderabilityStatus === "RESTRICTED_WITH_REASON");
    expect(restricted.length).toBeGreaterThan(0);
    expect(restricted.every((r) => Boolean(r.restrictedReason?.trim()))).toBe(true);
  });

  it("08 — not-orderable meds require reason", () => {
    const records = buildUnifiedOrderabilityMap();
    const notOrderable = [...records.values()].filter(
      (r) =>
        r.orderabilityStatus === "CATALOG_ONLY_NOT_ORDERABLE" ||
        r.orderabilityStatus === "MISSING_FROM_ORDER_SEARCH"
    );
    expect(notOrderable.length).toBeGreaterThan(0);
    expect(notOrderable.every((r) => medicationHasDocumentedNonOrderableReason(r))).toBe(true);
  });

  it("09 — needs-review meds are reported", () => {
    const gaps = quantifyMedicationOrderabilityGaps(buildUnifiedOrderabilityMap());
    expect(gaps.find((g) => g.category === "needs_clinical_review")).toBeTruthy();
    expect(gaps.find((g) => g.category === "needs_pharmacist_review")!.count).toBeGreaterThan(0);
  });

  it("10 — governance design includes required fields", () => {
    const design = buildMedicationOrderabilityGovernanceDesign();
    const fields = design.map((d) => d.field);
    expect(fields).toContain("orderabilityStatus");
    expect(fields).toContain("controlledSubstanceFlag");
    expect(fields).toContain("vaccineFlag");
    expect(fields).toContain("facilityFormularyStatus");
  });

  it("11 — maturity audit orchestrator runs", () => {
    const report = runProviderMedicationCatalogMaturityAudit();
    expect(report.ticket).toBe("MEDUI.MEDICATION_CATALOG.MATURITY_AND_ORDERABILITY_AUDIT.1");
    expect(report.summary.totalMedications).toBeGreaterThan(200);
    expect(report.summary.undocumentedGaps).toBe(0);
    expect(report.summary.maturityAverage).toBeGreaterThan(2);
  });

  it("12 — pipeline failure modes describe user-facing search exclusion", () => {
    const pipeline = buildMedicationOrderabilityPipelineAudit();
    const searchStep = pipeline.find((s) => s.step.includes("Provider search"));
    expect(searchStep?.userFacingEffect).toMatch(/find|search|order/i);
  });

  it("13 — catalog-but-not-orderable answer mentions vaccine restriction", () => {
    expect(CATALOG_BUT_NOT_ORDERABLE_ANSWER.toLowerCase()).toContain("vaccine");
  });

  it("14 — no mass activation: enterprise restricted count exceeds pilot tranche", () => {
    const report = runProviderMedicationCatalogMaturityAudit();
    expect(report.summary.restrictedWithReason).toBeGreaterThan(report.summary.orderableReady);
  });
});
