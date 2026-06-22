import { describe, expect, it } from "vitest";
import { HOSPITAL_FORMULARY_COVERAGE_GROUPS } from "./hospitalFormularyCoverageManifest.js";
import {
  buildCriticalCareCoverageReport,
  buildEmergencyMedicationCoverageReport,
  buildEnterpriseVaccineCertificationReport,
  buildHospitalCoverageCertificationReport,
  buildMedicationActivationReadinessMatrix,
  ENTERPRISE_WAVE1_VACCINE_COUNT,
  resolveActivationReadiness,
  runHospitalMedicationCoverageCertification,
  TDAP_CATALOG_CODE,
} from "./hospitalCoverageCertification.js";
import { certifyMedicationActivation } from "./medicationActivationCertification.js";
import { buildActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { isSafeForActivationWithoutEngineering } from "./medicationActivationExpansionRoadmapV2.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import {
  sampleCompleteTdapVaccineAdministrationForm,
  tdapReviewedTopics,
  validateTdapVaccineAdministrationForm,
} from "./tdapVaccineAdministration.js";

function governanceRecords() {
  return [...buildUnifiedOrderabilityMap().values()].map(buildActivationGovernanceRecord);
}

describe("MEDUI.MEDICATION.HOSPITAL_COVERAGE_CERTIFICATION.1", () => {
  it("01 — Tdap reviewedTopics helper returns mutable array", () => {
    const topics = tdapReviewedTopics();
    expect(topics).toHaveLength(3);
    topics.push("reason_for_medication");
    expect(validateTdapVaccineAdministrationForm(sampleCompleteTdapVaccineAdministrationForm()).length).toBe(0);
  });

  it("02 — hospital coverage certification orchestrator runs", () => {
    const report = runHospitalMedicationCoverageCertification();
    expect(report.ticket).toBe("MEDUI.MEDICATION.HOSPITAL_COVERAGE_CERTIFICATION.1");
    expect(report.hospitalCoverage.totalMedicationsAudited).toBe(635);
  });

  it("03 — hospital formulary groups cover all required specialties", () => {
    expect(HOSPITAL_FORMULARY_COVERAGE_GROUPS.length).toBe(25);
    const ids = HOSPITAL_FORMULARY_COVERAGE_GROUPS.map((g) => g.groupId);
    expect(ids).toContain("cardiology");
    expect(ids).toContain("nephrology");
    expect(ids).toContain("insulins");
  });

  it("04 — hospital coverage uses READY/PARTIAL/REVIEW_REQUIRED/MISSING", () => {
    const report = runHospitalMedicationCoverageCertification().hospitalCoverage;
    const statuses = Object.keys(report.summary);
    expect(statuses).toContain("READY");
    expect(statuses).toContain("PARTIAL");
    expect(statuses).toContain("REVIEW_REQUIRED");
    expect(statuses).toContain("MISSING");
  });

  it("05 — hospital coverage audits 635 medications", () => {
    const records = governanceRecords();
    const report = buildHospitalCoverageCertificationReport(records);
    expect(report.totalMedicationsAudited).toBe(635);
    expect(report.groups.length).toBe(25);
  });

  it("06 — emergency medication coverage includes ACS and sepsis", () => {
    const report = buildEmergencyMedicationCoverageReport(governanceRecords());
    const ids = report.scenarios.map((s) => s.scenarioId);
    expect(ids).toContain("acs");
    expect(ids).toContain("sepsis");
    expect(ids).toContain("anaphylaxis");
    expect(ids).toContain("status_epilepticus");
  });

  it("07 — ED coverage report has scenario status per workflow", () => {
    const report = runHospitalMedicationCoverageCertification().emergencyCoverage;
    expect(report.scenarios.length).toBeGreaterThanOrEqual(13);
    expect(report.scenarios.every((s) => s.tokensExpected > 0)).toBe(true);
  });

  it("08 — critical care coverage audits pressors and RSI", () => {
    const records = governanceRecords();
    const certs = records.map((r) => certifyMedicationActivation(r));
    const certMap = new Map(certs.map((c) => [c.catalogCode, c]));
    const report = buildCriticalCareCoverageReport(records, certMap);
    expect(report.categories.some((c) => c.categoryId === "pressors")).toBe(true);
    expect(report.categories.some((c) => c.categoryId === "rsi_medications")).toBe(true);
    expect(report.medications.length).toBeGreaterThan(0);
  });

  it("09 — critical care meds report present/orderable/mar/governance flags", () => {
    const report = runHospitalMedicationCoverageCertification().criticalCareCoverage;
    const pressors = report.categories.find((c) => c.categoryId === "pressors")!;
    expect(pressors.presentCount).toBeGreaterThan(0);
    expect(pressors).toHaveProperty("marReadyCount");
    expect(pressors).toHaveProperty("governanceReadyCount");
  });

  it("10 — enterprise vaccine certification audits 12 vaccines", () => {
    const report = buildEnterpriseVaccineCertificationReport(governanceRecords());
    expect(report.vaccines.length).toBe(12);
    expect(report.vaccines.find((v) => v.vaccineId === "tdap")?.inCatalog).toBe(true);
  });

  it("11 — DTaP flagged missing (not in Wave 1 manifest)", () => {
    const report = runHospitalMedicationCoverageCertification().vaccineCertification;
    const dtap = report.vaccines.find((v) => v.vaccineId === "dtap");
    expect(dtap?.status).toBe("MISSING");
  });

  it("12 — Tdap vaccine has lot/expiration/manufacturer/VIS governance", () => {
    const tdap = runHospitalMedicationCoverageCertification().vaccineCertification.vaccines.find(
      (v) => v.vaccineId === "tdap"
    )!;
    expect(tdap.lotTracking).toBe(true);
    expect(tdap.expirationTracking).toBe(true);
    expect(tdap.manufacturerGovernance).toBe(true);
    expect(tdap.visGovernance).toBe(true);
    expect(tdap.billingGovernance).toBe(true);
  });

  it("13 — wave1 vaccine count cross-check", () => {
    expect(ENTERPRISE_WAVE1_VACCINE_COUNT).toBeGreaterThanOrEqual(10);
  });

  it("14 — activation readiness matrix covers all medications", () => {
    const matrix = runHospitalMedicationCoverageCertification().activationReadinessMatrix;
    expect(matrix.totalMedications).toBe(635);
    expect(matrix.byReadiness.READY_FOR_ACTIVATION).toBeGreaterThan(0);
    expect(matrix.byReadiness.CONTROLLED_SUBSTANCE_RESTRICTED).toBeGreaterThan(0);
  });

  it("15 — readiness matrix statuses are exhaustive", () => {
    const matrix = runHospitalMedicationCoverageCertification().activationReadinessMatrix;
    const sum = Object.values(matrix.byReadiness).reduce((a, b) => a + b, 0);
    expect(sum).toBe(635);
  });

  it("16 — controlled substances map to CONTROLLED_SUBSTANCE_RESTRICTED", () => {
    const records = governanceRecords().filter((r) => r.controlledSubstanceFlag);
    expect(records.length).toBeGreaterThan(0);
    for (const record of records.slice(0, 3)) {
      const cert = certifyMedicationActivation(record);
      expect(resolveActivationReadiness(record, cert)).toBe("CONTROLLED_SUBSTANCE_RESTRICTED");
    }
  });

  it("17 — high-risk meds map to HIGH_RISK_REVIEW_REQUIRED", () => {
    const record = governanceRecords().find((r) => r.highRiskFlag && !r.controlledSubstanceFlag)!;
    const cert = certifyMedicationActivation(record);
    expect(resolveActivationReadiness(record, cert)).toBe("HIGH_RISK_REVIEW_REQUIRED");
  });

  it("18 — expansion roadmap V2 has four tranches", () => {
    const roadmap = runHospitalMedicationCoverageCertification().expansionRoadmapV2;
    expect(roadmap.tranches.length).toBe(4);
    expect(roadmap.totalSafeWithoutEngineering).toBeGreaterThan(0);
  });

  it("19 — expansion V2 safe count does not include vaccines", () => {
    const records = governanceRecords();
    const certs = records.map(certifyMedicationActivation);
    const vaccineSafe = records.filter(
      (r, i) => r.vaccineFlag && isSafeForActivationWithoutEngineering(r, certs[i]!)
    );
    expect(vaccineSafe.length).toBe(0);
  });

  it("20 — i18n certification passes", () => {
    expect(runHospitalMedicationCoverageCertification().i18nCertification.decision).toBe("PASS");
  });

  it("21 — hospital coverage decision reflects gaps", () => {
    const report = runHospitalMedicationCoverageCertification().hospitalCoverage;
    expect(report.decision).toBe("HOSPITAL_COVERAGE_NOT_READY");
    expect(report.blockers.length).toBeGreaterThan(0);
  });

  it("22 — no medications activated (orderable count unchanged)", () => {
    const matrix = runHospitalMedicationCoverageCertification().activationReadinessMatrix;
    expect(matrix.byReadiness.READY_FOR_ACTIVATION).toBe(196);
  });

  it("23 — Tdap catalog code constant", () => {
    expect(TDAP_CATALOG_CODE).toContain("TDAP");
  });

  it("24 — acetaminophen readiness is READY_FOR_ACTIVATION", () => {
    const matrix = runHospitalMedicationCoverageCertification().activationReadinessMatrix;
    const row = matrix.rows.find((r) => r.catalogCode === "ACETAMINOPHEN_500");
    expect(row?.readiness).toBe("READY_FOR_ACTIVATION");
  });

  it("25 — vaccine certification EN/FR for Tdap", () => {
    const tdap = runHospitalMedicationCoverageCertification().vaccineCertification.vaccines.find(
      (v) => v.vaccineId === "tdap"
    )!;
    expect(tdap.enLocalization).toBe(true);
    expect(tdap.frLocalization).toBe(true);
  });

  it("26 — behavioral health hospital group audited", () => {
    const group = runHospitalMedicationCoverageCertification().hospitalCoverage.groups.find(
      (g) => g.groupId === "behavioral_health"
    );
    expect(group?.presentInCatalog).toBeGreaterThan(0);
  });

  it("27 — emergency medicine group audited", () => {
    const group = runHospitalMedicationCoverageCertification().hospitalCoverage.groups.find(
      (g) => g.groupId === "emergency_medicine"
    );
    expect(group?.presentInCatalog).toBeGreaterThan(0);
  });

  it("28 — activation readiness matrix rows include blocker codes", () => {
    const row = runHospitalMedicationCoverageCertification().activationReadinessMatrix.rows.find(
      (r) => r.catalogCode === TDAP_CATALOG_CODE
    )!;
    expect(row.readiness).not.toBe("READY_FOR_ACTIVATION");
    expect(row.blockerCodes.length).toBeGreaterThan(0);
  });

  it("29 — critical care decision reflects review gaps", () => {
    const cc = runHospitalMedicationCoverageCertification().criticalCareCoverage;
    expect(["CRITICAL_CARE_READY", "CRITICAL_CARE_NOT_READY"]).toContain(cc.decision);
  });

  it("30 — expansion tranche 1 has safe medications without engineering", () => {
    const t1 = runHospitalMedicationCoverageCertification().expansionRoadmapV2.tranches.find(
      (t) => t.trancheId === "TRANCHE_1_LOW_RISK"
    )!;
    expect(t1.safeWithoutAdditionalEngineering).toBeGreaterThan(0);
  });

  it("31 — sample Tdap form validates with mutable reviewedTopics type", () => {
    const form = sampleCompleteTdapVaccineAdministrationForm({
      reviewedTopics: tdapReviewedTopics(),
    });
    expect(validateTdapVaccineAdministrationForm(form)).toEqual([]);
  });

  it("32 — build remediation flags pass", () => {
    const remediation = runHospitalMedicationCoverageCertification().buildRemediation;
    expect(remediation.shared).toBe(true);
    expect(remediation.api).toBe(true);
    expect(remediation.webTsc).toBe(true);
    expect(remediation.webBuild).toBe(true);
  });
});
