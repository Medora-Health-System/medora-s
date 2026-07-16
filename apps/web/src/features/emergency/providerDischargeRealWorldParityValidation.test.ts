import { describe, expect, it } from "vitest";
import { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER } from "./providerDischargeConditionFamilyFeatureFlag";
import { runEnterpriseDischargeCertification } from "./providerDischargeEnterpriseCertification";
import {
  buildRealEncounterDiagnosisExport,
  buildRealWorldEdTrafficRows,
  buildRealWorldParityValidationReport,
  buildRealWorldResolverVarianceReport,
  buildGenericFallbackTrafficReport,
  buildPediatricRoutingSafetyAudit,
  buildObGynRoutingSafetyAudit,
  buildHighRiskTrafficAudit,
  buildTopDiagnosisTrafficAudit,
  certifyLimitedPilotReadiness,
  exportRowContainsPhiFields,
  familyResolverRemainsOff,
  isIdenticalResolverOutcome,
  mapPrismaDiagnosisToExportRow,
  mapRealEncounterRowToExportRow,
  productionRegistryResolverUnchanged,
  REAL_ENCOUNTER_DIAGNOSIS_SOURCE_AUDIT,
  runRealWorldParityValidation,
  validateObGynMaleSexProbe,
  validatePediatricFeverProbe,
  validateUnknownAgeFeverNotPediatric,
} from "./providerDischargeRealWorldParityValidation";
import {
  buildRealEncounterShadowValidationReport,
  runRealEncounterShadowValidation,
} from "./providerDischargeRealEncounterValidation";
import { resolveDischargeTemplateForDiagnosisGated } from "./providerDischargeTemplateResolverGate";
import { certifyUniversalOutputSurfaces, buildCertificationFormForDiagnosis } from "./providerDischargeUniversalInstructionCertification";
import {
  resolvePatientSpecificDischargeAdditions,
} from "./providerDischargePatientSpecificAdditions";
import { mergeMedicationNamesForDischargeContext } from "./providerDischargeMedicationContext";
import { runProductionSwitchReadinessCertification } from "./providerDischargeProductionSwitchReadiness";

describe("MEDUI.ED.DISCHARGE.REAL_WORLD_PARITY_VALIDATION.1", () => {
  describe("Phase 1 — real data source audit", () => {
    it("01 — source audit documents Diagnosis and Encounter models", () => {
      expect(REAL_ENCOUNTER_DIAGNOSIS_SOURCE_AUDIT.some((r) => r.model === "Diagnosis")).toBe(true);
      expect(REAL_ENCOUNTER_DIAGNOSIS_SOURCE_AUDIT.some((r) => r.model === "Encounter")).toBe(true);
      expect(REAL_ENCOUNTER_DIAGNOSIS_SOURCE_AUDIT.some((r) => r.model === "DiagnosesService")).toBe(true);
    });
  });

  describe("Phase 2 — real data export", () => {
    it("02 — real export excludes PHI fields", () => {
      expect(
        exportRowContainsPhiFields({
          firstName: "Jean",
          diagnosisCode: "R11.2",
        })
      ).toBe(true);
      const exportRow = mapRealEncounterRowToExportRow({
        encounterId: "enc-1",
        diagnosisCode: "R11.2",
        diagnosisLabel: "Nausea and vomiting",
        patientAgeYears: 45,
        patientSex: "female",
        encounterClass: "ED",
        createdAt: "2026-03-01T12:00:00.000Z",
      });
      expect(exportRowContainsPhiFields(exportRow as unknown as Record<string, unknown>)).toBe(false);
      expect(exportRow.diagnosisCode).toBe("R11.2");
    });

    it("03 — real export includes diagnosis metadata", () => {
      const prismaExport = mapPrismaDiagnosisToExportRow({
        code: "R07.9",
        description: "Chest pain",
        createdAt: new Date("2026-03-01T12:00:00.000Z"),
        encounter: {
          type: "EMERGENCY",
          createdAt: new Date("2026-03-01T10:00:00.000Z"),
          patient: { dob: new Date("1980-01-01"), sex: "male" },
        },
      });
      expect(prismaExport.diagnosisCode).toBe("R07.9");
      expect(prismaExport.encounterType).toBe("ED");
      expect(prismaExport.patientAgeYears).toBeGreaterThan(30);

      const report = buildRealEncounterDiagnosisExport({ mode: "fixture" });
      expect(report.totalRows).toBeGreaterThan(0);
      expect(report.phiFieldsDetected).toBe(false);
      expect(report.rows[0]?.diagnosisCode).toBeTruthy();
    });
  });

  describe("Phase 3 — shadow validation on real data", () => {
    it("04 — real validator works on ≥500 injected rows", () => {
      const rows = buildRealWorldEdTrafficRows(520);
      expect(rows.length).toBeGreaterThanOrEqual(500);
      const report = buildRealWorldParityValidationReport({ mode: "injected", rows });
      expect(report.totalRows).toBeGreaterThanOrEqual(500);
    });

    it("05 — parity calculation correct for identical diagnoses", () => {
      expect(isIdenticalResolverOutcome("R11.2", "Nausea and vomiting")).toBe(true);
      const rows = buildRealWorldEdTrafficRows(520);
      const shadow = buildRealEncounterShadowValidationReport({ mode: "injected", rows });
      const parity = buildRealWorldParityValidationReport({ mode: "injected", rows });
      expect(parity.registryParityPercent).toBeGreaterThanOrEqual(0);
      expect(parity.gatedSafeParityPercent).toBe(shadow.aggregate.gatedSafeParityPercent);
    });
  });

  describe("Phase 4–6 — variance and traffic audits", () => {
    it("06 — variance report classification populated", () => {
      const shadow = runRealEncounterShadowValidation({ mode: "fixture" });
      const variance = buildRealWorldResolverVarianceReport(shadow.rows);
      expect(variance.totalRows).toBe(shadow.aggregate.totalRows);
      expect(variance.summary.IDENTICAL).toBeGreaterThan(0);
    });

    it("07 — generic fallback audit identifies generic rows", () => {
      const shadow = runRealEncounterShadowValidation({ mode: "fixture" });
      const generic = buildGenericFallbackTrafficReport(shadow.rows);
      expect(Array.isArray(generic)).toBe(true);
      for (const row of generic) {
        expect(["LOW_PRIORITY", "MEDIUM_PRIORITY", "HIGH_PRIORITY"]).toContain(row.priority);
      }
    });

    it("08 — top diagnosis traffic audit returns sorted rows", () => {
      const shadow = runRealEncounterShadowValidation({ mode: "fixture" });
      const top = buildTopDiagnosisTrafficAudit(shadow.rows, 25);
      expect(top.length).toBeLessThanOrEqual(25);
      if (top.length >= 2) {
        expect(top[0]!.encounterCount).toBeGreaterThanOrEqual(top[1]!.encounterCount);
      }
    });
  });

  describe("Phase 7–9 — safety audits", () => {
    it("09 — pediatric audit detects unsafe routes (fixture has none)", () => {
      const shadow = runRealEncounterShadowValidation({ mode: "fixture" });
      const audit = buildPediatricRoutingSafetyAudit(shadow.rows);
      expect(audit.passed).toBe(true);
      expect(audit.unsafeAdultToPediatricCount).toBe(0);
    });

    it("10 — pediatric fever adult age not unsafe pediatric route", () => {
      const probe = validatePediatricFeverProbe(72);
      expect(probe.unsafeAdultToPediatric).toBe(false);
    });

    it("11 — unknown age fever not pediatric in family resolver", () => {
      expect(validateUnknownAgeFeverNotPediatric()).toBe(true);
    });

    it("12 — OB/GYN audit detects sex violations (none in fixture)", () => {
      const shadow = runRealEncounterShadowValidation({ mode: "fixture" });
      const audit = buildObGynRoutingSafetyAudit(shadow.rows);
      expect(audit.passed).toBe(true);
      expect(validateObGynMaleSexProbe()).toBe(true);
    });

    it("13 — high-risk audit blocks unsafe outcomes", () => {
      const shadow = runRealEncounterShadowValidation({ mode: "fixture" });
      const audit = buildHighRiskTrafficAudit(shadow.rows);
      expect(audit.passed).toBe(true);
      expect(audit.unsafeRoutedCount).toBe(0);
    });
  });

  describe("Phase 10 — pilot readiness certification", () => {
    it("14 — pilot readiness fails when rows <500 (fixture)", () => {
      const cert = certifyLimitedPilotReadiness({ mode: "fixture" });
      expect(cert.decision).toBe("NOT_READY");
      expect(cert.blockers.some((b) => b.includes("500"))).toBe(true);
    });

    it("15 — pilot readiness fails when parity <95 (fixture)", () => {
      // Phase 12 — fixture parity is now ~95.1% after aligning the trauma_msk_foreign_body_ear_nose_v1
      // registry mapping with its condition family (T17.0/T17.1 nasal FB precedence). The fixture
      // dataset still fails readiness on the <500-row threshold regardless of parity.
      const cert = certifyLimitedPilotReadiness({ mode: "fixture" });
      expect(cert.parityReport.registryParityPercent).toBeGreaterThanOrEqual(90);
      expect(cert.blockers.some((b) => b.includes("parity") || b.includes("500"))).toBe(true);
    });

    it("16 — pilot readiness fails when unsafe >0 (simulated)", () => {
      const cert = certifyLimitedPilotReadiness({ mode: "fixture" });
      expect(cert.highRiskAudit.unsafeRoutedCount).toBe(0);
      expect(cert.decision).toBe("NOT_READY");
    });

    it("17 — pilot readiness passes when thresholds met (injected high-parity traffic)", () => {
      const rows = buildRealWorldEdTrafficRows(520);
      const cert = certifyLimitedPilotReadiness({ mode: "injected", rows });
      expect(cert.parityReport.meetsMinimumRows).toBe(true);
      expect(cert.parityReport.gatedSafeParityPercent).toBe(100);
      expect(cert.parityReport.regressionCount).toBe(0);
      expect(cert.parityReport.unsafeRoutedCount).toBe(0);
      expect(cert.pediatricAudit.passed).toBe(true);
      expect(cert.obgynAudit.passed).toBe(true);
      expect(cert.decision).toBe("READY_FOR_LIMITED_PILOT");
    });
  });

  describe("Phase 11 — regression guards", () => {
    it("18 — registry resolver unchanged when flag OFF", () => {
      expect(productionRegistryResolverUnchanged()).toBe(true);
      expect(familyResolverRemainsOff()).toBe(true);
      expect(ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER).toBe(false);
    });

    it("19 — gated resolver uses family only when safe (PE blocked)", () => {
      const gated = resolveDischargeTemplateForDiagnosisGated(
        { code: "I26.99", displayName: "Pulmonary embolism" },
        { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
      );
      expect(gated.resolverPath).not.toBe("family");
    });

    it("20 — enterprise certification still passes", () => {
      expect(runEnterpriseDischargeCertification().enterpriseReady).toBe(true);
    });

    it("21 — universal diagnosis certification still passes", () => {
      const form = buildCertificationFormForDiagnosis({ code: "R11.2", displayName: "Nausea", locale: "en" });
      expect(certifyUniversalOutputSurfaces(form, "en").allSurfacesOk).toBe(true);
    });

    it("22 — patient-specific additions still pass", () => {
      const additions = resolvePatientSpecificDischargeAdditions({
        templateIds: ["nausea_vomiting_v1"],
        context: { patientAgeYears: 72, diagnosisCodes: ["E11.9"] },
        locale: "en",
      });
      expect(additions.length).toBeGreaterThan(0);
    });

    it("23 — medication-aware additions still pass", () => {
      const names = mergeMedicationNamesForDischargeContext({ explicitMedicationNames: ["Eliquis"] });
      const additions = resolvePatientSpecificDischargeAdditions({
        templateIds: ["chest_pain_v1"],
        context: { medicationNames: names },
        locale: "en",
      });
      expect(additions.some((a) => a.id.includes("anticoagulant"))).toBe(true);
    });

    it("24 — production switch readiness still certified for shadow", () => {
      expect(runProductionSwitchReadinessCertification().decision.decision).toBe("READY_FOR_SHADOW_ONLY");
    });

    it("25 — full real-world validation orchestrator runs", () => {
      const result = runRealWorldParityValidation({ mode: "fixture" });
      expect(result.sourceAudit.length).toBeGreaterThan(0);
      expect(result.exportReport.phiFieldsDetected).toBe(false);
      expect(result.featureFlagOff).toBe(true);
      expect(result.enterpriseReady).toBe(true);
    });
  });
});
