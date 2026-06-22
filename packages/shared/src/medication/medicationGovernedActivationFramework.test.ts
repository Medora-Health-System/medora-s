import { describe, expect, it } from "vitest";
import { ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_CATALOG_CODES } from "./enterpriseFormularyPilotTrancheAManifest.js";
import { HOSPITAL_ACTIVATION_COVERAGE_GROUPS } from "./hospitalActivationCoverageManifest.js";
import {
  buildActivationGovernanceRecord,
  type MedicationActivationGovernanceStatus,
} from "./medicationActivationGovernance.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";
import {
  buildHospitalCoverageGapReport,
  buildMedicationActivationInventoryReport,
  certifyMedicationActivation,
  medicationsFailingActivationCertification,
  medicationsPassingActivationCertification,
  runGovernedActivationFramework,
} from "./medicationActivationCertification.js";
import { buildMedicationExpansionRoadmap } from "./medicationActivationExpansionRoadmap.js";
import {
  certifyMedicationI18nSafety,
  TDAP_VACCINE_ADMIN_I18N_KEYS,
} from "./medicationActivationI18nCertification.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import { buildOrderabilityFromHaitiRow } from "./medicationOrderabilityGovernance.js";
import { HAITI_MEDICATION_FORMULARY_CATALOG } from "./haitiMedicationFormularyCatalog.js";
import { certifyTdapGovernance } from "./tdapGovernanceCertification.js";
import { TDAP_CATALOG_CODE } from "./tdapVaccineAdministration.js";
import { VACCINE_MANUFACTURER_CATALOG } from "./vaccineManufacturerCatalog.js";

function governanceRecords() {
  return [...buildUnifiedOrderabilityMap().values()].map(buildActivationGovernanceRecord);
}

describe("MEDUI.MEDICATION.GOVERNED_ACTIVATION_FRAMEWORK.1", () => {
  it("01 — governed activation framework orchestrator runs", () => {
    const report = runGovernedActivationFramework();
    expect(report.ticket).toBe("MEDUI.MEDICATION.GOVERNED_ACTIVATION_FRAMEWORK.1");
    expect(report.inventoryReport.totalRows).toBeGreaterThan(200);
  });

  it("02 — activation inventory includes required fields per medication", () => {
    const records = governanceRecords();
    const inventory = buildMedicationActivationInventoryReport(records);
    const row = inventory.rows.find((r) => r.catalogCode === "ACETAMINOPHEN_500");
    expect(row).toBeTruthy();
    expect(row?.displayNameEn).toBeTruthy();
    expect(row?.displayNameFr).toBeTruthy();
    expect(row?.strength).toBeTruthy();
    expect(row?.doseForm).toBeTruthy();
    expect(row?.route).toBeTruthy();
    expect(row?.careSettingEligibility.length).toBeGreaterThan(0);
  });

  it("03 — universal governance status values are used", () => {
    const inventory = runGovernedActivationFramework().inventoryReport;
    const statuses = Object.keys(inventory.byStatus) as MedicationActivationGovernanceStatus[];
    expect(statuses).toContain("ORDERABLE");
    expect(statuses).toContain("RESTRICTED");
    expect(statuses).toContain("NEEDS_PHARMACY_REVIEW");
    expect(statuses).toContain("NOT_ORDERABLE");
  });

  it("04 — activation governance record includes all required fields", () => {
    const record = governanceRecords()[0]!;
    expect(record).toHaveProperty("status");
    expect(record).toHaveProperty("restrictedReason");
    expect(record).toHaveProperty("reviewReason");
    expect(record).toHaveProperty("highRiskFlag");
    expect(record).toHaveProperty("controlledSubstanceFlag");
    expect(record).toHaveProperty("vaccineFlag");
    expect(record).toHaveProperty("orderSearchReady");
    expect(record).toHaveProperty("allowedCareSettings");
  });

  it("05 — certifyMedicationActivation returns PASS or FAIL with blockers", () => {
    const acetaminophen = HAITI_MEDICATION_FORMULARY_CATALOG.find((r) => r.code === "ACETAMINOPHEN_500")!;
    const gov = buildActivationGovernanceRecord(buildOrderabilityFromHaitiRow(acetaminophen));
    const cert = certifyMedicationActivation(gov);
    expect(["PASS", "FAIL"]).toContain(cert.result);
    if (cert.result === "FAIL") expect(cert.blockers.length).toBeGreaterThan(0);
  });

  it("06 — controlled substances fail activation certification", () => {
    const controlled = governanceRecords().find((r) => r.controlledSubstanceFlag);
    expect(controlled).toBeTruthy();
    const cert = certifyMedicationActivation(controlled!);
    expect(cert.result).toBe("FAIL");
    expect(cert.blockers.some((b) => b.code.includes("CONTROLLED") || b.code.includes("ORDER_SEARCH"))).toBe(true);
  });

  it("07 — vaccines fail activation certification without governance", () => {
    const tdap = governanceRecords().find((r) => r.catalogCode === TDAP_CATALOG_CODE)!;
    const cert = certifyMedicationActivation(tdap);
    expect(cert.result).toBe("FAIL");
    expect(cert.blockers.some((b) => b.code === "VACCINE_GOVERNANCE_REQUIRED")).toBe(true);
  });

  it("08 — high-risk meds are not auto-activated", () => {
    const report = runGovernedActivationFramework();
    const highRiskOrderable = governanceRecords().filter((r) => r.highRiskFlag && r.status === "ORDERABLE");
    expect(highRiskOrderable.length).toBe(0);
    expect(report.governanceReport.orderable).toBeLessThan(report.governanceReport.totalMedications);
  });

  it("09 — restricted meds require documented reason", () => {
    const restricted = governanceRecords().filter((r) => r.status === "RESTRICTED" || r.status === "NEEDS_PHARMACY_REVIEW");
    expect(restricted.length).toBeGreaterThan(0);
    expect(restricted.every((r) => Boolean(r.restrictedReason?.trim() || r.reviewReason?.trim()))).toBe(true);
  });

  it("10 — hospital coverage gap analysis covers all required groups", () => {
    const gaps = runGovernedActivationFramework().hospitalCoverageGap;
    expect(gaps.length).toBe(HOSPITAL_ACTIVATION_COVERAGE_GROUPS.length);
    expect(gaps.some((g) => g.groupId === "pressors")).toBe(true);
    expect(gaps.some((g) => g.groupId === "paralytics")).toBe(true);
    expect(gaps.some((g) => g.groupId === "vaccines")).toBe(true);
  });

  it("11 — hospital gaps use READY/PARTIAL/REVIEW_REQUIRED/MISSING statuses", () => {
    const gaps = buildHospitalCoverageGapReport(governanceRecords());
    const statuses = new Set(gaps.map((g) => g.status));
    expect(statuses.has("READY") || statuses.has("PARTIAL") || statuses.has("REVIEW_REQUIRED")).toBe(true);
  });

  it("12 — missing medications are identified not invented", () => {
    const gaps = runGovernedActivationFramework().hospitalCoverageGap;
    const thrombolytics = gaps.find((g) => g.groupId === "thrombolytics");
    expect(["MISSING", "PARTIAL", "REVIEW_REQUIRED"]).toContain(thrombolytics?.status);
    expect(thrombolytics?.status).not.toBe("READY");
  });

  it("13 — Tdap governance certification runs", () => {
    const tdap = certifyTdapGovernance(governanceRecords().find((r) => r.catalogCode === TDAP_CATALOG_CODE)!);
    expect(tdap.decision).toBe("PASS");
    expect(tdap.checks.some((c) => c.check === "tdap_exists_in_catalog" && c.pass)).toBe(true);
  });

  it("14 — Tdap is not provider auto-orderable", () => {
    const tdap = certifyTdapGovernance(governanceRecords().find((r) => r.catalogCode === TDAP_CATALOG_CODE)!);
    expect(tdap.checks.find((c) => c.check === "provider_not_auto_orderable")?.pass).toBe(true);
  });

  it("15 — Tdap lot expiration manufacturer tracking required", () => {
    const tdap = certifyTdapGovernance(governanceRecords().find((r) => r.catalogCode === TDAP_CATALOG_CODE)!);
    expect(tdap.checks.find((c) => c.check === "lot_tracking_required")?.pass).toBe(true);
    expect(tdap.checks.find((c) => c.check === "expiration_tracking_required")?.pass).toBe(true);
    expect(tdap.checks.find((c) => c.check === "manufacturer_tracking_required")?.pass).toBe(true);
  });

  it("16 — Tdap billing linkage present in wave1 manifest", () => {
    const tdap = certifyTdapGovernance(governanceRecords().find((r) => r.catalogCode === TDAP_CATALOG_CODE)!);
    expect(tdap.checks.find((c) => c.check === "billing_linkage")?.pass).toBe(true);
  });

  it("17 — Tdap manufacturer from centralized catalog", () => {
    const tdap = certifyTdapGovernance(governanceRecords().find((r) => r.catalogCode === TDAP_CATALOG_CODE)!);
    expect(tdap.checks.find((c) => c.check === "manufacturer_from_centralized_catalog")?.pass).toBe(true);
    expect(VACCINE_MANUFACTURER_CATALOG.length).toBeGreaterThanOrEqual(16);
  });

  it("18 — Tdap EN/FR localization without leakage", () => {
    const tdap = certifyTdapGovernance(governanceRecords().find((r) => r.catalogCode === TDAP_CATALOG_CODE)!);
    expect(tdap.checks.find((c) => c.check === "en_localization")?.pass).toBe(true);
    expect(tdap.checks.find((c) => c.check === "fr_localization")?.pass).toBe(true);
    expect(tdap.checks.find((c) => c.check === "no_language_leakage")?.pass).toBe(true);
  });

  it("19 — medication i18n certification passes", () => {
    const i18n = certifyMedicationI18nSafety();
    expect(i18n.decision).toBe("PASS");
    expect(i18n.blockers).toEqual([]);
  });

  it("20 — i18n certification covers MAR narrative and vaccine notes", () => {
    const i18n = certifyMedicationI18nSafety();
    const areas = i18n.areas.map((a) => a.area);
    expect(areas).toContain("mar_narrative_generation");
    expect(areas).toContain("vaccine_notes");
    expect(areas).toContain("vis_documentation");
  });

  it("21 — tdap UI message key manifest defined", () => {
    expect(TDAP_VACCINE_ADMIN_I18N_KEYS.length).toBeGreaterThanOrEqual(10);
    expect(TDAP_VACCINE_ADMIN_I18N_KEYS).toContain("saveToMar");
  });

  it("22 — expansion roadmap defines six tranches", () => {
    const roadmap = runGovernedActivationFramework().expansionRoadmap;
    expect(roadmap.length).toBe(6);
    expect(roadmap.map((t) => t.trancheId)).toContain("TRANCHE_6_CONTROLLED_SUBSTANCES");
  });

  it("23 — expansion roadmap does not include already-orderable meds", () => {
    const records = governanceRecords();
    const roadmap = buildMedicationExpansionRoadmap(records);
    const orderableCount = records.filter((r) => r.status === "ORDERABLE").length;
    const roadmapTotal = roadmap.reduce((s, t) => s + t.medicationCount, 0);
    expect(roadmapTotal).toBe(records.length - orderableCount);
  });

  it("24 — pilot tranche A meds map to activation governance", () => {
    const codes = ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_CATALOG_CODES;
    const records = governanceRecords();
    for (const code of codes) {
      const rec = records.find((r) => r.catalogCode === code);
      expect(rec).toBeTruthy();
    }
  });

  it("25 — billing readiness resolves for Tdap", () => {
    const billing = resolveMedicationBillingReadiness(TDAP_CATALOG_CODE);
    expect(billing.billingReady).toBe(true);
    expect(billing.ndcReady).toBe(true);
    expect(billing.source).toBe("wave1");
  });

  it("26 — engine maturity score is computed", () => {
    const report = runGovernedActivationFramework();
    expect(report.engineMaturityScore).toBeGreaterThan(2);
    expect(report.engineMaturityScore).toBeLessThanOrEqual(5);
  });

  it("27 — activation certification aggregate fails for governed expansion (expected)", () => {
    const cert = runGovernedActivationFramework().activationCertification;
    expect(cert.totalEvaluated).toBeGreaterThan(200);
    expect(cert.failCount).toBeGreaterThan(0);
    expect(cert.aggregateDecision).toBe("FAIL");
  });

  it("28 — some Haiti oral meds pass activation certification", () => {
    const cert = runGovernedActivationFramework().activationCertification;
    const passing = medicationsPassingActivationCertification(cert);
    expect(passing.length).toBeGreaterThan(0);
    expect(passing.some((p) => p.catalogCode === "ACETAMINOPHEN_500")).toBe(true);
  });

  it("29 — failing medications include exact blockers", () => {
    const cert = runGovernedActivationFramework().activationCertification;
    const failing = medicationsFailingActivationCertification(cert);
    expect(failing.length).toBeGreaterThan(100);
    expect(failing.every((f) => f.blockers.length > 0)).toBe(true);
  });

  it("30 — governance report has zero undocumented gaps", () => {
    expect(runGovernedActivationFramework().governanceReport.undocumentedGaps).toBe(0);
  });

  it("31 — inventory byStatus sums to total rows", () => {
    const inv = runGovernedActivationFramework().inventoryReport;
    const sum = Object.values(inv.byStatus).reduce((a, b) => a + b, 0);
    expect(sum).toBe(inv.totalRows);
  });

  it("32 — tranche 6 contains controlled substances only by flag", () => {
    const roadmap = runGovernedActivationFramework().expansionRoadmap;
    const t6 = roadmap.find((t) => t.trancheId === "TRANCHE_6_CONTROLLED_SUBSTANCES")!;
    expect(t6.medicationCount).toBeGreaterThan(0);
    expect(t6.expectedImplementationEffort).toBe("HIGH");
  });
});
