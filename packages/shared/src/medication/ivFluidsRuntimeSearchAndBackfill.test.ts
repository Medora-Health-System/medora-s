import { describe, expect, it } from "vitest";
import { buildEnterpriseMedicationSearchQueryExpansions } from "./enterpriseMedicationSearchExpansion.js";
import {
  buildIvFluidBillingInventoryRuntimeValidationReport,
  buildIvFluidDbBackfillAuditReport,
  buildIvFluidDbBackfillPlanReport,
  buildIvFluidOrderMarRuntimeValidationReport,
  buildIvFluidProviderSearchReproductionReport,
  buildIvFluidRuntimeI18nCertificationReport,
  buildIvFluidRuntimeSearchWiringReport,
  buildIvFluidSearchAliasRemediationReport,
  buildIvFluidsRuntimeBaselineReport,
  matchIvFluidCatalogCodesForQuery,
  runIvFluidsRuntimeSearchAndBackfillReport,
} from "./ivFluidsRuntimeSearchAndBackfill.js";
import { listActiveIvFluidsProviderOrderingCatalogCodes } from "./ivFluidsProviderOrderingActivation.js";

describe("MEDUI.MEDICATION.IV_FLUIDS_RUNTIME_SEARCH_AND_DB_BACKFILL.1", () => {
  it("01 — search NS returns NS 0.9% fluids", () => {
    const matches = matchIvFluidCatalogCodesForQuery("NS");
    expect(matches.some((code) => code.includes("SODIUM_CHLORIDE") || code.includes("NORMAL_SALINE"))).toBe(true);
  });

  it("02 — search normal saline returns NS 0.9%", () => {
    const matches = matchIvFluidCatalogCodesForQuery("normal saline");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((code) => code.includes("SODIUM") || code.includes("NORMAL_SALINE"))).toBe(true);
  });

  it("03 — search D5 returns D5W and D5 combinations", () => {
    const matches = matchIvFluidCatalogCodesForQuery("D5");
    expect(matches.some((code) => code.includes("DEXTROSE"))).toBe(true);
  });

  it("04 — search D5 1/2 NS returns D5 0.45 NS", () => {
    const matches = matchIvFluidCatalogCodesForQuery("D5 1/2 NS");
    expect(matches.some((code) => code.includes("0_45") || code.includes("0.45"))).toBe(true);
  });

  it("05 — search LR returns Lactated Ringer", () => {
    const matches = matchIvFluidCatalogCodesForQuery("LR");
    expect(matches.some((code) => code.includes("RINGER_LACTATE"))).toBe(true);
  });

  it("06 — search plasmalyte returns Plasma-Lyte", () => {
    const matches = matchIvFluidCatalogCodesForQuery("plasmalyte");
    expect(matches).toContain("PLASMALYTE_1000_ML_PERFUSION_INTRAVEINEUSE");
  });

  it("07 — search normosol returns Normosol", () => {
    const matches = matchIvFluidCatalogCodesForQuery("normosol");
    expect(matches).toContain("NORMOSOL_1000_ML_PERFUSION_INTRAVEINEUSE");
  });

  it("08 — DB backfill plan covers activated and alias manifest rows", () => {
    const plan = buildIvFluidDbBackfillPlanReport();
    expect(plan.seedPipeline).toBe("seedEnterpriseIvFluidsCatalog");
    expect(plan.catalogCodesToBackfill.length).toBeGreaterThan(0);
    expect(plan.migrationRequired).toBe(false);
    const audit = buildIvFluidDbBackfillAuditReport();
    expect(audit.rows.every((row) => row.aliasManifestPresent)).toBe(true);
  });

  it("09 — provider order persists immediately", () => {
    const report = buildIvFluidOrderMarRuntimeValidationReport();
    expect(report.orderPersistsImmediately).toBe(true);
  });

  it("10 — MAR schedules immediately", () => {
    const report = buildIvFluidOrderMarRuntimeValidationReport();
    expect(report.appearsOnMarImmediately).toBe(true);
  });

  it("11 — bolus workflow works", () => {
    const report = buildIvFluidOrderMarRuntimeValidationReport();
    expect(report.bolusWorkflowSupported).toBe(true);
  });

  it("12 — continuous workflow works", () => {
    const report = buildIvFluidOrderMarRuntimeValidationReport();
    expect(report.continuousInfusionSupported).toBe(true);
    expect(report.infusionStartStopPreserved).toBe(true);
  });

  it("13 — no duplicate activation rows", () => {
    const report = buildIvFluidRuntimeSearchWiringReport();
    expect(report.duplicateRows).toBe(0);
  });

  it("14 — no catalog-code leakage in display names", () => {
    const report = buildIvFluidRuntimeSearchWiringReport();
    expect(report.catalogCodeLeakage).toBe(false);
  });

  it("15 — billing and inventory certified for activated fluids", () => {
    const report = buildIvFluidBillingInventoryRuntimeValidationReport();
    expect(report.decision).toBe("PASS");
    expect(report.billingReadyCount).toBeGreaterThan(0);
    expect(report.ndcReadyCount).toBeGreaterThan(0);
    expect(report.duplicateNdcConflicts).toBe(0);
  });

  it("16 — EN/FR localization has no leakage", () => {
    const report = buildIvFluidRuntimeI18nCertificationReport();
    expect(report.enLeakageCount).toBe(0);
    expect(report.frLeakageCount).toBe(0);
    expect(report.decision).toBe("PASS");
  });

  it("17 — release gate baseline and final decision", () => {
    const baseline = buildIvFluidsRuntimeBaselineReport();
    expect(baseline.ivFluidsProviderOrderingActive).toBe(true);
    expect(baseline.providerSearchApiPath).toBe("MedicationCatalogService.search");
    expect(listActiveIvFluidsProviderOrderingCatalogCodes().length).toBeGreaterThan(0);

    const alias = buildIvFluidSearchAliasRemediationReport();
    expect(alias.decision).toBe("PASS");

    const reproduction = buildIvFluidProviderSearchReproductionReport();
    expect(reproduction.decision).toBe("PASS");

    const expansions = buildEnterpriseMedicationSearchQueryExpansions();
    expect(expansions.ns).toContain("normal saline");

    const report = runIvFluidsRuntimeSearchAndBackfillReport();
    expect(report.finalDecision).toBe("IV_FLUIDS_VISIBLE_AND_ORDERABLE");
  });
});
