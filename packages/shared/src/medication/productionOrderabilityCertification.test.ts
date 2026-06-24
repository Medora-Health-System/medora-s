/**
 * MEDUI.MEDICATION.PRODUCTION_ORDERABILITY_CERTIFICATION.1
 */
import { describe, expect, it, beforeEach } from "vitest";
import { orderCreateDtoSchema } from "../schemas/patient.js";
import {
  buildProductionOrderabilityCertificationReport,
  runProductionOrderabilityReleaseGate,
} from "./productionOrderabilityCertification.js";
import {
  prewarmProviderOrderableCatalogCodesRegistry,
  resetProviderOrderableCatalogCodesRegistryForTests,
  validateProviderOrderPlacementForCatalogCode,
} from "./providerOrderableCatalogCodesRegistry.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import { normalizeMedicationRoute } from "./medicationOrderRoute.js";
import { isExemptFromTranche1PilotOrderGate } from "./pilotMedicationBlockerAudit.js";
import { validateControlledSubstanceMarCreate } from "./controlledSubstanceMarGovernance.js";
import {
  requiresEnterprisePainReassessment,
  resolveEnterprisePainReassessmentMarStatus,
} from "../mar/enterprisePainReassessmentWorkflow.js";
import { resolveControlledSubstanceDirectMarReady } from "./controlledSubstanceOralOpioidMarSupport.js";
import { buildDuplicateMedicationResolutionReport } from "./medicationSearchDuplicateResolution.js";
import { certifyProviderSearchCollisions } from "./providerSearchCanonicalization.js";

describe("MEDUI.MEDICATION.PRODUCTION_ORDERABILITY_CERTIFICATION.1", () => {
  beforeEach(() => {
    resetProviderOrderableCatalogCodesRegistryForTests();
    prewarmProviderOrderableCatalogCodesRegistry();
  });

  it("01 — active registry census nonempty", () => {
    const report = buildProductionOrderabilityCertificationReport();
    expect(report.baseline.activeProviderOrderableCount).toBeGreaterThan(200);
    expect(report.census.length).toBe(report.baseline.activeProviderOrderableCount);
  });

  it("02 — no active code missing catalog metadata in unified map", () => {
    const report = buildProductionOrderabilityCertificationReport();
    expect(report.summary.catalogReady).toBe(report.summary.totalActive);
    expect(report.catalogAudit.every((row) => row.classification === "CATALOG_READY")).toBe(true);
  });

  it("03 — route normalization covers IV/IVP/IVPB/INTRAVEINEUSE/INJECTION", () => {
    expect(normalizeMedicationRoute("IV")).toBe("IVP");
    expect(normalizeMedicationRoute("intraveineuse")).toBe("IVP");
    expect(normalizeMedicationRoute("injection")).toBe("IVP");
    expect(normalizeMedicationRoute({ route: "intraveineuse", administrationType: "INFUSION" })).toBe("IVPB");
    expect(normalizeMedicationRoute("IVP")).toBe("IVP");
  });

  it("04 — enterprise active meds bypass pilot blocker", () => {
    const codes = [
      "GABAPENTIN_300_MG_GELULE_ORALE",
      "MORPHINE_2_MG_ML_INJECTABLE_INTRAVEINEUSE",
      "HYDROMORPHONE_0_5_MG_ML_INJECTABLE_INTRAVEINEUSE",
    ];
    for (const code of codes) {
      expect(isExemptFromTranche1PilotOrderGate(code)).toBe(true);
    }
  });

  it("05 — controlled substances do not require waste/witness at order time", () => {
    const mar = validateControlledSubstanceMarCreate({
      marAction: "administered",
      governance: {
        isControlled: true,
        requiresWitness: true,
        pyxisWasteWitnessExternalized: true,
        medoraWitnessRequired: false,
      },
      administeredByUserId: "nurse-1",
    });
    expect(mar.ok).toBe(true);
  });

  it("06 — pain reassessment is post-admin only", () => {
    expect(requiresEnterprisePainReassessment({ medicationLabel: "Morphine 2 mg/mL" })).toBe(true);
    const order = orderCreateDtoSchema.safeParse({
      type: "MEDICATION",
      prescriberName: "Dr Test",
      items: [{ catalogItemId: "550e8400-e29b-41d4-a716-446655440000", catalogItemType: "MEDICATION", quantity: 1, route: "IV" }],
    });
    expect(order.success).toBe(true);
    expect(
      resolveEnterprisePainReassessmentMarStatus({
        medicationLabel: "Morphine 2 mg/mL",
        marAction: "administered",
        administrationNotes: "administered",
      })
    ).toBe("AWAITING_REASSESSMENT");
  });

  it("07 — representative opioid order payloads pass", () => {
    const report = buildProductionOrderabilityCertificationReport();
    for (const code of [
      "MORPHINE_2_MG_ML_INJECTABLE_INTRAVEINEUSE",
      "MORPHINE_4_MG_ML_INJECTABLE_INTRAVEINEUSE",
      "HYDROMORPHONE_0_5_MG_ML_INJECTABLE_INTRAVEINEUSE",
    ]) {
      const row = report.orderCreateAudit.find((r) => r.catalogCode === code);
      expect(row?.classification).toBe("ORDER_READY");
    }
  });

  it("08 — representative non-opioid pain payloads pass", () => {
    const report = buildProductionOrderabilityCertificationReport();
    for (const code of [
      "GABAPENTIN_300_MG_GELULE_ORALE",
      "CYCLOBENZAPRINE_10_MG_COMPRIME_ORAL",
      "KETOROLAC_30_MG_ML_INJECTABLE_INTRAVEINEUSE",
    ]) {
      const row = report.orderCreateAudit.find((r) => r.catalogCode === code);
      expect(row?.classification).toBe("ORDER_READY");
    }
  });

  it("09 — IV fluids order payloads pass", () => {
    const report = buildProductionOrderabilityCertificationReport();
    for (const code of [
      "SODIUM_CHLORIDE_0_9_1000_ML_PERFUSION_INTRAVEINEUSE",
      "DEXTROSE_5_500_ML_PERFUSION_INTRAVEINEUSE",
    ]) {
      const row = report.orderCreateAudit.find((r) => r.catalogCode === code);
      expect(row?.classification).toBe("ORDER_READY");
    }
  });

  it("10 — direct oral/IV opioid MAR support exists", () => {
    expect(resolveControlledSubstanceDirectMarReady("MORPHINE_2_MG_ML_INJECTABLE_INTRAVEINEUSE").directAdministration).toBe(true);
    expect(resolveControlledSubstanceDirectMarReady("HYDROCODONE_ACETAMINOPHEN_5_325_COMPRIME_ORAL").directAdministration).toBe(true);
  });

  it("11 — duplicate hydromorphone/fentanyl suppression works", () => {
    const active = prewarmProviderOrderableCatalogCodesRegistry();
    const report = buildDuplicateMedicationResolutionReport(active);
    expect(report.suppressedSearchCodes).toContain("HYDROMORPHONE_2MG_ML_INJECTABLE");
    expect(report.suppressedSearchCodes).toContain("FENTANYL_50MCG_ML_INJECTABLE");
  });

  it("12 — billing/inventory readiness for active codes", () => {
    const report = buildProductionOrderabilityCertificationReport();
    expect(report.summary.billingReady).toBe(report.summary.totalActive);
  });

  it("13 — no runtime gate loop regression", () => {
    const active = prewarmProviderOrderableCatalogCodesRegistry();
    expect(active.size).toBeGreaterThan(200);
    for (const code of ["MORPHINE_2_MG_ML_INJECTABLE_INTRAVEINEUSE", "CEFTRIAXONE_1_G_INJECTABLE_INJECTION"]) {
      expect(validateProviderOrderPlacementForCatalogCode(code)).toBeNull();
    }
  });

  it("14 — i18n/catalog-code leakage check", () => {
    const map = buildUnifiedOrderabilityMap();
    const active = prewarmProviderOrderableCatalogCodesRegistry();
    for (const code of active) {
      const record = map.get(code);
      if (!record) continue;
      expect(record.displayNameEn.trim().toUpperCase()).not.toBe(code);
      expect(record.displayNameFr.trim().toUpperCase()).not.toBe(code);
    }
    expect(certifyProviderSearchCollisions().decision).toBe("SAFE");
  });

  it("15 — release gate", () => {
    const gate = runProductionOrderabilityReleaseGate();
    const report = buildProductionOrderabilityCertificationReport();
    expect(gate.pass).toBe(true);
    expect(report.remediation.critical).toHaveLength(0);
    expect(report.summary.orderReady).toBe(report.summary.totalActive);
    expect(gate.finalDecision).not.toBe("PRODUCTION_ORDERABILITY_NOT_READY");
  });
});
