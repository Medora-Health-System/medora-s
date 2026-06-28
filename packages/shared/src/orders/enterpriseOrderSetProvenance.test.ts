import { describe, expect, it } from "vitest";
import {
  buildEnterpriseOrderSetApplyContext,
  buildEnterpriseOrderSetProvenance,
  enterpriseOrderSetProvenanceAuditMetadata,
  validateEnterpriseOrderSetApplication,
} from "./enterpriseOrderSetProvenance.js";
import { enterpriseOrderSetByCode } from "./enterpriseOrderSets.js";

describe("enterpriseOrderSetProvenance (MEDUI.ORDERSETS.ENTERPRISE_PHASE_2)", () => {
  const chestPain = enterpriseOrderSetByCode("ed_chest_pain_v1")!;

  function baseApplyContext() {
    return buildEnterpriseOrderSetApplyContext({
      set: chestPain,
      selectedItemKeys: ["ekg12Lead", "troponin", "oxygenTherapy"],
      skippedItems: [{ key: "oxygenTherapy", reason: "structuredParametersRequired" }],
      appliedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
    });
  }

  it("accepts valid provenance for LAB placement", () => {
    const applyContext = baseApplyContext();
    const provenance = buildEnterpriseOrderSetProvenance({
      applyContext,
      orderType: "LAB",
      placedItemKeys: ["troponin"],
    });
    const result = validateEnterpriseOrderSetApplication({
      provenance,
      itemCount: 1,
      roleCodes: ["PROVIDER"],
      canPrescribe: true,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects invalid order set code", () => {
    const applyContext = baseApplyContext();
    const provenance = buildEnterpriseOrderSetProvenance({
      applyContext: { ...applyContext, orderSetCode: "unknown_set_v9" },
      orderType: "LAB",
      placedItemKeys: ["troponin"],
    });
    const result = validateEnterpriseOrderSetApplication({
      provenance,
      itemCount: 1,
      roleCodes: ["PROVIDER"],
      canPrescribe: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("ORDER_SET_NOT_FOUND");
  });

  it("rejects version mismatch", () => {
    const applyContext = baseApplyContext();
    const provenance = buildEnterpriseOrderSetProvenance({
      applyContext: { ...applyContext, orderSetVersion: "9.9.9" },
      orderType: "LAB",
      placedItemKeys: ["troponin"],
    });
    const result = validateEnterpriseOrderSetApplication({
      provenance,
      itemCount: 1,
      roleCodes: ["PROVIDER"],
      canPrescribe: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("ORDER_SET_VERSION_MISMATCH");
  });

  it("rejects unknown selected item key", () => {
    const applyContext = buildEnterpriseOrderSetApplyContext({
      set: chestPain,
      selectedItemKeys: ["not_a_real_key"],
      skippedItems: [],
      appliedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
    });
    const provenance = buildEnterpriseOrderSetProvenance({
      applyContext,
      orderType: "LAB",
      placedItemKeys: ["not_a_real_key"],
    });
    const result = validateEnterpriseOrderSetApplication({
      provenance,
      itemCount: 1,
      roleCodes: ["PROVIDER"],
      canPrescribe: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNKNOWN_SELECTED_ITEM");
  });

  it("rejects required item omission without skip reason", () => {
    const applyContext = buildEnterpriseOrderSetApplyContext({
      set: chestPain,
      selectedItemKeys: ["ekg12Lead", "continuousCardiacMonitoring", "pulseOximetry"],
      skippedItems: [],
      appliedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
    });
    const provenance = buildEnterpriseOrderSetProvenance({
      applyContext,
      orderType: "CARE",
      placedItemKeys: ["pulseOximetry"],
    });
    const result = validateEnterpriseOrderSetApplication({
      provenance,
      itemCount: 1,
      roleCodes: ["PROVIDER"],
      canPrescribe: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("REQUIRED_ITEM_OMITTED");
  });

  it("allows structured-parameter skip for oxygen", () => {
    const applyContext = baseApplyContext();
    const provenance = buildEnterpriseOrderSetProvenance({
      applyContext,
      orderType: "CARE",
      placedItemKeys: ["ekg12Lead"],
    });
    const result = validateEnterpriseOrderSetApplication({
      provenance,
      itemCount: 1,
      roleCodes: ["PROVIDER"],
      canPrescribe: true,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects placing structured-parameter item", () => {
    const applyContext = baseApplyContext();
    const provenance = buildEnterpriseOrderSetProvenance({
      applyContext,
      orderType: "CARE",
      placedItemKeys: ["oxygenTherapy"],
    });
    const result = validateEnterpriseOrderSetApplication({
      provenance,
      itemCount: 1,
      roleCodes: ["PROVIDER"],
      canPrescribe: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("STRUCTURED_PARAMETERS_ITEM_PLACED");
  });

  it("rejects RN role for provider-only order set", () => {
    const applyContext = baseApplyContext();
    const provenance = buildEnterpriseOrderSetProvenance({
      applyContext,
      orderType: "LAB",
      placedItemKeys: ["troponin"],
    });
    const result = validateEnterpriseOrderSetApplication({
      provenance,
      itemCount: 1,
      roleCodes: ["RN"],
      canPrescribe: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("ORDER_SET_ROLE_DENIED");
  });

  it("builds audit metadata with counts", () => {
    const applyContext = baseApplyContext();
    const provenance = buildEnterpriseOrderSetProvenance({
      applyContext,
      orderType: "CARE",
      placedItemKeys: ["ekg12Lead"],
    });
    const meta = enterpriseOrderSetProvenanceAuditMetadata(provenance, { orderId: "ord-1" });
    expect(meta.enterpriseOrderSetCode).toBe("ed_chest_pain_v1");
    expect(meta.enterpriseOrderSetStructuredParameterSkippedCount).toBe(1);
    expect(meta.orderId).toBe("ord-1");
  });
});
