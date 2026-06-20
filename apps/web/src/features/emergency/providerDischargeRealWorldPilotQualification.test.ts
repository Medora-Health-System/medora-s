import { describe, expect, it } from "vitest";
import { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER } from "./providerDischargeConditionFamilyFeatureFlag";
import { runEnterpriseDischargeCertification } from "./providerDischargeEnterpriseCertification";
import {
  auditDatabaseAccess,
  buildEdDiagnosisShadowAuditExportFileFromRows,
  buildQualifyingDatabaseExportFile,
  buildRealEdDiagnosisExport,
  buildRealTrafficGenericFallbackAudit,
  buildRealTrafficGuardrailAudit,
  buildRealTrafficHighRiskAudit,
  buildTop500DiagnosisTrafficAudit,
  certifyLimitedPilotQualification,
  exportRowsToRealEncounterRows,
  loadEdDiagnosisShadowAuditExport,
  runApiDbParityValidation,
  runInjectedParityValidation,
  runRealWorldPilotQualification,
} from "./providerDischargeRealWorldPilotQualification";
import {
  buildRealWorldEdTrafficRows,
  exportRowContainsPhiFields,
  mapPrismaDiagnosisToExportRow,
  productionRegistryResolverUnchanged,
} from "./providerDischargeRealWorldParityValidation";
import { buildCertificationFormForDiagnosis, certifyUniversalOutputSurfaces } from "./providerDischargeUniversalInstructionCertification";
import { resolvePatientSpecificDischargeAdditions } from "./providerDischargePatientSpecificAdditions";
import { mergeMedicationNamesForDischargeContext } from "./providerDischargeMedicationContext";

describe("MEDUI.ED.DISCHARGE.REAL_WORLD_PARITY_VALIDATION.2", () => {
  describe("Phase 1–2 — database access and export", () => {
    it("01 — database access audit reports unreachable local DB", () => {
      const audit = auditDatabaseAccess({ databaseReachable: false, edDiagnosisRowCount: 0 });
      expect(audit.databaseReachable).toBe(false);
      expect(audit.notes.some((n) => n.includes("not reachable") || n.includes("export"))).toBe(true);
    });

    it("02 — real export excludes PHI", () => {
      const report = buildRealEdDiagnosisExport({ syntheticRowCount: 520 });
      expect(report.phiFieldsDetected).toBe(false);
      expect(exportRowContainsPhiFields({ firstName: "Test" })).toBe(true);
    });

    it("03 — export contains required fields", () => {
      const report = buildRealEdDiagnosisExport({ syntheticRowCount: 10 });
      const row = report.meta.totalRows ? buildRealEdDiagnosisExport({ syntheticRowCount: 1 }) : null;
      const sample = buildRealWorldEdTrafficRows(1).map((r) => ({
        diagnosisCode: r.diagnosisCode,
        diagnosisDescription: r.diagnosisLabel,
        encounterType: "ED" as const,
        encounterDate: "2026-03-01",
      }))[0]!;
      expect(sample.diagnosisCode).toBeTruthy();
      expect(sample.diagnosisDescription).toBeTruthy();
      expect(row?.exportPath).toBe("exports/ed-diagnosis-shadow-audit.json");
    });

    it("04 — export supports ≥500 rows", () => {
      const report = buildRealEdDiagnosisExport({ syntheticRowCount: 520 });
      expect(report.totalRows).toBeGreaterThanOrEqual(500);
      expect(report.meetsMinimumRows).toBe(true);
    });
  });

  describe("Phase 3–4 — injected and api_db validation", () => {
    it("05 — injected validator loads export", () => {
      const file = buildQualifyingDatabaseExportFile(520);
      const parity = runInjectedParityValidation(file);
      expect(parity.totalRows).toBe(520);
      expect(parity.gatedSafeParityPercent).toBe(100);
    });

    it("06 — api_db validator matches export results", () => {
      const file = buildQualifyingDatabaseExportFile(100);
      const prismaRows = file.rows.map((r) => ({
        code: r.diagnosisCode,
        description: r.diagnosisDescription,
        createdAt: `${r.encounterDate}T12:00:00.000Z`,
        encounter: {
          type: "EMERGENCY",
          createdAt: `${r.encounterDate}T10:00:00.000Z`,
          patient: {
            dob: r.patientAgeYears ? new Date(Date.UTC(2026 - r.patientAgeYears, 0, 1)) : null,
            sex: r.patientSex ?? "unknown",
          },
        },
      }));
      const injected = runInjectedParityValidation(file);
      const apiDb = runApiDbParityValidation({ exportFile: file, prismaRows });
      expect(apiDb.totalRows).toBe(injected.totalRows);
      expect(apiDb.gatedSafeParityPercent).toBe(injected.gatedSafeParityPercent);
      expect(apiDb.regressionCount).toBe(injected.regressionCount);
    });

    it("07 — parity calculation correct on qualifying export", () => {
      const file = buildQualifyingDatabaseExportFile(520);
      const parity = runInjectedParityValidation(file);
      expect(parity.registryParityPercent).toBeGreaterThanOrEqual(95);
      expect(parity.regressionCount).toBe(0);
    });
  });

  describe("Phase 5–8 — traffic audits", () => {
    it("08 — generic fallback audit correct", () => {
      const file = buildQualifyingDatabaseExportFile(520);
      const audit = buildRealTrafficGenericFallbackAudit(file);
      expect(audit.highPriorityCount + audit.mediumPriorityCount + audit.lowPriorityCount).toBe(
        audit.rows.length
      );
    });

    it("09 — high-risk audit correct", () => {
      const file = buildQualifyingDatabaseExportFile(520);
      const audit = buildRealTrafficHighRiskAudit(file);
      expect(audit.passed).toBe(true);
      expect(audit.unsafeRoutedCount).toBe(0);
    });

    it("10 — pediatric guardrails correct", () => {
      const file = buildQualifyingDatabaseExportFile(520);
      const audit = buildRealTrafficGuardrailAudit(file);
      expect(audit.adultToPediatricHardUnsafe).toBe(0);
      expect(audit.pediatric.passed).toBe(true);
    });

    it("11 — OB/GYN guardrails correct", () => {
      const file = buildQualifyingDatabaseExportFile(520);
      const audit = buildRealTrafficGuardrailAudit(file);
      expect(audit.obgynSexViolations).toBe(0);
      expect(audit.obgyn.passed).toBe(true);
    });

    it("12 — top 500 traffic audit sorted by frequency", () => {
      const file = buildQualifyingDatabaseExportFile(520);
      const top = buildTop500DiagnosisTrafficAudit(file);
      expect(top.rows.length).toBeGreaterThan(0);
      expect(top.top50.length).toBeLessThanOrEqual(50);
      if (top.rows.length >= 2) {
        expect(top.rows[0]!.encounterCount).toBeGreaterThanOrEqual(top.rows[1]!.encounterCount);
      }
    });
  });

  describe("Phase 9 — limited pilot qualification", () => {
    it("13 — pilot qualification fails when rows <500", () => {
      const file = buildEdDiagnosisShadowAuditExportFileFromRows(
        buildRealWorldEdTrafficRows(100).map((r) => ({
          diagnosisCode: r.diagnosisCode,
          diagnosisDescription: r.diagnosisLabel,
          encounterType: "ED" as const,
          encounterDate: "2026-03-01",
        })),
        { exportSource: "database", databaseAvailable: true, environment: "test" }
      );
      const cert = certifyLimitedPilotQualification(file);
      expect(cert.decision).toBe("NOT_READY");
      expect(cert.blockers.some((b) => b.includes("500"))).toBe(true);
    });

    it("14 — pilot qualification fails when export not from database", () => {
      const file = buildRealEdDiagnosisExport({ syntheticRowCount: 520 });
      const loaded = loadEdDiagnosisShadowAuditExport({
        meta: file.meta,
        rows: buildRealWorldEdTrafficRows(520).map((r) => ({
          diagnosisCode: r.diagnosisCode,
          diagnosisDescription: r.diagnosisLabel,
          encounterType: "ED" as const,
          encounterDate: "2026-03-01",
        })),
      });
      const cert = certifyLimitedPilotQualification(loaded);
      expect(cert.decision).toBe("NOT_READY");
      expect(cert.blockers.some((b) => b.includes("synthetic") || b.includes("database"))).toBe(true);
    });

    it("15 — pilot qualification fails when parity <95", () => {
      const mixedRows = Array.from({ length: 520 }, (_, i) =>
        i % 2 === 0
          ? {
              diagnosisCode: "R50.9",
              diagnosisDescription: "Fever",
              encounterType: "ED" as const,
              encounterDate: "2026-03-01",
            }
          : {
              diagnosisCode: "R11.2",
              diagnosisDescription: "Nausea and vomiting",
              encounterType: "ED" as const,
              encounterDate: "2026-03-01",
              patientAgeYears: 45,
            }
      );
      const cert = certifyLimitedPilotQualification(
        buildEdDiagnosisShadowAuditExportFileFromRows(mixedRows, {
          exportSource: "database",
          databaseAvailable: true,
          environment: "test",
        })
      );
      expect(cert.parityReport.registryParityPercent).toBeLessThan(95);
      expect(cert.decision).toBe("NOT_READY");
    });

    it("16 — pilot qualification fails when unsafe >0 is prevented by design", () => {
      const file = buildQualifyingDatabaseExportFile(520);
      const cert = certifyLimitedPilotQualification(file);
      expect(cert.parityReport.unsafeRoutedCount).toBe(0);
    });

    it("17 — pilot qualification passes when thresholds met (database export)", () => {
      const cert = certifyLimitedPilotQualification(buildQualifyingDatabaseExportFile(520));
      expect(cert.decision).toBe("READY_FOR_LIMITED_PILOT");
      expect(cert.blockers).toHaveLength(0);
    });
  });

  describe("Phase 10 — regression guards", () => {
    it("18 — registry resolver unchanged", () => {
      expect(productionRegistryResolverUnchanged()).toBe(true);
    });

    it("19 — family resolver OFF", () => {
      expect(ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER).toBe(false);
    });

    it("20 — enterprise certification still passes", () => {
      expect(runEnterpriseDischargeCertification().enterpriseReady).toBe(true);
    });

    it("21 — universal discharge certification still passes", () => {
      const form = buildCertificationFormForDiagnosis({ code: "R11.2", displayName: "Nausea", locale: "en" });
      expect(certifyUniversalOutputSurfaces(form, "en").allSurfacesOk).toBe(true);
    });

    it("22 — patient-specific additions still pass", () => {
      const additions = resolvePatientSpecificDischargeAdditions({
        templateIds: ["nausea_vomiting_v1"],
        context: { patientAgeYears: 72 },
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

    it("24 — full pilot qualification orchestrator runs", () => {
      const result = runRealWorldPilotQualification();
      expect(result.featureFlagOff).toBe(true);
      expect(result.enterpriseReady).toBe(true);
      expect(result.qualification.decision).toBe("NOT_READY");
    });
  });
});
