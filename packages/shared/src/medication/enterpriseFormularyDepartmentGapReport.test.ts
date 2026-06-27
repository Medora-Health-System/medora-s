import { beforeAll, describe, expect, it } from "vitest";
import {
  DEPARTMENT_ESSENTIAL_MEDICATIONS,
  runEnterpriseFormularyDepartmentGapAudit,
} from "./enterpriseFormularyDepartmentGapReport.js";
import { resetEnterpriseFormularyGapAnalysisCaches } from "./enterpriseFormularyGapAnalysis.js";
import { prewarmProviderOrderableCatalogCodesRegistry } from "./providerOrderableCatalogCodesRegistry.js";

describe("MEDUI.MEDS.ENTERPRISE_FORMULARY_GAP_REPORT.1", () => {
  beforeAll(() => {
    resetEnterpriseFormularyGapAnalysisCaches();
    prewarmProviderOrderableCatalogCodesRegistry();
  });

  it("01 — department audit bundle runs without registry wiring errors", () => {
    const bundle = runEnterpriseFormularyDepartmentGapAudit({
      testResults: {
        enterpriseFormularyGapAnalysisTests: "PASS",
        enterpriseFormularyDepartmentGapTests: "PASS",
        notes: [],
      },
    });
    expect(bundle.FinalDecision).toBe("FORMULARY_GAP_REPORT_COMPLETE");
    expect(bundle.EnterpriseFormularyGapAuditReport.totalUnifiedCatalogMedications).toBeGreaterThan(600);
    expect(bundle.DepartmentReadinessMatrix.rows.length).toBeGreaterThan(80);
  });

  it("02 — all ten department essential lists are audited", () => {
    const departments = Object.keys(DEPARTMENT_ESSENTIAL_MEDICATIONS);
    expect(departments).toHaveLength(10);
    const bundle = runEnterpriseFormularyDepartmentGapAudit();
    for (const department of departments) {
      const expected = DEPARTMENT_ESSENTIAL_MEDICATIONS[department as keyof typeof DEPARTMENT_ESSENTIAL_MEDICATIONS].length;
      const audited = bundle.DepartmentReadinessMatrix.rows.filter((row) => row.department === department).length;
      expect(audited).toBe(expected);
    }
  });

  it("03 — potassium PO verification report is present", () => {
    const bundle = runEnterpriseFormularyDepartmentGapAudit();
    expect(bundle.PotassiumPoVerificationReport.rows).toHaveLength(2);
    expect(bundle.PotassiumPoVerificationReport.rows.map((row) => row.medication)).toEqual(
      expect.arrayContaining(["Potassium chloride PO 20 mEq", "Potassium chloride PO 40 mEq"])
    );
  });
});
