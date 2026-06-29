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

  it("allows deselecting recommended items without skip reason", () => {
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
    expect(result.ok).toBe(true);
  });

  it("allows omitting recommended items from selection entirely", () => {
    const applyContext = buildEnterpriseOrderSetApplyContext({
      set: chestPain,
      selectedItemKeys: ["troponin"],
      skippedItems: [],
      appliedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
    });
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
    expect(meta.enterpriseOrderSetAuthority).toBe("PROVIDER_ORDER_SET");
    expect(meta.enterpriseOrderSetStructuredParameterSkippedCount).toBe(1);
    expect(meta.orderId).toBe("ord-1");
  });

  it("accepts valid RN standing order provenance for LAB", () => {
    const rnSet = enterpriseOrderSetByCode("ed_rn_chest_pain_v1")!;
    const applyContext = buildEnterpriseOrderSetApplyContext({
      set: rnSet,
      selectedItemKeys: ["vitalsQ15", "pulseOximetry", "troponin"],
      skippedItems: [],
      appliedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
    });
    expect(applyContext.orderSetAuthority).toBe("RN_STANDING_ORDER");
    const provenance = buildEnterpriseOrderSetProvenance({
      applyContext,
      orderType: "LAB",
      placedItemKeys: ["troponin"],
      verbalOrderAttestation: {
        verbalOrderReceivedFromProviderId: "550e8400-e29b-41d4-a716-446655440001",
        verbalOrderReceivedFromProviderName: "Dr. Example",
        readBackConfirmed: true,
        verbalOrderAttestedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
        verbalOrderAttestedBy: "550e8400-e29b-41d4-a716-446655440002",
        attestedSurface: "CREATE_ORDER_MODAL",
      },
    });
    const result = validateEnterpriseOrderSetApplication({
      provenance,
      itemCount: 1,
      roleCodes: ["RN"],
      canPrescribe: false,
      hasRnStandingOrderAuthority: true,
      currentUserId: "550e8400-e29b-41d4-a716-446655440002",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects RN standing order without verbal-order attestation", () => {
    const rnSet = enterpriseOrderSetByCode("ed_rn_chest_pain_v1")!;
    const applyContext = buildEnterpriseOrderSetApplyContext({
      set: rnSet,
      selectedItemKeys: ["troponin"],
      skippedItems: [],
      appliedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
    });
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
      hasRnStandingOrderAuthority: true,
      currentUserId: "550e8400-e29b-41d4-a716-446655440002",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VERBAL_ORDER_ATTESTATION_REQUIRED");
  });

  it("rejects RN applying provider order set provenance", () => {
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
      hasRnStandingOrderAuthority: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("ORDER_SET_ROLE_DENIED");
  });
});
