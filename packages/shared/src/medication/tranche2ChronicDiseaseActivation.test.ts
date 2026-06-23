import { describe, expect, it } from "vitest";
import {
  auditMedicationDuplicateActivationRisk,
  buildChronicDiseaseCoverageImpactReport,
  buildProviderSearchSafetyCertificationReport,
  buildTranche2CandidateDiscoveryReport,
  buildTranche2EligibilityCertificationReport,
  buildTranche2I18nCertificationReport,
  buildTranche2MaturityProjectionReport,
  buildTranche2OperationalReadinessReport,
  certifyTranche2ChronicDiseaseEligibility,
  classifyChronicDiseaseDomains,
  classifyDuplicateRiskForCandidate,
  legacyOrderabilityRow,
  normalizedGenericStrengthRouteKey,
  normalizedMedicationKey,
  resetTranche2GovernanceContextCache,
  runTranche2Certification,
  simulateTranche2Activation,
  tdapRemainsRestrictedForTranche2,
} from "./tranche2ChronicDiseaseActivation.js";
import { runTranche1Certification } from "./tranche1GovernedActivation.js";
import { runGovernedActivationFramework } from "./medicationActivationCertification.js";
import { runHospitalMedicationCoverageCertification } from "./hospitalCoverageCertification.js";
import { buildActivationGovernanceRecord, type MedicationActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { certifyMedicationActivation } from "./medicationActivationCertification.js";
import { classifyTrancheV2 } from "./medicationActivationExpansionRoadmapV2.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";

function records() {
  return [...buildUnifiedOrderabilityMap().values()].map(buildActivationGovernanceRecord);
}

function tranche2Records() {
  return records().filter((r) => classifyTrancheV2(r) === "TRANCHE_2_CHRONIC_DISEASE");
}

function syntheticRecord(
  partial: Partial<MedicationActivationGovernanceRecord> & Pick<MedicationActivationGovernanceRecord, "catalogCode">
): MedicationActivationGovernanceRecord {
  return {
    catalogCode: partial.catalogCode,
    displayNameEn: partial.displayNameEn ?? "Test Med",
    displayNameFr: partial.displayNameFr ?? "Médicament test",
    strength: partial.strength ?? "10 mg",
    doseForm: partial.doseForm ?? "comprimé",
    route: partial.route ?? "orale",
    status: partial.status ?? "CATALOG_ONLY",
    restrictedReason: partial.restrictedReason ?? null,
    reviewReason: partial.reviewReason ?? null,
    highRiskFlag: partial.highRiskFlag ?? false,
    controlledSubstanceFlag: partial.controlledSubstanceFlag ?? false,
    vaccineFlag: partial.vaccineFlag ?? false,
    requiresPharmacyReview: partial.requiresPharmacyReview ?? false,
    requiresClinicalReview: partial.requiresClinicalReview ?? false,
    inventoryReady: partial.inventoryReady ?? true,
    billingReady: partial.billingReady ?? true,
    ndcReady: partial.ndcReady ?? true,
    marReady: partial.marReady ?? true,
    orderSearchReady: partial.orderSearchReady ?? false,
    allowedCareSettings: partial.allowedCareSettings ?? ["OUTPATIENT"],
    catalogSource: partial.catalogSource ?? "enterprise",
    enterpriseWave: partial.enterpriseWave ?? "wave1",
  };
}

describe("MEDUI.MEDICATION.EXPANSION_TRANCHE_2_CHRONIC_DISEASE.1", () => {
  it("01 — tranche 2 candidate discovery runs", () => {
    const report = buildTranche2CandidateDiscoveryReport();
    expect(report.totalCandidates).toBeGreaterThan(0);
    expect(report.candidates.length).toBe(report.totalCandidates);
  });

  it("02 — hypertension candidates found", () => {
    const report = buildTranche2CandidateDiscoveryReport();
    expect(report.byDiseaseDomain.HYPERTENSION).toBeGreaterThan(0);
    const hypertension = report.candidates.filter((c) => c.diseaseDomains.includes("HYPERTENSION"));
    expect(hypertension.some((c) => c.displayNameEn.toLowerCase().includes("lisinopril"))).toBe(true);
  });

  it("03 — diabetes non-insulin candidates found", () => {
    const report = buildTranche2CandidateDiscoveryReport();
    expect(report.byDiseaseDomain.TYPE_2_DIABETES_NON_INSULIN).toBeGreaterThan(0);
  });

  it("04 — GERD candidates found", () => {
    const report = buildTranche2CandidateDiscoveryReport();
    expect(report.byDiseaseDomain.GERD).toBeGreaterThan(0);
  });

  it("05 — thyroid candidates found", () => {
    const report = buildTranche2CandidateDiscoveryReport();
    expect(report.byDiseaseDomain.THYROID).toBeGreaterThan(0);
  });

  it("06 — COPD/asthma maintenance domain mapping exists for inhaler rows in catalog", () => {
    const domains = records()
      .filter((r) => r.displayNameEn.toLowerCase().includes("budesonide"))
      .flatMap((r) => classifyChronicDiseaseDomains(r));
    expect(domains.some((d) => d === "COPD_MAINTENANCE" || d === "ASTHMA_MAINTENANCE")).toBe(true);
  });

  it("07 — duplicate audit detects exact duplicate code in synthetic pool", () => {
    const candidate = syntheticRecord({ catalogCode: "SYNTH_DUP_CODE_TEST" });
    const report = auditMedicationDuplicateActivationRisk([candidate, candidate]);
    const dup = report.rows.find((r) => r.catalogCode === "SYNTH_DUP_CODE_TEST");
    expect(dup?.classification).toBe("TRUE_DUPLICATE_BLOCK");
  });

  it("08 — duplicate audit detects generic-strength-route duplicate", () => {
    const glipizide = tranche2Records().find((r) => r.catalogCode === "GLIPIZIDE_5_MG_COMPRIME_ORAL");
    expect(glipizide).toBeDefined();
    const row = classifyDuplicateRiskForCandidate(glipizide!);
    expect(row.classification).toBe("TRUE_DUPLICATE_BLOCK");
    expect(row.relatedCatalogCodes).toContain("GLIPIZIDE_5_MG_COMPRIME_ORALE");
  });

  it("09 — duplicate audit detects Haiti/Enterprise overlap via source both", () => {
    const carvedilol = tranche2Records().find((r) => r.catalogCode === "CARVEDILOL_6.25_MG_COMPRIME_ORAL");
    expect(carvedilol?.catalogSource).toBe("both");
    const legacy = legacyOrderabilityRow("CARVEDILOL_6.25_MG_COMPRIME_ORAL");
    expect(legacy?.source).toBe("both");
    const row = classifyDuplicateRiskForCandidate(carvedilol!);
    expect(row.classification).toBe("ALREADY_ORDERABLE_EQUIVALENT_BLOCK");
    expect(row.blocksActivation).toBe(true);
  });

  it("10 — duplicate audit blocks already-orderable equivalent", () => {
    const amlodipine5 = records().find((r) => r.catalogCode === "AMLODIPINE_5_MG_COMPRIME_ORAL");
    expect(amlodipine5?.status).toBe("ORDERABLE");
    const candidate = syntheticRecord({
      catalogCode: "SYNTH_AMLODIPINE_5_DUP",
      displayNameEn: "Amlodipine",
      displayNameFr: "Amlodipine",
      strength: "5 mg",
      doseForm: "comprimé",
      route: "orale",
      enterpriseWave: "wave1",
    });
    const row = classifyDuplicateRiskForCandidate(candidate);
    expect(["ALREADY_ORDERABLE_EQUIVALENT_BLOCK", "TRUE_DUPLICATE_BLOCK"]).toContain(row.classification);
    expect(row.blocksActivation).toBe(true);
  });

  it("11 — duplicate audit allows different valid strengths", () => {
    const candidate = syntheticRecord({
      catalogCode: "ATENOLOL_SYNTH_25",
      displayNameEn: "Atenolol",
      displayNameFr: "Aténolol",
      strength: "25 mg",
      doseForm: "comprimé",
      route: "orale",
      catalogSource: "enterprise",
    });
    const row = classifyDuplicateRiskForCandidate(candidate);
    expect(row.classification).toBe("VALID_MULTI_STRENGTH_ALLOW");
    expect(row.blocksActivation).toBe(false);
  });

  it("12 — duplicate audit allows different valid routes", () => {
    const candidate = syntheticRecord({
      catalogCode: "ATENOLOL_SYNTH_50_TOPICAL",
      displayNameEn: "Atenolol",
      displayNameFr: "Aténolol",
      strength: "50 mg",
      doseForm: "comprimé",
      route: "topique",
      catalogSource: "enterprise",
    });
    const row = classifyDuplicateRiskForCandidate(candidate);
    expect(row.classification).toBe("VALID_MULTI_ROUTE_ALLOW");
    expect(row.blocksActivation).toBe(false);
  });

  it("13 — duplicate audit flags alias collision review when brand alias overlaps generic", () => {
    const metforminDuplicate = records().find((r) => r.catalogCode === "METFORMIN_500_MG_COMPRIME_ORALE");
    expect(metforminDuplicate).toBeDefined();
    const row = classifyDuplicateRiskForCandidate(metforminDuplicate!);
    expect(["ALIAS_COLLISION_REVIEW", "TRUE_DUPLICATE_BLOCK", "ALREADY_ORDERABLE_EQUIVALENT_BLOCK"]).toContain(
      row.classification
    );
    expect(normalizedMedicationKey(metforminDuplicate!)).toContain("metformin");
  });

  it("14 — eligibility excludes duplicate-blocked candidates", () => {
    const glipizide = tranche2Records().find((r) => r.catalogCode === "GLIPIZIDE_5_MG_COMPRIME_ORAL")!;
    const cert = certifyMedicationActivation(glipizide);
    const blocked = new Set(["GLIPIZIDE_5_MG_COMPRIME_ORAL"]);
    const result = certifyTranche2ChronicDiseaseEligibility(glipizide, cert, blocked);
    expect(result.result).toBe("FAIL");
    expect(result.blockers).toContain("DUPLICATE_ACTIVATION_BLOCKED");
  });

  it("15 — eligibility excludes controlled substances", () => {
    const controlled = records().find((r) => r.controlledSubstanceFlag && classifyTrancheV2(r) === "TRANCHE_2_CHRONIC_DISEASE");
    if (!controlled) {
      const synth = syntheticRecord({ catalogCode: "SYNTH_CS", controlledSubstanceFlag: true });
      const result = certifyTranche2ChronicDiseaseEligibility(synth, certifyMedicationActivation(synth), new Set());
      expect(result.blockers).toContain("CONTROLLED_SUBSTANCE");
      return;
    }
    const result = certifyTranche2ChronicDiseaseEligibility(
      controlled,
      certifyMedicationActivation(controlled),
      new Set()
    );
    expect(result.result).toBe("FAIL");
    expect(result.blockers).toContain("CONTROLLED_SUBSTANCE");
  });

  it("16 — eligibility excludes high-risk meds", () => {
    const warfarin = tranche2Records().find((r) => r.catalogCode === "WARFARIN_5_MG_COMPRIME_ORAL")!;
    const result = certifyTranche2ChronicDiseaseEligibility(
      warfarin,
      certifyMedicationActivation(warfarin),
      new Set()
    );
    expect(result.result).toBe("FAIL");
    expect(result.blockers).toContain("HIGH_ALERT");
  });

  it("17 — eligibility excludes anticoagulants requiring monitoring", () => {
    const apixaban = tranche2Records().find((r) => r.catalogCode === "APIXABAN_5_MG_COMPRIME_ORAL")!;
    const result = certifyTranche2ChronicDiseaseEligibility(
      apixaban,
      certifyMedicationActivation(apixaban),
      new Set()
    );
    expect(result.blockers).toContain("ANTICOAGULANT_MONITORING_REQUIRED");
  });

  it("18 — eligibility excludes insulin infusions", () => {
    const synth = syntheticRecord({
      catalogCode: "SYNTH_INSULIN_DRIP",
      displayNameEn: "Insulin drip",
      route: "intraveineuse",
      doseForm: "perfusion",
    });
    const result = certifyTranche2ChronicDiseaseEligibility(synth, certifyMedicationActivation(synth), new Set());
    expect(result.blockers.some((b) => b.includes("insulin"))).toBe(true);
  });

  it("19 — eligibility excludes vaccines", () => {
    const synth = syntheticRecord({ catalogCode: "SYNTH_VACCINE", vaccineFlag: true });
    const result = certifyTranche2ChronicDiseaseEligibility(synth, certifyMedicationActivation(synth), new Set());
    expect(result.blockers).toContain("VACCINE");
  });

  it("20 — eligibility excludes GLP-1 injection unless certified", () => {
    const synth = syntheticRecord({
      catalogCode: "SYNTH_SEMA_INJ",
      displayNameEn: "Semaglutide",
      route: "subcutanée",
      doseForm: "injectable",
    });
    const result = certifyTranche2ChronicDiseaseEligibility(synth, certifyMedicationActivation(synth), new Set());
    expect(result.blockers).toContain("GLP1_INJECTION_NOT_CERTIFIED");
  });

  it("21 — simulation does not persist", () => {
    const sim = simulateTranche2Activation();
    expect(sim.note).toContain("Simulation only");
    expect(sim.note).toContain("no persistence");
  });

  it("22 — simulation only flips orderSearchEnabled in memory", () => {
    const sim = simulateTranche2Activation();
    expect(sim.rows.every((r) => r.before.orderSearchEnabled === false)).toBe(true);
    expect(sim.rows.every((r) => r.after.orderSearchEnabled === true)).toBe(true);
    const before = buildUnifiedOrderabilityMap().get(sim.rows[0]!.catalogCode);
    expect(before?.orderSearchEnabled).toBe(false);
  });

  it("23 — provider search safety blocks duplicates in simulated cohort", () => {
    const safety = buildProviderSearchSafetyCertificationReport();
    const sim = simulateTranche2Activation();
    const gsrSet = new Set(
      sim.rows.map((r) => {
        const rec = records().find((x) => x.catalogCode === r.catalogCode)!;
        return normalizedGenericStrengthRouteKey(rec);
      })
    );
    expect(gsrSet.size).toBe(sim.rows.length);
    expect(safety.wouldExposeDuplicateEquivalent).toBe(false);
  });

  it("24 — provider search safety blocks high-risk meds", () => {
    const safety = buildProviderSearchSafetyCertificationReport();
    expect(safety.wouldExposeBlockedMed).toBe(false);
    expect(safety.exposedBlockedMeds).toEqual([]);
  });

  it("25 — i18n EN passes for eligible cohort", () => {
    const i18n = buildTranche2I18nCertificationReport();
    expect(i18n.candidateRows.every((r) => r.enNoFrLeakage)).toBe(true);
  });

  it("26 — i18n FR passes for eligible cohort", () => {
    const i18n = buildTranche2I18nCertificationReport();
    expect(i18n.candidateRows.every((r) => r.frNoEnLeakage)).toBe(true);
  });

  it("27 — no English leakage into French display names", () => {
    const i18n = buildTranche2I18nCertificationReport();
    expect(i18n.decision).toBe("PASS");
  });

  it("28 — no French leakage into English display names", () => {
    const i18n = buildTranche2I18nCertificationReport();
    expect(i18n.blockers.filter((b) => b.includes("FR leakage"))).toEqual([]);
  });

  it("29 — billing readiness passes for eligible cohort", () => {
    const ops = buildTranche2OperationalReadinessReport();
    expect(ops.passCount).toBe(simulateTranche2Activation().simulatedCount);
    expect(ops.failCount).toBe(0);
  });

  it("30 — MAR compatibility passes for eligible cohort", () => {
    const ops = buildTranche2OperationalReadinessReport();
    expect(ops.rows.every((r) => r.marReady)).toBe(true);
  });

  it("31 — maturity projection increases or remains stable", () => {
    const simCount = simulateTranche2Activation().simulatedCount;
    const projection = buildTranche2MaturityProjectionReport(simCount);
    expect(projection.baselineAfterTranche1).toBeGreaterThanOrEqual(3.3);
    expect(projection.postTranche2Maturity).toBeGreaterThanOrEqual(projection.baselineAfterTranche1);
    expect(projection.targetMaturity).toBe(4.5);
  });

  it("32 — tranche 1 regression remains passing", () => {
    const tranche1 = runTranche1Certification();
    expect([
      "READY_FOR_GOVERNED_ACTIVATION",
      "READY_FOR_PROVIDER_ORDERING_WITH_PHARMACY_REVIEW_VISIBILITY",
    ]).toContain(tranche1.decision);
  });

  it("33 — tdap governance remains restricted", () => {
    expect(tdapRemainsRestrictedForTranche2()).toBe(true);
  });

  it("34 — hospital coverage certification still runs", () => {
    const hospital = runHospitalMedicationCoverageCertification();
    expect(hospital.ticket).toContain("HOSPITAL_COVERAGE");
    expect(hospital.hospitalCoverage.totalMedicationsAudited).toBeGreaterThan(0);
    expect(hospital.activationReadinessMatrix.totalMedications).toBeGreaterThan(0);
  });

  it("35 — full tranche 2 certification orchestrator runs", () => {
    resetTranche2GovernanceContextCache();
    const report = runTranche2Certification();
    expect(report.ticket).toBe("MEDUI.MEDICATION.EXPANSION_TRANCHE_2_CHRONIC_DISEASE.1");
    expect(report.eligibilityCertification.passCount).toBeGreaterThan(0);
    expect([
      "READY_FOR_GOVERNED_ACTIVATION",
      "READY_FOR_PROVIDER_ORDERING_WITH_PHARMACY_REVIEW_VISIBILITY",
      "NOT_READY",
    ]).toContain(report.decision);
  });

  it("36 — chronic disease coverage impact report includes domains", () => {
    const coverage = buildChronicDiseaseCoverageImpactReport();
    expect(coverage.domains.length).toBeGreaterThan(10);
    const hypertension = coverage.domains.find((d) => d.domain === "HYPERTENSION");
    expect(hypertension?.beforeOrderableCount).toBeGreaterThan(0);
  });

  it("37 — governed activation framework still loads", () => {
    const framework = runGovernedActivationFramework();
    expect(framework.engineMaturityScore).toBeGreaterThan(3);
  });

  it("38 — duplicate-blocked meds excluded from simulation cohort", () => {
    const dup = auditMedicationDuplicateActivationRisk();
    const simCodes = new Set(simulateTranche2Activation().rows.map((r) => r.catalogCode));
    const blockedInSim = dup.rows.filter((r) => r.blocksActivation && simCodes.has(r.catalogCode));
    expect(blockedInSim).toEqual([]);
  });
});
